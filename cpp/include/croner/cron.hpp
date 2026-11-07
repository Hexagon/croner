// Croner for C++ - MIT License - Hexagon <github.com/Hexagon>
//
// The Cron class, a port of src/croner.ts and src/options.ts

#ifndef CRONER_CRON_HPP
#define CRONER_CRON_HPP

#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <exception>
#include <functional>
#include <iterator>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <string_view>
#include <thread>
#include <utility>
#include <variant>
#include <vector>

#include "date.hpp"
#include "pattern.hpp"
#include "timezone.hpp"

namespace croner {

using Clock = std::chrono::system_clock;
/// Instants returned by Croner, millisecond precision
using TimePoint = std::chrono::time_point<Clock, std::chrono::milliseconds>;

/// A reference date passed to Croner: an instant, or an ISO 8601 string. Strings without "Z" or
/// a UTC offset are read as wall clock time in the time zone of the job.
class DateRef {
 public:
  template <class Duration>
  DateRef(std::chrono::time_point<Clock, Duration> tp)  // NOLINT(google-explicit-constructor)
      : value_(std::chrono::floor<std::chrono::milliseconds>(tp).time_since_epoch().count()) {}
  DateRef(std::string iso) : value_(std::move(iso)) {}       // NOLINT
  DateRef(const char* iso) : value_(std::string(iso)) {}     // NOLINT
  DateRef(std::string_view iso) : value_(std::string(iso)) {}  // NOLINT

  static DateRef from_unix_ms(Millis ms) { return DateRef(ms, 0); }

  const std::variant<Millis, std::string>& value() const { return value_; }

 private:
  DateRef(Millis ms, int) : value_(ms) {}
  std::variant<Millis, std::string> value_;
};

class Cron;

/// Job function
using Callback = std::function<void(Cron&)>;
/// Called with the exception thrown by the job function
using ErrorHandler = std::function<void(std::exception_ptr, Cron&)>;
/// Called when a run is skipped because the previous run is still in progress
using ProtectHandler = std::function<void(Cron&)>;

/// Options for a job. The JavaScript `context` option is not needed in C++: capture state in the
/// callback instead. `unref` has no equivalent, see Cron::join().
struct Options {
  /// Name of the job. Named jobs are listed by scheduled_jobs(), names are unique.
  std::string name;
  /// Start paused
  bool paused = false;
  /// Maximum number of scheduled runs, unlimited if not set
  std::optional<std::int64_t> max_runs;
  /// Catch exceptions thrown by the job function. If false and on_error is not set, an exception
  /// thrown on the scheduler's worker thread terminates the program, like an unhandled
  /// exception in any std::thread (and like an unhandled rejection in Node.js).
  bool catch_errors = false;
  /// Called with caught exceptions, implies catch_errors
  ErrorHandler on_error;
  /// Minimum interval between runs, in seconds
  std::int64_t interval = 0;
  /// Skip a run if the previous run is still in progress
  bool protect = false;
  /// Called when a run is skipped by protect, implies protect
  ProtectHandler on_protect;
  /// First allowed run, inclusive (except when interval is set)
  std::optional<DateRef> start_at;
  /// Last allowed run, exclusive
  std::optional<DateRef> stop_at;
  /// IANA time zone, e.g. "Europe/Stockholm". Default is the system local time zone.
  std::string timezone;
  /// Fixed UTC offset in minutes, can't be combined with timezone
  std::optional<int> utc_offset;
  /// A custom time zone implementation, can't be combined with timezone or utc_offset
  TimeZonePtr zone;
  /// AND day-of-month and day-of-week (default is OR, like Vixie cron)
  bool dom_and_dow = false;
  /// Shift runs by a number of days
  int day_offset = 0;
  /// Which pattern lengths to accept
  Mode mode = Mode::Auto;
  /// Quartz weekday numbering, 1 = Sunday ... 7 = Saturday
  bool alternative_weekdays = false;
  /// Allow non-standard stepping like "/10" and "5/5"
  bool sloppy_ranges = false;
  /// Let one-off jobs scheduled in the past fire immediately
  bool allow_past = false;
};

namespace detail {
inline std::mutex& registry_mutex() {
  static std::mutex m;
  return m;
}
inline std::vector<Cron*>& registry() {
  static std::vector<Cron*> r;
  return r;
}
inline Millis now_ms() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(
             Clock::now().time_since_epoch())
      .count();
}
inline TimePoint to_time_point(Millis ms) { return TimePoint{std::chrono::milliseconds{ms}}; }
inline std::optional<TimePoint> to_time_point(const std::optional<Millis>& ms) {
  if (!ms) return std::nullopt;
  return to_time_point(*ms);
}
}  // namespace detail

/// Named jobs that have not been stopped
inline std::vector<Cron*> scheduled_jobs() {
  std::lock_guard<std::mutex> lock(detail::registry_mutex());
  return detail::registry();
}

/// ISO 8601 representation in UTC, e.g. "2025-01-01T00:00:00.000Z"
inline std::string to_iso_string(TimePoint tp) {
  return detail::to_iso_string(tp.time_since_epoch().count());
}

class CronIterator;

/// A cron job: evaluates a pattern (or a one-off date), and optionally runs a function on a
/// background thread when it is due.
///
/// Job functions run on a new thread per run, so runs may overlap unless `protect` is set.
/// A Cron object can't be copied or moved, as running jobs refer to it. Destroying it stops the
/// job and waits for running job functions to finish, so it must not be destroyed from inside
/// its own job function.
class Cron {
 public:
  /// A pattern, or an ISO 8601 date string for a one-off job
  explicit Cron(std::string pattern, Options options = {}, Callback fn = {})
      : options_(std::move(options)) {
    init(std::move(pattern), std::nullopt, std::move(fn));
  }

  Cron(std::string pattern, Callback fn) : Cron(std::move(pattern), Options{}, std::move(fn)) {}

  /// A one-off job at an instant
  template <class Duration>
  explicit Cron(std::chrono::time_point<Clock, Duration> once, Options options = {},
                Callback fn = {})
      : options_(std::move(options)) {
    init("", DateRef(once), std::move(fn));
  }

  template <class Duration>
  Cron(std::chrono::time_point<Clock, Duration> once, Callback fn)
      : Cron(once, Options{}, std::move(fn)) {}

  Cron(const Cron&) = delete;
  Cron& operator=(const Cron&) = delete;
  Cron(Cron&&) = delete;
  Cron& operator=(Cron&&) = delete;

  ~Cron() {
    stop();
    join();
  }

  /// Next run, after `prev` (default now)
  std::optional<TimePoint> next_run(const std::optional<DateRef>& prev = std::nullopt) const {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    return detail::to_time_point(next_target(ref_ms(prev), detail::now_ms()));
  }

  /// Next n runs, after `previous` (default the current run, or now)
  std::vector<TimePoint> next_runs(std::size_t n,
                                   const std::optional<DateRef>& previous = std::nullopt) const {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    if (max_runs_ && static_cast<std::int64_t>(n) > *max_runs_) {
      n = *max_runs_ > 0 ? static_cast<std::size_t>(*max_runs_) : 0;
    }
    std::optional<Millis> start = ref_ms(previous);
    if (!start && current_run_) start = current_run_->get_time();
    return enumerate_runs(n, start, 1);
  }

  /// Previous n runs, most recent first, before `reference` (default now)
  std::vector<TimePoint> previous_runs(std::size_t n,
                                       const std::optional<DateRef>& reference = std::nullopt) const {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    return enumerate_runs(n, ref_ms(reference), -1);
  }

  /// Iterate over upcoming runs, after `start_at` (default now)
  CronIterator enumerate(const std::optional<DateRef>& start_at = std::nullopt) const;

  /// Whether a date matches the pattern (or the one-off date), at second precision
  bool match(const DateRef& date) const {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    CronDate check = to_cron_date(date);
    check.ms = 0;
    if (once_) {
      CronDate once = *once_;
      once.ms = 0;
      return check.get_time() == once.get_time();
    }
    return check.match(pattern_, search_);
  }

  /// The pattern, or nullopt for one-off jobs
  std::optional<std::string> get_pattern() const {
    if (once_) return std::nullopt;
    return pattern_.pattern;
  }

  /// The date of a one-off job
  std::optional<TimePoint> get_once() const {
    if (!once_) return std::nullopt;
    return detail::to_time_point(once_->get_time());
  }

  /// Scheduled, not paused or stopped, and has a next run
  bool is_running() const {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    if (paused_ || kill_ || !fn_) return false;
    std::optional<Millis> cur;
    if (current_run_) cur = current_run_->get_time();
    return next_target(cur, detail::now_ms()).has_value();
  }

  bool is_stopped() const {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    return kill_;
  }

  /// A job function is running
  bool is_busy() const {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    return blocking_;
  }

  /// Start of the current (or last started) run
  std::optional<TimePoint> current_run() const {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    if (!current_run_) return std::nullopt;
    return detail::to_time_point(current_run_->get_time());
  }

  /// Start of the last finished run
  std::optional<TimePoint> previous_run() const {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    if (!previous_run_) return std::nullopt;
    return detail::to_time_point(previous_run_->get_time());
  }

  /// Milliseconds until the next run, after `prev` (default now)
  std::optional<std::chrono::milliseconds> ms_to_next(
      const std::optional<DateRef>& prev = std::nullopt) const {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    const Millis now = detail::now_ms();
    const std::optional<Millis> reference = ref_ms(prev);
    const auto next = next_target(reference, now);
    if (!next) return std::nullopt;
    return std::chrono::milliseconds{*next - (reference ? *reference : now)};
  }

  /// Stop the job permanently. A running job function finishes.
  void stop() {
    {
      std::lock_guard<std::recursive_mutex> lock(mtx_);
      kill_ = true;
    }
    cv_.notify_all();
    std::lock_guard<std::mutex> lock(detail::registry_mutex());
    auto& r = detail::registry();
    r.erase(std::remove(r.begin(), r.end(), this), r.end());
  }

  /// Pause the job. Returns false if the job is stopped.
  bool pause() {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    paused_ = true;
    return !kill_;
  }

  /// Resume the job. Returns false if the job is stopped.
  bool resume() {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    paused_ = false;
    return !kill_;
  }

  /// Start running `fn` (or the function given to the constructor) when the job is due
  Cron& schedule(Callback fn = {}) {
    std::unique_lock<std::recursive_mutex> lock(mtx_);
    if (fn && fn_) {
      throw CronError(
          "Cron: It is not allowed to schedule two functions using the same Croner instance.");
    }
    if (fn) fn_ = std::move(fn);
    if (scheduler_active_) return *this;
    const auto plan = compute_schedule(detail::now_ms());
    if (!plan) return *this;
    if (scheduler_.joinable()) scheduler_.join();  // a finished scheduler thread
    scheduler_active_ = true;
    scheduler_ = std::thread([this, plan] { run_scheduler(plan->first, plan->second); });
    return *this;
  }

  /// Run the job function now, on the calling thread. Exceptions propagate unless catch_errors
  /// or on_error is set.
  void trigger() {
    const Millis now = detail::now_ms();
    {
      std::lock_guard<std::recursive_mutex> lock(mtx_);
      begin_run(now);
    }
    run_job(now);
  }

  /// Remaining scheduled runs, nullopt if unlimited
  std::optional<std::int64_t> runs_left() const {
    std::lock_guard<std::recursive_mutex> lock(mtx_);
    return max_runs_;
  }

  const std::string& name() const { return options_.name; }
  const Options& options() const { return options_; }
  const TimeZonePtr& zone() const { return tz_; }

  /// Block until the job has no more runs (or is stopped) and running job functions have
  /// finished. Must not be called from the job function.
  void join() {
    std::thread scheduler;
    {
      std::lock_guard<std::recursive_mutex> lock(mtx_);
      scheduler = std::move(scheduler_);
    }
    if (scheduler.joinable()) {
      if (scheduler.get_id() == std::this_thread::get_id()) {
        scheduler.detach();
      } else {
        scheduler.join();
      }
    }
    std::vector<Worker> workers;
    {
      std::lock_guard<std::mutex> lock(workers_mtx_);
      workers.swap(workers_);
    }
    for (auto& w : workers) {
      if (!w.thread.joinable()) continue;
      if (w.thread.get_id() == std::this_thread::get_id()) {
        w.thread.detach();
      } else {
        w.thread.join();
      }
    }
  }

 private:
  friend class CronIterator;

  struct Worker {
    std::thread thread;
    std::shared_ptr<std::atomic<bool>> done;
  };

  Options options_;
  TimeZonePtr tz_;
  SearchOptions search_;
  CronPattern pattern_{"* * * * *"};
  std::optional<CronDate> once_;
  std::optional<Millis> start_at_;
  std::optional<Millis> stop_at_;
  Millis start_at_rounding_ms_ = 0;

  // State
  bool kill_ = false;
  bool blocking_ = false;
  bool paused_ = false;
  std::optional<CronDate> previous_run_;
  std::optional<CronDate> current_run_;
  std::optional<std::int64_t> max_runs_;
  Callback fn_;

  // Threads
  mutable std::recursive_mutex mtx_;
  std::condition_variable_any cv_;
  std::thread scheduler_;
  bool scheduler_active_ = false;
  std::mutex workers_mtx_;
  std::vector<Worker> workers_;

  static constexpr Millis MAX_DELAY_MS = 30000;

  void init(std::string pattern, std::optional<DateRef> once, Callback fn) {
    Options& o = options_;
    if (o.interval < 0) throw CronError("CronOptions: Supplied value for interval can not be negative");
    if (o.utc_offset) {
      if (*o.utc_offset < -870 || *o.utc_offset > 870) {
        throw CronError("CronOptions: utcOffset out of bounds.");
      }
      if (!o.timezone.empty()) {
        throw CronError("CronOptions: Combining 'utcOffset' with 'timezone' is not allowed.");
      }
    }
    if (o.zone && (!o.timezone.empty() || o.utc_offset)) {
      throw CronError("CronOptions: Combining 'zone' with 'timezone' or 'utcOffset' is not allowed.");
    }
    if (o.on_error) o.catch_errors = true;
    if (o.on_protect) o.protect = true;

    if (o.zone) {
      tz_ = o.zone;
    } else if (!o.timezone.empty()) {
      tz_ = locate_zone(o.timezone);
    } else if (o.utc_offset) {
      tz_ = fixed_offset_zone(*o.utc_offset);
    } else {
      tz_ = local_zone();
    }
    search_.dom_and_dow = o.dom_and_dow;
    search_.interval = o.interval;

    // Runs are on whole seconds, so a time between two seconds counts as the next second
    const auto to_whole_second = [](Millis ms) {
      return detail::floor_mod(ms, 1000) != 0 ? detail::floor_div(ms, 1000) * 1000 + 1000 : ms;
    };
    if (o.start_at) {
      const Millis raw = to_cron_date(*o.start_at).get_time();
      start_at_ = to_whole_second(raw);
      start_at_rounding_ms_ = *start_at_ - raw;
    }
    if (o.stop_at) stop_at_ = to_whole_second(to_cron_date(*o.stop_at).get_time());

    paused_ = o.paused;
    max_runs_ = o.max_runs;

    if (once) {
      once_ = to_cron_date(*once);
    } else if (const auto colon = pattern.find(':'); colon != std::string::npos && colon > 0) {
      once_ = CronDate(std::string_view(pattern), tz_);
    } else {
      PatternOptions po;
      po.mode = o.mode;
      po.alternative_weekdays = o.alternative_weekdays;
      po.sloppy_ranges = o.sloppy_ranges;
      pattern_ = CronPattern(std::move(pattern), po);
    }

    if (!o.name.empty()) {
      std::lock_guard<std::mutex> lock(detail::registry_mutex());
      auto& r = detail::registry();
      for (const Cron* j : r) {
        if (j->name() == o.name) {
          throw CronError("Cron: Tried to initialize new named job '" + o.name +
                          "', but name already taken.");
        }
      }
      r.push_back(this);
    }

    if (fn) {
      try {
        schedule(std::move(fn));
      } catch (...) {
        stop();
        throw;
      }
    }
  }

  CronDate to_cron_date(const DateRef& ref) const {
    if (const auto* ms = std::get_if<Millis>(&ref.value())) return CronDate(*ms, tz_);
    return CronDate(std::string_view(std::get<std::string>(ref.value())), tz_);
  }

  Millis to_ms(const DateRef& ref) const {
    if (const auto* ms = std::get_if<Millis>(&ref.value())) return *ms;
    return to_cron_date(ref).get_time();
  }

  std::optional<Millis> ref_ms(const std::optional<DateRef>& ref) const {
    if (!ref) return std::nullopt;
    return to_ms(*ref);
  }

  Millis offset_ms() const { return static_cast<Millis>(options_.day_offset) * detail::MS_PER_DAY; }

  std::optional<CronDate> shift(const std::optional<Millis>& ms) const {
    if (!ms) return std::nullopt;
    return CronDate(*ms - offset_ms(), tz_);
  }

  std::optional<Millis> next_target(const std::optional<Millis>& reference, Millis now) const {
    const auto next = next_(shift(reference), now - offset_ms(), shift(start_at_), shift(stop_at_));
    if (!next) return std::nullopt;
    return next->get_time() + offset_ms();
  }

  std::optional<Millis> previous_target(const std::optional<Millis>& reference, Millis now) const {
    const auto previous = previous_(*shift(reference ? *reference : now), shift(start_at_),
                                    shift(stop_at_));
    if (!previous) return std::nullopt;
    return previous->get_time() + offset_ms();
  }

  std::vector<TimePoint> enumerate_runs(std::size_t n, std::optional<Millis> current,
                                        int direction) const {
    std::vector<TimePoint> out;
    const Millis now = detail::now_ms();
    while (n-- > 0) {
      const auto run = direction == 1 ? next_target(current, now) : previous_target(current, now);
      if (!run) break;
      out.push_back(detail::to_time_point(*run));
      current = run;
    }
    return out;
  }

  std::optional<CronDate> next_(std::optional<CronDate> previous_run, Millis now,
                                const std::optional<CronDate>& start_at,
                                const std::optional<CronDate>& stop_at) const {
    const bool is_enumerating = previous_run.has_value();
    bool has_previous_run = previous_run.has_value() || current_run_.has_value();

    // If no previous run, and startAt and interval is set, calculate when the last run should
    // have been
    bool start_at_in_future_with_interval = false;
    if (!previous_run && start_at && options_.interval) {
      previous_run = calculate_previous_run(*start_at, now);
      if (previous_run) has_previous_run = true;
      start_at_in_future_with_interval = !previous_run;
    }

    // Search from the exact reference instant
    CronDate prev = previous_run ? *previous_run : CronDate(now, tz_);
    Millis reference_ms = prev.get_time();

    // Previous run should never be before startAt
    if (start_at && reference_ms < start_at->get_time()) {
      prev = start_at_in_future_with_interval ? *start_at
                                              : CronDate(start_at->get_time() - 1000, tz_);
      reference_ms = prev.get_time();
    }

    std::optional<CronDate> next_run;
    if (once_) {
      next_run = once_;
    } else if (start_at_in_future_with_interval) {
      next_run = prev;
    } else {
      next_run = find_occurrence(prev, reference_ms, 1, has_previous_run);
    }

    if (once_) {
      const Millis once_ms = once_->get_time();
      const Millis past_ms = reference_ms - once_ms;
      if ((start_at && once_ms < start_at->get_time() - start_at_rounding_ms_) ||
          (current_run_ && once_ms + offset_ms() <= current_run_->get_time()) ||
          (is_enumerating ? past_ms >= 0 : (past_ms > 1000 && !options_.allow_past))) {
        return std::nullopt;
      }
    }

    if (!next_run || (max_runs_ && *max_runs_ <= 0) || kill_ ||
        (stop_at && next_run->get_time() >= stop_at->get_time())) {
      return std::nullopt;
    }
    return next_run;
  }

  std::optional<CronDate> previous_(const CronDate& reference,
                                    const std::optional<CronDate>& start_at,
                                    const std::optional<CronDate>& stop_at) const {
    Millis reference_ms = reference.get_time();
    if (stop_at && reference_ms > stop_at->get_time()) reference_ms = stop_at->get_time();

    if (once_) {
      if (once_->get_time() < reference_ms) return once_;
      return std::nullopt;
    }

    const auto previous = find_occurrence(CronDate(reference_ms, tz_), reference_ms, -1, false);
    if (!previous || (start_at && previous->get_time() < start_at->get_time())) return std::nullopt;
    return previous;
  }

  /// The run after (direction 1) or before (-1) referenceMs, found by walking the pattern's
  /// wall clock times from start. Searches both passes of a repeated local time when the
  /// reference is on one of them.
  std::optional<CronDate> find_occurrence(const CronDate& start, Millis reference_ms,
                                          int direction, bool has_previous_run) const {
    const auto found = walk(start, reference_ms, direction, has_previous_run, false);
    // A fixed-time job never runs on the later pass, and a fixed UTC offset has no DST
    if ((pattern_.is_fixed_time && direction == 1) || tz_->is_fixed()) return found;
    if (detail::fold_of(reference_ms, *tz_) !=
        (direction == 1 ? detail::Fold::Earlier : detail::Fold::Later)) {
      return found;
    }
    // The other pass starts when the clock goes back, and ends just before it
    const Millis ms = detail::floor_div(reference_ms, 1000) * 1000;
    const Millis edge = direction == 1
                            ? detail::find_offset_change(ms, ms + detail::MS_PER_DAY, *tz_)
                            : detail::find_offset_change(ms - detail::MS_PER_DAY, ms, *tz_) - 1000;
    // A match before the edge beats anything on the other pass
    if (found && (edge - found->get_time()) * direction > 0) return found;
    const auto other = walk(CronDate(edge, tz_), edge - direction, direction, false, true);
    if (!found || !other) return found ? found : other;
    return (found->get_time() - other->get_time()) * direction > 0 ? other : found;
  }

  std::optional<CronDate> walk(const CronDate& start, Millis reference_ms, int direction,
                               bool has_previous_run, bool inclusive) const {
    const auto step = [&](CronDate& d, bool has_previous) {
      return direction == 1 ? d.increment(pattern_, search_, has_previous)
                            : d.decrement(pattern_, search_);
    };
    CronDate candidate = start;
    bool ok = true;
    if (!inclusive || !candidate.match(pattern_, search_)) ok = step(candidate, has_previous_run);
    while (ok) {
      if (const auto run_at = run_at_(candidate, reference_ms, direction)) {
        return CronDate(*run_at, tz_);
      }
      ok = step(candidate, false);
    }
    return std::nullopt;
  }

  /// When a candidate wall clock time runs, if it is ahead of the reference
  std::optional<Millis> run_at_(const CronDate& candidate, Millis reference_ms,
                                int direction) const {
    const auto is_ahead = [&](Millis d) { return (d - reference_ms) * direction > 0; };
    if (tz_->is_fixed()) {
      const Millis d = candidate.get_time();
      if (is_ahead(d)) return d;
      return std::nullopt;
    }
    detail::DateTime local;
    local.year = candidate.year;
    local.month = candidate.month + 1;
    local.day = candidate.day;
    local.hour = candidate.hour;
    local.minute = candidate.minute;
    local.second = candidate.second;
    const auto r = detail::resolve_local(local, *tz_);
    const bool fixed_time = pattern_.is_fixed_time;
    if (r.kind == detail::LocalResolution::Single) {
      if (is_ahead(r.a)) return r.a;
      return std::nullopt;
    }
    if (r.kind == detail::LocalResolution::Ambiguous) {
      if (fixed_time) {
        if (is_ahead(r.a)) return r.a;
        return std::nullopt;
      }
      const Millis first = direction == 1 ? r.a : r.b;
      const Millis second = direction == 1 ? r.b : r.a;
      if (is_ahead(first)) return first;
      if (is_ahead(second)) return second;
      return std::nullopt;
    }
    // In a DST gap: fixed-time jobs run when the gap ends, on the same day
    if (!fixed_time) return std::nullopt;
    const Millis gap_end = detail::find_offset_change(r.a, r.b, *tz_);
    const detail::DateTime gl = detail::to_tz(gap_end, *tz_);
    const bool same_day = gl.year == local.year && gl.month == local.month && gl.day == local.day;
    if (same_day && is_ahead(gap_end)) return gap_end;
    return std::nullopt;
  }

  std::optional<CronDate> calculate_previous_run(const CronDate& start_at, Millis now) const {
    if (start_at.get_time() > now) return std::nullopt;
    const Millis interval_ms = options_.interval * 1000;
    CronDate previous = start_at;
    while (previous.get_time() + interval_ms <= now) {
      CronDate next = previous;
      if (!next.increment(pattern_, search_, true)) break;
      previous = next;
    }
    return previous;
  }

  /// When to check next, and the target time: (target, wait ms)
  std::optional<std::pair<Millis, Millis>> compute_schedule(Millis current_time) const {
    const auto next = next_target(std::nullopt, current_time);
    if (!next) return std::nullopt;
    Millis wait = *next - current_time;
    // If the clock has stepped backward (currentRun > now), use the current time instead
    std::optional<Millis> previous;
    if (current_run_) previous = current_run_->get_time();
    if (previous && *previous > current_time) previous.reset();
    const auto target = next_target(previous, current_time);
    if (!target) return std::nullopt;
    if (wait > MAX_DELAY_MS) wait = MAX_DELAY_MS;
    if (wait < 0) wait = paused_ ? 1000 : 0;
    return std::make_pair(*target, wait);
  }

  void run_scheduler(Millis target, Millis wait_ms) {
    std::unique_lock<std::recursive_mutex> lock(mtx_);
    for (;;) {
      const auto deadline = Clock::now() + std::chrono::milliseconds(wait_ms);
      cv_.wait_until(lock, deadline, [this] { return kill_; });
      if (kill_) break;

      const Millis now = detail::now_ms();
      const bool should_run = !paused_ && now >= target;
      const bool is_blocked = blocking_ && options_.protect;
      if (should_run && !is_blocked) {
        if (max_runs_) --*max_runs_;
        begin_run(now);
        spawn_worker(now);
      } else if (should_run && is_blocked && options_.on_protect) {
        const ProtectHandler handler = options_.on_protect;
        lock.unlock();
        try {
          handler(*this);
        } catch (...) {
        }
        lock.lock();
        if (kill_) break;
      }

      const auto plan = compute_schedule(should_run ? detail::now_ms() : now);
      if (!plan) break;
      target = plan->first;
      wait_ms = plan->second;
    }
    scheduler_active_ = false;
  }

  void begin_run(Millis now) {
    blocking_ = true;
    current_run_ = CronDate(now, tz_);
  }

  void spawn_worker(Millis now) {
    std::lock_guard<std::mutex> lock(workers_mtx_);
    // Reap finished workers
    for (auto it = workers_.begin(); it != workers_.end();) {
      if (it->done->load()) {
        it->thread.join();
        it = workers_.erase(it);
      } else {
        ++it;
      }
    }
    auto done = std::make_shared<std::atomic<bool>>(false);
    workers_.push_back(Worker{std::thread([this, now, done] {
                                run_job(now);
                                done->store(true);
                              }),
                              done});
  }

  void run_job(Millis initiation) {
    Callback fn;
    bool catch_errors;
    ErrorHandler on_error;
    {
      std::lock_guard<std::recursive_mutex> lock(mtx_);
      fn = fn_;
      catch_errors = options_.catch_errors;
      on_error = options_.on_error;
    }
    struct Finish {
      Cron* self;
      Millis initiation;
      ~Finish() {
        std::lock_guard<std::recursive_mutex> lock(self->mtx_);
        self->previous_run_ = CronDate(initiation, self->tz_);
        self->blocking_ = false;
      }
    } finish{this, initiation};

    if (catch_errors) {
      try {
        if (fn) fn(*this);
      } catch (...) {
        if (on_error) {
          try {
            on_error(std::current_exception(), *this);
          } catch (...) {
            // Errors from the error handler are ignored
          }
        }
      }
    } else if (fn) {
      fn(*this);
    }
  }
};

/// Iterates over upcoming runs. Usable with range-for:
///
///     for (auto run : job.enumerate()) { ... }
///
/// Patterns without an end date are infinite, so break out of the loop.
class CronIterator {
 public:
  CronIterator(const Cron& cron, const std::optional<DateRef>& start_at) : cron_(&cron) {
    initial_max_runs_ = cron.runs_left();
    reset(start_at);
  }

  /// The next run, nullopt when done
  std::optional<TimePoint> next() {
    if (done_ || (remaining_ && *remaining_ <= 0)) {
      done_ = true;
      return std::nullopt;
    }
    std::optional<Millis> next_date;
    {
      std::lock_guard<std::recursive_mutex> lock(cron_->mtx_);
      next_date = cron_->next_target(cursor_, now_);
    }
    if (!next_date) {
      done_ = true;
      return std::nullopt;
    }
    cursor_ = next_date;
    if (remaining_) --*remaining_;
    return detail::to_time_point(*next_date);
  }

  /// The next run without advancing
  std::optional<TimePoint> peek() const {
    if (done_ || (remaining_ && *remaining_ <= 0)) return std::nullopt;
    std::lock_guard<std::recursive_mutex> lock(cron_->mtx_);
    return detail::to_time_point(cron_->next_target(cursor_, now_));
  }

  /// Restart from a new start date (default now)
  void reset(const std::optional<DateRef>& start_at = std::nullopt) {
    {
      std::lock_guard<std::recursive_mutex> lock(cron_->mtx_);
      cursor_ = cron_->ref_ms(start_at);
    }
    now_ = detail::now_ms();
    done_ = false;
    remaining_ = initial_max_runs_;
  }

  class iterator {
   public:
    using iterator_category = std::input_iterator_tag;
    using value_type = TimePoint;
    using difference_type = std::ptrdiff_t;
    using pointer = const TimePoint*;
    using reference = const TimePoint&;

    iterator() = default;
    explicit iterator(CronIterator* it) : it_(it) { advance(); }
    reference operator*() const { return *value_; }
    pointer operator->() const { return &*value_; }
    iterator& operator++() {
      advance();
      return *this;
    }
    void operator++(int) { advance(); }
    friend bool operator==(const iterator& a, const iterator& b) {
      return a.value_.has_value() == b.value_.has_value() && (!a.value_ || a.it_ == b.it_);
    }
    friend bool operator!=(const iterator& a, const iterator& b) { return !(a == b); }

   private:
    void advance() { value_ = it_ ? it_->next() : std::nullopt; }
    CronIterator* it_ = nullptr;
    std::optional<TimePoint> value_;
  };

  iterator begin() { return iterator(this); }
  iterator end() { return iterator(); }

 private:
  const Cron* cron_;
  std::optional<Millis> cursor_;
  Millis now_ = 0;
  bool done_ = false;
  std::optional<std::int64_t> initial_max_runs_;
  std::optional<std::int64_t> remaining_;
};

inline CronIterator Cron::enumerate(const std::optional<DateRef>& start_at) const {
  return CronIterator(*this, start_at);
}

}  // namespace croner

#endif  // CRONER_CRON_HPP
