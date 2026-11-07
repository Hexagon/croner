// Croner for C++ - MIT License - Hexagon <github.com/Hexagon>
//
// Calendar arithmetic and time zone support.
//
// Time zones are modelled by a single question: "what is the UTC offset at this instant?".
// Everything else (converting local time to instants, DST gaps and overlaps) is derived from
// that, exactly like the JavaScript version derives it from Intl.DateTimeFormat.
//
// Backends:
//  - Fixed offsets (UTC, utc_offset option)
//  - System local time (localtime_r / localtime_s)
//  - IANA zones, read from the system zoneinfo database (TZif files, RFC 8536), including the
//    POSIX TZ rule in the file footer for instants after the last listed transition.
//  - IANA zones through C++20 std::chrono::tzdb, when CRONER_USE_STD_CHRONO_TZDB is defined
//    to 1 (default on Windows, which has no zoneinfo directory).
//  - Any user supplied implementation of croner::TimeZone.

#ifndef CRONER_TIMEZONE_HPP
#define CRONER_TIMEZONE_HPP

#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <ctime>
#include <fstream>
#include <iterator>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

#ifndef CRONER_USE_STD_CHRONO_TZDB
#if defined(_WIN32) && (defined(_MSVC_LANG) && _MSVC_LANG >= 202002L)
#define CRONER_USE_STD_CHRONO_TZDB 1
#else
#define CRONER_USE_STD_CHRONO_TZDB 0
#endif
#endif

namespace croner {

/// Milliseconds since the Unix epoch (UTC).
using Millis = std::int64_t;

/// Error thrown for invalid patterns, options, dates or time zones.
class CronError : public std::runtime_error {
 public:
  using std::runtime_error::runtime_error;
};

namespace detail {

constexpr Millis MS_PER_SECOND = 1000;
constexpr Millis MS_PER_DAY = 86400000;

constexpr std::int64_t floor_div(std::int64_t a, std::int64_t b) {
  std::int64_t q = a / b;
  if ((a % b != 0) && ((a < 0) != (b < 0))) --q;
  return q;
}

constexpr std::int64_t floor_mod(std::int64_t a, std::int64_t b) { return a - floor_div(a, b) * b; }

// Days since 1970-01-01 for a proleptic Gregorian date (month 1-12).
// http://howardhinnant.github.io/date_algorithms.html
constexpr std::int64_t days_from_civil(std::int64_t y, int m, int d) {
  y -= m <= 2;
  const std::int64_t era = (y >= 0 ? y : y - 399) / 400;
  const std::int64_t yoe = y - era * 400;
  const std::int64_t doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  const std::int64_t doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097 + doe - 719468;
}

struct CivilDate {
  std::int64_t year;
  int month;  // 1-12
  int day;    // 1-31
};

constexpr CivilDate civil_from_days(std::int64_t z) {
  z += 719468;
  const std::int64_t era = (z >= 0 ? z : z - 146096) / 146097;
  const std::int64_t doe = z - era * 146097;
  const std::int64_t yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
  const std::int64_t y = yoe + era * 400;
  const std::int64_t doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
  const std::int64_t mp = (5 * doy + 2) / 153;
  const int d = static_cast<int>(doy - (153 * mp + 2) / 5 + 1);
  const int m = static_cast<int>(mp < 10 ? mp + 3 : mp - 9);
  return CivilDate{y + (m <= 2), m, d};
}

/// Day of week, 0 = Sunday.
constexpr int weekday_from_days(std::int64_t z) { return static_cast<int>(floor_mod(z + 4, 7)); }

constexpr bool is_leap_year(std::int64_t y) { return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0; }

/// Days in month (month 1-12)
constexpr int days_in_month(std::int64_t y, int m) {
  constexpr int dim[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
  return (m == 2 && is_leap_year(y)) ? 29 : dim[m - 1];
}

/// Broken down time. Month is 1-12. Values may be out of range when passed to to_millis(),
/// they overflow into the next unit like Date.UTC() does in JavaScript.
struct DateTime {
  std::int64_t year = 1970;
  std::int64_t month = 1;
  std::int64_t day = 1;
  std::int64_t hour = 0;
  std::int64_t minute = 0;
  std::int64_t second = 0;
  std::int64_t ms = 0;

  bool same_wall_time(const DateTime& o) const {
    return year == o.year && month == o.month && day == o.day && hour == o.hour &&
           minute == o.minute && second == o.second;
  }
};

/// Fields read as UTC, to milliseconds. Handles overflowing fields.
constexpr Millis to_millis(const DateTime& t) {
  const std::int64_t m0 = t.month - 1;
  const std::int64_t y = t.year + floor_div(m0, 12);
  const int m = static_cast<int>(floor_mod(m0, 12)) + 1;
  const std::int64_t days = days_from_civil(y, m, 1) + (t.day - 1);
  return days * MS_PER_DAY + t.hour * 3600000 + t.minute * 60000 + t.second * 1000 + t.ms;
}

/// Milliseconds to UTC fields.
constexpr DateTime from_millis(Millis ms) {
  const std::int64_t days = floor_div(ms, MS_PER_DAY);
  const std::int64_t rem = ms - days * MS_PER_DAY;
  const CivilDate c = civil_from_days(days);
  DateTime t;
  t.year = c.year;
  t.month = c.month;
  t.day = c.day;
  t.hour = rem / 3600000;
  t.minute = (rem / 60000) % 60;
  t.second = (rem / 1000) % 60;
  t.ms = rem % 1000;
  return t;
}

}  // namespace detail

/// A time zone, answering what the UTC offset is at an instant.
class TimeZone {
 public:
  virtual ~TimeZone() = default;

  /// UTC offset in seconds (local time minus UTC) at an instant given in seconds since the epoch.
  virtual std::int32_t utc_offset(std::int64_t unix_seconds) const = 0;

  /// Name of the zone, e.g. "Europe/Stockholm", "UTC+01:00" or "local".
  virtual std::string name() const = 0;

  /// True if the offset never changes, which lets the scheduler skip DST handling.
  virtual bool is_fixed() const { return false; }
};

using TimeZonePtr = std::shared_ptr<const TimeZone>;

namespace detail {

class FixedOffsetZone final : public TimeZone {
 public:
  explicit FixedOffsetZone(std::int32_t offset_seconds) : offset_(offset_seconds) {}
  std::int32_t utc_offset(std::int64_t) const override { return offset_; }
  bool is_fixed() const override { return true; }
  std::string name() const override {
    if (offset_ == 0) return "UTC";
    const std::int32_t a = offset_ < 0 ? -offset_ : offset_;
    char buf[32];
    std::snprintf(buf, sizeof(buf), "UTC%c%02d:%02d", offset_ < 0 ? '-' : '+', a / 3600,
                  (a / 60) % 60);
    return buf;
  }

 private:
  std::int32_t offset_;
};

class LocalZone final : public TimeZone {
 public:
  std::int32_t utc_offset(std::int64_t unix_seconds) const override {
    const std::time_t t = static_cast<std::time_t>(unix_seconds);
    std::tm tm{};
#if defined(_WIN32)
    if (localtime_s(&tm, &t) != 0) return 0;
    return static_cast<std::int32_t>(_mkgmtime64(&tm) - static_cast<__time64_t>(t));
#else
    if (localtime_r(&t, &tm) == nullptr) return 0;
    return static_cast<std::int32_t>(tm.tm_gmtoff);
#endif
  }
  std::string name() const override { return "local"; }
};

// ---------------------------------------------------------------------------------------------
// POSIX TZ rules, e.g. "CET-1CEST,M3.5.0,M10.5.0/3" (used in the footer of TZif files)
// ---------------------------------------------------------------------------------------------

struct PosixDateRule {
  char kind = 'M';  // 'J' (Julian, 1-365 without Feb 29), 'N' (zero based, 0-365), 'M'
  int month = 0, week = 0, weekday = 0, day = 0;
  std::int32_t time = 7200;  // seconds after local midnight, may be negative or > 24h
};

struct PosixRule {
  std::int32_t std_offset = 0;  // seconds east of UTC
  std::int32_t dst_offset = 0;
  bool has_dst = false;
  PosixDateRule start, end;

  // Day (days since epoch) a rule refers to in a year
  static std::int64_t rule_day(const PosixDateRule& r, std::int64_t year) {
    const std::int64_t jan1 = days_from_civil(year, 1, 1);
    switch (r.kind) {
      case 'J': {
        std::int64_t d = jan1 + r.day - 1;
        if (is_leap_year(year) && r.day >= 60) ++d;
        return d;
      }
      case 'N':
        return jan1 + r.day;
      default: {
        const std::int64_t first = days_from_civil(year, r.month, 1);
        const int wd = weekday_from_days(first);
        std::int64_t d = first + (r.weekday - wd + 7) % 7 + (r.week - 1) * 7;
        const std::int64_t end = first + days_in_month(year, r.month);
        while (d >= end) d -= 7;
        return d;
      }
    }
  }

  std::int32_t offset_at(std::int64_t t) const {
    if (!has_dst) return std_offset;
    const std::int64_t year = civil_from_days(floor_div(t + std_offset, 86400)).year;
    const std::int64_t s = rule_day(start, year) * 86400 + start.time - std_offset;
    const std::int64_t e = rule_day(end, year) * 86400 + end.time - dst_offset;
    bool dst;
    if (s < e) {
      dst = t >= s && t < e;
    } else {
      dst = !(t >= e && t < s);
    }
    return dst ? dst_offset : std_offset;
  }
};

class PosixParser {
 public:
  explicit PosixParser(std::string_view s) : s_(s) {}

  std::optional<PosixRule> parse() {
    PosixRule r;
    if (!name()) return std::nullopt;
    std::int32_t off;
    if (!offset(off)) return std::nullopt;
    r.std_offset = -off;
    if (at_end()) return r;
    r.has_dst = true;
    if (!name()) return std::nullopt;
    r.dst_offset = r.std_offset + 3600;
    if (!at_end() && peek() != ',') {
      if (!offset(off)) return std::nullopt;
      r.dst_offset = -off;
    }
    if (at_end()) {
      // No rule, use the US rules like glibc does
      r.start = PosixDateRule{'M', 3, 2, 0, 0, 7200};
      r.end = PosixDateRule{'M', 11, 1, 0, 0, 7200};
      return r;
    }
    if (peek() != ',') return std::nullopt;
    ++i_;
    if (!date_rule(r.start)) return std::nullopt;
    if (at_end() || peek() != ',') return std::nullopt;
    ++i_;
    if (!date_rule(r.end)) return std::nullopt;
    if (!at_end()) return std::nullopt;
    return r;
  }

 private:
  std::string_view s_;
  std::size_t i_ = 0;

  bool at_end() const { return i_ >= s_.size(); }
  char peek() const { return s_[i_]; }

  bool name() {
    if (at_end()) return false;
    if (peek() == '<') {
      const std::size_t close = s_.find('>', i_);
      if (close == std::string_view::npos) return false;
      i_ = close + 1;
      return true;
    }
    const std::size_t start = i_;
    while (!at_end() && std::isalpha(static_cast<unsigned char>(peek()))) ++i_;
    return i_ - start >= 3;
  }

  bool number(int& out) {
    const std::size_t start = i_;
    int v = 0;
    while (!at_end() && std::isdigit(static_cast<unsigned char>(peek()))) {
      v = v * 10 + (peek() - '0');
      if (v > 100000) return false;
      ++i_;
    }
    out = v;
    return i_ > start;
  }

  // [+-]hh[:mm[:ss]], returned as seconds
  bool offset(std::int32_t& out) {
    int sign = 1;
    if (!at_end() && (peek() == '+' || peek() == '-')) {
      if (peek() == '-') sign = -1;
      ++i_;
    }
    int h = 0, m = 0, s = 0;
    if (!number(h)) return false;
    if (!at_end() && peek() == ':') {
      ++i_;
      if (!number(m)) return false;
      if (!at_end() && peek() == ':') {
        ++i_;
        if (!number(s)) return false;
      }
    }
    out = sign * (h * 3600 + m * 60 + s);
    return true;
  }

  bool date_rule(PosixDateRule& r) {
    if (at_end()) return false;
    if (peek() == 'M') {
      ++i_;
      r.kind = 'M';
      if (!number(r.month) || at_end() || peek() != '.') return false;
      ++i_;
      if (!number(r.week) || at_end() || peek() != '.') return false;
      ++i_;
      if (!number(r.weekday)) return false;
      if (r.month < 1 || r.month > 12 || r.week < 1 || r.week > 5 || r.weekday > 6) return false;
    } else if (peek() == 'J') {
      ++i_;
      r.kind = 'J';
      if (!number(r.day) || r.day < 1 || r.day > 365) return false;
    } else {
      r.kind = 'N';
      if (!number(r.day) || r.day > 365) return false;
    }
    r.time = 7200;
    if (!at_end() && peek() == '/') {
      ++i_;
      if (!offset(r.time)) return false;
    }
    return true;
  }
};

// ---------------------------------------------------------------------------------------------
// TZif files (RFC 8536)
// ---------------------------------------------------------------------------------------------

class TzifZone final : public TimeZone {
 public:
  TzifZone(std::string name, const std::string& data) : name_(std::move(name)) {
    if (!parse(data)) throw CronError("Invalid time zone file for '" + name_ + "'");
  }

  std::int32_t utc_offset(std::int64_t t) const override {
    if (transitions_.empty()) {
      if (footer_) return footer_->offset_at(t);
      return types_.empty() ? 0 : types_[0];
    }
    if (t < transitions_.front()) return types_[0];
    const auto it = std::upper_bound(transitions_.begin(), transitions_.end(), t);
    const std::size_t idx = static_cast<std::size_t>(it - transitions_.begin()) - 1;
    if (idx + 1 == transitions_.size() && footer_) return footer_->offset_at(t);
    return types_[indices_[idx]];
  }

  std::string name() const override { return name_; }

 private:
  std::string name_;
  std::vector<std::int64_t> transitions_;
  std::vector<std::uint8_t> indices_;
  std::vector<std::int32_t> types_;
  std::optional<PosixRule> footer_;

  static std::int64_t be(const std::string& d, std::size_t pos, int bytes) {
    std::uint64_t v = 0;
    for (int i = 0; i < bytes; ++i)
      v = (v << 8) | static_cast<unsigned char>(d[pos + static_cast<std::size_t>(i)]);
    if (bytes == 4) return static_cast<std::int32_t>(static_cast<std::uint32_t>(v));
    return static_cast<std::int64_t>(v);
  }

  bool parse(const std::string& d) {
    if (d.size() < 44 || d.compare(0, 4, "TZif") != 0) return false;
    const char version = d[4];
    std::size_t pos = 0;
    int time_size = 4;
    if (version >= '2') {
      // Skip the v1 block
      if (!block_size(d, 0, 4, pos)) return false;
      time_size = 8;
    }
    return read_block(d, pos, time_size, version >= '2');
  }

  static bool counts(const std::string& d, std::size_t pos, std::int64_t c[6]) {
    if (d.size() < pos + 44 || d.compare(pos, 4, "TZif") != 0) return false;
    for (std::size_t i = 0; i < 6; ++i) c[i] = be(d, pos + 20 + i * 4, 4);
    for (int i = 0; i < 6; ++i)
      if (c[i] < 0) return false;
    return true;
  }

  static bool block_size(const std::string& d, std::size_t pos, int ts, std::size_t& next) {
    std::int64_t c[6];  // isutcnt, isstdcnt, leapcnt, timecnt, typecnt, charcnt
    if (!counts(d, pos, c)) return false;
    const std::int64_t size =
        c[3] * ts + c[3] + c[4] * 6 + c[5] + c[2] * (ts + 4) + c[1] + c[0];
    next = pos + 44 + static_cast<std::size_t>(size);
    return next <= d.size();
  }

  bool read_block(const std::string& d, std::size_t pos, int ts, bool footer) {
    std::int64_t c[6];
    if (!counts(d, pos, c)) return false;
    std::size_t end;
    if (!block_size(d, pos, ts, end)) return false;
    const std::int64_t timecnt = c[3], typecnt = c[4];
    if (typecnt == 0) return false;
    std::size_t p = pos + 44;
    transitions_.resize(static_cast<std::size_t>(timecnt));
    for (std::size_t i = 0; i < transitions_.size(); ++i, p += static_cast<std::size_t>(ts))
      transitions_[i] = be(d, p, ts);
    indices_.resize(static_cast<std::size_t>(timecnt));
    for (std::size_t i = 0; i < indices_.size(); ++i, ++p) {
      indices_[i] = static_cast<std::uint8_t>(d[p]);
      if (indices_[i] >= typecnt) return false;
    }
    types_.resize(static_cast<std::size_t>(typecnt));
    for (std::size_t i = 0; i < types_.size(); ++i, p += 6)
      types_[i] = static_cast<std::int32_t>(be(d, p, 4));
    if (footer && end < d.size() && d[end] == '\n') {
      const std::size_t close = d.find('\n', end + 1);
      if (close != std::string::npos && close > end + 1) {
        footer_ = PosixParser(std::string_view(d).substr(end + 1, close - end - 1)).parse();
      }
    }
    return true;
  }
};

#if CRONER_USE_STD_CHRONO_TZDB
class StdChronoZone final : public TimeZone {
 public:
  explicit StdChronoZone(const std::chrono::time_zone* z) : zone_(z) {}
  std::int32_t utc_offset(std::int64_t t) const override {
    const auto info = zone_->get_info(std::chrono::sys_seconds{std::chrono::seconds{t}});
    return static_cast<std::int32_t>(info.offset.count());
  }
  std::string name() const override { return std::string(zone_->name()); }

 private:
  const std::chrono::time_zone* zone_;
};
#endif

#if !CRONER_USE_STD_CHRONO_TZDB
inline bool valid_zone_name(std::string_view name) {
  if (name.empty() || name.front() == '/' || name.find("..") != std::string_view::npos)
    return false;
  for (char c : name) {
    if (!(std::isalnum(static_cast<unsigned char>(c)) || c == '/' || c == '_' || c == '-' ||
          c == '+'))
      return false;
  }
  return true;
}

inline std::vector<std::string> zoneinfo_dirs() {
  std::vector<std::string> dirs;
  if (const char* env = std::getenv("TZDIR"); env != nullptr && *env != '\0') dirs.emplace_back(env);
  for (const char* d : {"/usr/share/zoneinfo", "/usr/lib/zoneinfo", "/usr/share/lib/zoneinfo",
                        "/etc/zoneinfo"})
    dirs.emplace_back(d);
  return dirs;
}
#endif

inline TimeZonePtr load_zone(const std::string& name) {
#if CRONER_USE_STD_CHRONO_TZDB
  try {
    return std::make_shared<StdChronoZone>(std::chrono::locate_zone(name));
  } catch (const std::exception&) {
  }
#else
  if (valid_zone_name(name)) {
    for (const auto& dir : zoneinfo_dirs()) {
      std::ifstream f(dir + "/" + name, std::ios::binary);
      if (!f) continue;
      std::string data((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
      try {
        return std::make_shared<TzifZone>(name, data);
      } catch (const CronError&) {
        continue;  // e.g. a directory, or not a TZif file
      }
    }
  }
#endif
  // Always know UTC, even without a time zone database
  if (name == "UTC" || name == "Etc/UTC" || name == "GMT" || name == "Etc/GMT" ||
      name == "Etc/Universal" || name == "Etc/Zulu" || name == "Zulu" || name == "Universal")
    return std::make_shared<FixedOffsetZone>(0);
  return nullptr;
}

}  // namespace detail

/// A zone with a constant offset from UTC, in minutes.
inline TimeZonePtr fixed_offset_zone(int offset_minutes) {
  return std::make_shared<detail::FixedOffsetZone>(offset_minutes * 60);
}

/// UTC
inline TimeZonePtr utc_zone() {
  static const TimeZonePtr z = std::make_shared<detail::FixedOffsetZone>(0);
  return z;
}

/// The system local time zone (follows the TZ environment variable).
inline TimeZonePtr local_zone() {
  static const TimeZonePtr z = std::make_shared<detail::LocalZone>();
  return z;
}

/// Look up an IANA time zone such as "Europe/Stockholm". Results are cached.
/// @throws CronError if the zone is unknown.
inline TimeZonePtr locate_zone(const std::string& name) {
  static std::mutex mtx;
  static std::map<std::string, TimeZonePtr> cache;
  std::lock_guard<std::mutex> lock(mtx);
  if (auto it = cache.find(name); it != cache.end()) return it->second;
  TimeZonePtr z = detail::load_zone(name);
  if (!z) {
    throw CronError("Invalid timezone '" + name +
                    "'. Please provide a valid IANA timezone (e.g., 'America/New_York', "
                    "'Europe/Stockholm').");
  }
  cache.emplace(name, z);
  return z;
}

// ---------------------------------------------------------------------------------------------
// Local time resolution, a port of src/helpers/timezone.ts
// ---------------------------------------------------------------------------------------------

namespace detail {

/// No DST transition moves the clock more than this, so it is far enough to look for one
constexpr Millis DST_PROBE_MS = 3 * 3600000;

/// UTC offset in milliseconds at an instant
inline Millis offset_ms(Millis ms, const TimeZone& tz) {
  return static_cast<Millis>(tz.utc_offset(floor_div(ms, 1000))) * 1000;
}

/// Wall clock time (whole seconds, ms dropped) of an instant in a zone
inline DateTime to_tz(Millis ms, const TimeZone& tz) {
  DateTime t = from_millis(floor_div(ms, 1000) * 1000 + offset_ms(ms, tz));
  t.ms = 0;
  return t;
}

/// The real instants of a local time:
/// - Single: the time occurs once
/// - Ambiguous: the time occurs twice, as the clock goes back (DST fall back)
/// - Gap: the time does not exist, as the clock jumps forward (DST spring forward). The clock
///   change happens between `a` and `b`, and `b` is the instant the time would have had with
///   the offset from before the change.
struct LocalResolution {
  enum Kind { Single, Ambiguous, Gap } kind;
  Millis a;  // single: the instant, ambiguous: earlier, gap: before
  Millis b;  // ambiguous: later, gap: after
};

inline LocalResolution resolve_local(const DateTime& tp, const TimeZone& tz) {
  DateTime wall = tp;
  wall.ms = 0;
  const Millis target = to_millis(wall);
  const Millis guess = target - offset_ms(target, tz);
  const DateTime guess_local = to_tz(guess, tz);

  if (guess_local.same_wall_time(wall)) {
    const Millis offset = to_millis(guess_local) - guess;
    const Millis earlier = guess - (offset_ms(guess - DST_PROBE_MS, tz) - offset);
    if (earlier < guess && to_tz(earlier, tz).same_wall_time(wall)) {
      return {LocalResolution::Ambiguous, earlier, guess};
    }
    const Millis later = guess + (offset - offset_ms(guess + DST_PROBE_MS, tz));
    if (later > guess && to_tz(later, tz).same_wall_time(wall)) {
      return {LocalResolution::Ambiguous, guess, later};
    }
    return {LocalResolution::Single, guess, guess};
  }

  const Millis guess2 = target - (to_millis(guess_local) - guess);
  if (to_tz(guess2, tz).same_wall_time(wall)) return {LocalResolution::Single, guess2, guess2};

  return {LocalResolution::Gap, (std::min)(guess, guess2), (std::max)(guess, guess2)};
}

/// Local time to an instant: the first occurrence if it occurs twice, and the instant with the
/// offset from before the change if it falls in a gap.
inline Millis from_tz(const DateTime& tp, const TimeZone& tz) {
  const LocalResolution r = resolve_local(tp, tz);
  return r.kind == LocalResolution::Gap ? r.b : r.a;
}

/// The first whole second with a new offset, between two instants with different offsets
inline Millis find_offset_change(Millis from, Millis to, const TimeZone& tz) {
  const Millis from_offset = offset_ms(from, tz);
  while (to - from > 1000) {
    const Millis middle = from + floor_div(to - from, 2000) * 1000;
    if (offset_ms(middle, tz) == from_offset) {
      from = middle;
    } else {
      to = middle;
    }
  }
  return to;
}

enum class Fold { None, Earlier, Later };

/// Which pass of a repeated local time an instant is on
inline Fold fold_of(Millis ms, const TimeZone& tz) {
  const LocalResolution r = resolve_local(to_tz(ms, tz), tz);
  if (r.kind != LocalResolution::Ambiguous) return Fold::None;
  return ms < r.b ? Fold::Earlier : Fold::Later;
}

/// Parsed ISO 8601 string
struct IsoDateTime {
  DateTime local;
  std::optional<std::int32_t> offset_seconds;  // set if the string has Z or a UTC offset
};

/// Parse "YYYY-MM-DD", "YYYY-MM-DDTHH:MM[:SS[.fff]]" with optional "Z" or "+HH:MM"/"+HHMM".
/// A space may be used instead of "T".
inline IsoDateTime parse_iso(std::string_view s) {
  const auto fail = [&]() -> CronError {
    return CronError("CronDate: Invalid ISO8601 date string '" + std::string(s) + "'");
  };
  std::size_t i = 0;
  const auto digits = [&](std::size_t n, std::int64_t& out) {
    if (i + n > s.size()) return false;
    std::int64_t v = 0;
    for (std::size_t k = 0; k < n; ++k) {
      const char c = s[i + k];
      if (c < '0' || c > '9') return false;
      v = v * 10 + (c - '0');
    }
    i += n;
    out = v;
    return true;
  };
  const auto expect = [&](char c) {
    if (i < s.size() && s[i] == c) {
      ++i;
      return true;
    }
    return false;
  };

  IsoDateTime r;
  DateTime& t = r.local;
  std::int64_t sign = 1;
  if (i < s.size() && (s[i] == '+' || s[i] == '-')) {
    // Expanded year, six digits
    sign = s[i] == '-' ? -1 : 1;
    ++i;
    if (!digits(6, t.year)) throw fail();
    t.year *= sign;
  } else if (!digits(4, t.year)) {
    throw fail();
  }
  if (!expect('-') || !digits(2, t.month) || !expect('-') || !digits(2, t.day)) throw fail();
  if (t.month < 1 || t.month > 12 || t.day < 1 || t.day > days_in_month(t.year, int(t.month)))
    throw fail();
  if (i == s.size()) return r;
  if (!(expect('T') || expect('t') || expect(' '))) throw fail();
  if (!digits(2, t.hour) || !expect(':') || !digits(2, t.minute)) throw fail();
  if (expect(':')) {
    if (!digits(2, t.second)) throw fail();
    if (expect('.') || expect(',')) {
      std::int64_t frac = 0;
      int n = 0;
      while (i < s.size() && s[i] >= '0' && s[i] <= '9') {
        if (n < 3) frac = frac * 10 + (s[i] - '0');
        ++n;
        ++i;
      }
      if (n == 0) throw fail();
      for (int k = n; k < 3; ++k) frac *= 10;
      t.ms = frac;
    }
  }
  if (t.hour > 24 || t.minute > 59 || t.second > 59) throw fail();
  if (t.hour == 24 && (t.minute != 0 || t.second != 0 || t.ms != 0)) throw fail();
  if (i == s.size()) return r;
  if (expect('Z') || expect('z')) {
    r.offset_seconds = 0;
  } else if (s[i] == '+' || s[i] == '-') {
    const std::int32_t osign = s[i] == '-' ? -1 : 1;
    ++i;
    std::int64_t oh = 0, om = 0;
    if (!digits(2, oh)) throw fail();
    expect(':');
    if (!digits(2, om)) throw fail();
    if (oh > 23 || om > 59) throw fail();
    r.offset_seconds = osign * static_cast<std::int32_t>(oh * 3600 + om * 60);
  }
  if (i != s.size()) throw fail();
  return r;
}

/// ISO 8601 string in UTC with milliseconds, e.g. "2025-01-01T00:00:00.000Z"
inline std::string to_iso_string(Millis ms) {
  const DateTime t = from_millis(ms);
  char buf[96];
  if (t.year >= 0 && t.year <= 9999) {
    std::snprintf(buf, sizeof(buf), "%04lld-%02lld-%02lldT%02lld:%02lld:%02lld.%03lldZ",
                  static_cast<long long>(t.year), static_cast<long long>(t.month),
                  static_cast<long long>(t.day), static_cast<long long>(t.hour),
                  static_cast<long long>(t.minute), static_cast<long long>(t.second),
                  static_cast<long long>(t.ms));
  } else {
    std::snprintf(buf, sizeof(buf), "%c%06lld-%02lld-%02lldT%02lld:%02lld:%02lld.%03lldZ",
                  t.year < 0 ? '-' : '+', static_cast<long long>(t.year < 0 ? -t.year : t.year),
                  static_cast<long long>(t.month), static_cast<long long>(t.day),
                  static_cast<long long>(t.hour), static_cast<long long>(t.minute),
                  static_cast<long long>(t.second), static_cast<long long>(t.ms));
  }
  return buf;
}

}  // namespace detail

}  // namespace croner

#endif  // CRONER_TIMEZONE_HPP
