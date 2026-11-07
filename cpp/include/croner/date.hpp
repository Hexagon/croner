// Croner for C++ - MIT License - Hexagon <github.com/Hexagon>
//
// CronDate, a port of src/date.ts. Holds a wall clock time in a time zone, and steps it to the
// next or previous time matching a pattern.

#ifndef CRONER_DATE_HPP
#define CRONER_DATE_HPP

#include <array>
#include <cstdint>
#include <cstdlib>
#include <optional>
#include <string_view>

#include "pattern.hpp"
#include "timezone.hpp"

namespace croner {

/// Options used when searching for matches
struct SearchOptions {
  /// AND day-of-month and day-of-week instead of OR
  bool dom_and_dow = false;
  /// Minimum interval between runs, in seconds
  std::int64_t interval = 0;
};

class CronDate {
 public:
  TimeZonePtr tz;
  int year = 1970;
  int month = 0;  // 0-11
  int day = 1;    // 1-31
  int hour = 0;
  int minute = 0;
  int second = 0;
  int ms = 0;

  /// From an instant
  CronDate(Millis instant, TimeZonePtr zone) : tz(std::move(zone)) { from_millis(instant); }

  /// From an ISO 8601 string. A string with Z or a UTC offset is an exact instant, otherwise it
  /// is a wall clock time in the zone.
  CronDate(std::string_view iso, TimeZonePtr zone) : tz(std::move(zone)) { from_string(iso); }

  /// The instant, with milliseconds. Keeps the occurrence of a repeated local time (DST fall
  /// back) this date was created from, unless the fields have changed since.
  Millis get_time() const {
    if (const auto cached = cached_instant()) return *cached + ms;
    detail::DateTime t;
    t.year = year;
    t.month = month + 1;
    t.day = day;
    t.hour = hour;
    t.minute = minute;
    t.second = second;
    return detail::from_tz(t, *tz) + ms;
  }

  /// Step to the next time matching the pattern. Returns false if there is none.
  bool increment(const CronPattern& pattern, const SearchOptions& options, bool has_previous_run) {
    instant_.reset();
    // Move to next second, or a full interval after the previous run
    second += (options.interval > 1 && has_previous_run) ? static_cast<int>(options.interval) : 1;
    ms = 0;
    apply();
    return recurse(pattern, options, 0, 1);
  }

  /// Step to the previous time matching the pattern. Returns false if there is none.
  bool decrement(const CronPattern& pattern, const SearchOptions& options) {
    instant_.reset();
    second -= options.interval > 1 ? static_cast<int>(options.interval) : 1;
    ms = 0;
    apply();
    return recurse(pattern, options, 0, -1);
  }

  /// Whether the current wall clock time matches the pattern
  bool match(const CronPattern& pattern, const SearchOptions& options) const {
    if (!pattern.star_year) {
      if (year < 0 || year >= static_cast<int>(pattern.year.size()) || pattern.year[static_cast<std::size_t>(year)] == 0)
        return false;
    }
    for (int doing = 0; doing < 5; ++doing) {
      const Target target = step_at(doing).target;
      const int offset = step_at(doing).offset;
      const int value = get(target);
      const auto arr = values(pattern, target);
      if (value + offset < 0 || value + offset >= arr.second) return false;
      bool m = arr.first[value + offset] != 0;
      if (target == Target::Day) m = match_day_value(m, value, pattern, options);
      if (!m) return false;
    }
    return true;
  }

 private:
  enum class Target { Year, Month, Day, Hour, Minute, Second };
  struct Step {
    Target target;
    Target parent;
    int offset;
  };
  static constexpr std::array<Step, 5> STEPS = {{
      {Target::Month, Target::Year, 0},
      {Target::Day, Target::Month, -1},
      {Target::Hour, Target::Day, 0},
      {Target::Minute, Target::Hour, 0},
      {Target::Second, Target::Minute, 0},
  }};

  static const Step& step_at(int i) { return STEPS[static_cast<std::size_t>(i)]; }

  // Cached instant (whole seconds), valid while the fields it was created from are unchanged
  std::optional<Millis> instant_;
  std::array<int, 6> instant_fields_{};
  const TimeZone* instant_tz_ = nullptr;

  int& ref(Target t) {
    switch (t) {
      case Target::Year: return year;
      case Target::Month: return month;
      case Target::Day: return day;
      case Target::Hour: return hour;
      case Target::Minute: return minute;
      case Target::Second: return second;
    }
    return second;
  }
  int get(Target t) const { return const_cast<CronDate*>(this)->ref(t); }

  static std::pair<const std::uint8_t*, int> values(const CronPattern& p, Target t) {
    switch (t) {
      case Target::Month: return {p.month.data(), 12};
      case Target::Day: return {p.day.data(), 31};
      case Target::Hour: return {p.hour.data(), 24};
      case Target::Minute: return {p.minute.data(), 60};
      case Target::Second: return {p.second.data(), 60};
      case Target::Year: return {p.year.data(), static_cast<int>(p.year.size())};
    }
    return {nullptr, 0};
  }

  void from_millis(Millis instant) {
    const detail::DateTime t = detail::from_millis(instant + detail::offset_ms(instant, *tz));
    year = static_cast<int>(t.year);
    month = static_cast<int>(t.month) - 1;
    day = static_cast<int>(t.day);
    hour = static_cast<int>(t.hour);
    minute = static_cast<int>(t.minute);
    second = static_cast<int>(t.second);
    ms = static_cast<int>(t.ms);
    instant_ = instant - ms;
    instant_fields_ = {year, month, day, hour, minute, second};
    instant_tz_ = tz.get();
  }

  void from_string(std::string_view s) {
    const detail::IsoDateTime iso = detail::parse_iso(s);
    if (iso.offset_seconds) {
      from_millis(detail::to_millis(iso.local) - static_cast<Millis>(*iso.offset_seconds) * 1000);
    } else {
      detail::DateTime local = iso.local;
      local.ms = 0;
      from_millis(detail::from_tz(local, *tz) + iso.local.ms);
    }
  }

  std::optional<Millis> cached_instant() const {
    if (!instant_ || instant_tz_ != tz.get()) return std::nullopt;
    const std::array<int, 6> now = {year, month, day, hour, minute, second};
    if (now != instant_fields_) return std::nullopt;
    return instant_;
  }

  static int last_day_of_month(int y, int m0) { return detail::days_in_month(y, m0 + 1); }

  static int weekday(int y, int m0, int d) {
    return detail::weekday_from_days(detail::days_from_civil(y, m0 + 1, d));
  }

  static int last_weekday_of_month(int y, int m0) {
    const int last = last_day_of_month(y, m0);
    const int wd = weekday(y, m0, last);
    if (wd == 0) return last - 2;
    if (wd == 6) return last - 1;
    return last;
  }

  static int nearest_weekday(int y, int m0, int d) {
    const int dim = last_day_of_month(y, m0);
    if (d > dim) return -1;
    const int wd = weekday(y, m0, d);
    if (wd == 0) return d == dim ? d - 2 : d + 1;
    if (wd == 6) return d == 1 ? d + 2 : d - 1;
    return d;
  }

  static bool is_nth_weekday_of_month(int y, int m0, int d, int nth) {
    // Occurrences of this weekday up to and including the day
    const int count = (d - 1) / 7 + 1;
    if ((nth & ANY_OCCURRENCE) && count <= 5 && (OCCURRENCE_BITMASKS[count - 1] & nth))
      return true;
    if (nth & LAST_OCCURRENCE) return d + 7 > last_day_of_month(y, m0);
    return false;
  }

  /// Normalize fields that are (or could be) out of range. Returns true if anything was done.
  bool apply() {
    if (month > 11 || month < 0 || day > last_day_of_month(year, month) || day < 1 ||
        hour > 23 || minute > 59 || second > 59 || hour < 0 || minute < 0 || second < 0) {
      detail::DateTime t;
      t.year = year;
      t.month = static_cast<std::int64_t>(month) + 1;
      t.day = day;
      t.hour = hour;
      t.minute = minute;
      t.second = second;
      t.ms = ms;
      const detail::DateTime n = detail::from_millis(detail::to_millis(t));
      year = static_cast<int>(n.year);
      month = static_cast<int>(n.month) - 1;
      day = static_cast<int>(n.day);
      hour = static_cast<int>(n.hour);
      minute = static_cast<int>(n.minute);
      second = static_cast<int>(n.second);
      ms = static_cast<int>(n.ms);
      return true;
    }
    return false;
  }

  /// Day-of-month special cases (W, LW, L) and the day-of-week combination
  bool match_day_value(bool initial, int day_value, const CronPattern& pattern,
                       const SearchOptions& options) const {
    bool m = initial;

    if (!m) {
      for (int d = 0; d < 31; ++d) {
        if (pattern.nearest_weekdays[static_cast<std::size_t>(d)]) {
          const int exec = nearest_weekday(year, month, d + 1);
          if (exec != -1 && exec == day_value) {
            m = true;
            break;
          }
        }
      }
    }

    if (pattern.last_weekday && day_value == last_weekday_of_month(year, month)) m = true;
    if (pattern.last_day_of_month && day_value == last_day_of_month(year, month)) m = true;

    if (!pattern.star_dow) {
      const int first_wd = weekday(year, month, 1);
      const int dow_value = pattern.day_of_week[static_cast<std::size_t>((first_wd + (day_value - 1)) % 7)];
      bool dow = dow_value != 0;
      if (dow && (dow_value & ANY_OCCURRENCE)) {
        dow = is_nth_weekday_of_month(year, month, day_value, dow_value);
      }
      if (pattern.use_and_logic) {
        m = m && dow;
      } else if (!options.dom_and_dow && !pattern.star_dom) {
        m = m || dow;
      } else {
        m = m && dow;
      }
    }
    return m;
  }

  /// Find the next (direction 1) or previous (-1) match of one part.
  /// 1 = current value matches, 2 = value changed, 3 = no match
  int find_match(const SearchOptions& options, Target target, const CronPattern& pattern,
                 int offset, int direction) {
    const int original = get(target);
    const auto arr = values(pattern, target);
    for (int i = original + offset; direction == 1 ? i < arr.second : i >= 0; i += direction) {
      bool m = arr.first[i] != 0;
      if (target == Target::Day) m = match_day_value(m, i - offset, pattern, options);
      if (m) {
        ref(target) = i - offset;
        return original != ref(target) ? 2 : 1;
      }
    }
    return 3;
  }

  int max_pattern_value(Target target, const CronPattern& pattern, int offset) const {
    const auto arr = values(pattern, target);
    int max_value = arr.second - 1 - offset;
    for (int i = arr.second - 1; i >= 0; --i) {
      if (arr.first[i]) {
        max_value = i - offset;
        break;
      }
    }
    if (target == Target::Day) {
      const int last = last_day_of_month(year, month);
      return pattern.last_day_of_month || !pattern.star_dow ? last : (std::min)(max_value, last);
    }
    return max_value;
  }

  bool recurse(const CronPattern& pattern, const SearchOptions& options, int doing,
               int direction) {
    // Without a year field, the pattern repeats with the calendar every 400 years
    const int start_year = year;
    for (;;) {
      if (pattern.star_year && std::abs(year - start_year) > 400) return false;
      const int next = direction == 1 ? step_forward(pattern, options, doing)
                                      : step_backward(pattern, options, doing);
      if (next == DONE) return true;
      if (next == FAILED) return false;
      doing = next < 0 ? 0 : next;
    }
  }

  static constexpr int DONE = 100;
  static constexpr int FAILED = -100;

  int step_forward(const CronPattern& pattern, const SearchOptions& options, int doing) {
    if (doing == 0 && !pattern.star_year) {
      if (year >= 0 && year < static_cast<int>(pattern.year.size()) && pattern.year[static_cast<std::size_t>(year)] == 0) {
        int found = -1;
        for (int y = year + 1; y < static_cast<int>(pattern.year.size()) && y < 10000; ++y) {
          if (pattern.year[static_cast<std::size_t>(y)] == 1) {
            found = y;
            break;
          }
        }
        if (found == -1) return FAILED;
        year = found;
        month = 0;
        day = 1;
        hour = 0;
        minute = 0;
        second = 0;
        ms = 0;
      }
      if (year >= 10000) return FAILED;
    }

    const int res = find_match(options, step_at(doing).target, pattern, step_at(doing).offset, 1);

    if (res > 1) {
      for (int reset = doing + 1; reset < 5; ++reset) {
        ref(step_at(reset).target) = -step_at(reset).offset;
      }
      if (res == 3) {
        ref(step_at(doing).parent)++;
        ref(step_at(doing).target) = -step_at(doing).offset;
        apply();
        if (doing == 0 && !pattern.star_year) {
          while (year >= 0 && year < static_cast<int>(pattern.year.size()) &&
                 pattern.year[static_cast<std::size_t>(year)] == 0 && year < 10000) {
            year++;
          }
          if (year >= 10000 || year >= static_cast<int>(pattern.year.size())) return FAILED;
        }
        return 0;
      } else if (apply()) {
        return doing - 1;
      }
    }

    doing += 1;
    if (doing >= 5) return DONE;
    if (pattern.star_year ? year >= 3000 : year >= 10000) return FAILED;
    return doing;
  }

  int step_backward(const CronPattern& pattern, const SearchOptions& options, int doing) {
    if (doing == 0 && !pattern.star_year) {
      if (year >= 0 && year < static_cast<int>(pattern.year.size()) && pattern.year[static_cast<std::size_t>(year)] == 0) {
        int found = -1;
        for (int y = year - 1; y >= 0; --y) {
          if (pattern.year[static_cast<std::size_t>(y)] == 1) {
            found = y;
            break;
          }
        }
        if (found == -1) return FAILED;
        year = found;
        month = 11;
        day = 31;
        hour = 23;
        minute = 59;
        second = 59;
        ms = 0;
      }
      if (year < 0) return FAILED;
    }

    const int res = find_match(options, step_at(doing).target, pattern, step_at(doing).offset, -1);

    if (res > 1) {
      for (int reset = doing + 1; reset < 5; ++reset) {
        ref(step_at(reset).target) =
            max_pattern_value(step_at(reset).target, pattern, step_at(reset).offset);
      }

      if (res == 3) {
        ref(step_at(doing).parent)--;

        if (doing == 0) {
          const int last = last_day_of_month(year, month);
          if (day > last) day = last;
        }

        if (doing == 1) {
          if (day <= 0) {
            day = 1;
          } else {
            int temp_year = year;
            int temp_month = month;
            while (temp_month < 0) {
              temp_month += 12;
              temp_year--;
            }
            while (temp_month > 11) {
              temp_month -= 12;
              temp_year++;
            }
            const int last = last_day_of_month(temp_year, temp_month);
            if (day > last) day = last;
          }
        }

        apply();
        ref(step_at(doing).target) =
            max_pattern_value(step_at(doing).target, pattern, step_at(doing).offset);
        apply();

        if (doing == 0) {
          const int new_day = max_pattern_value(Target::Day, pattern, step_at(1).offset);
          if (new_day != day) {
            day = new_day;
            hour = max_pattern_value(Target::Hour, pattern, step_at(2).offset);
            minute = max_pattern_value(Target::Minute, pattern, step_at(3).offset);
            second = max_pattern_value(Target::Second, pattern, step_at(4).offset);
          }
        }

        if (doing == 0 && !pattern.star_year) {
          while (year >= 0 && year < static_cast<int>(pattern.year.size()) &&
                 pattern.year[static_cast<std::size_t>(year)] == 0) {
            year--;
          }
          if (year < 0) return FAILED;
        }
        return 0;
      } else if (apply()) {
        return doing - 1;
      }
    }

    doing += 1;
    if (doing >= 5) return DONE;
    if (year < 0) return FAILED;
    return doing;
  }
};

}  // namespace croner

#endif  // CRONER_DATE_HPP
