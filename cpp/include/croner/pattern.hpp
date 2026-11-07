// Croner for C++ - MIT License - Hexagon <github.com/Hexagon>
//
// Cron pattern parser, a port of src/pattern.ts

#ifndef CRONER_PATTERN_HPP
#define CRONER_PATTERN_HPP

#include <array>
#include <cctype>
#include <cstdint>
#include <optional>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

#include "timezone.hpp"

namespace croner {

/// Cron pattern mode, controls which pattern lengths are accepted.
enum class Mode {
  Auto,             ///< 5, 6 or 7 parts
  FivePart,         ///< minute precision, seconds forced to 0, years wildcarded
  SixPart,          ///< second precision, years wildcarded
  SevenPart,        ///< second and year precision
  FiveOrSixParts,   ///< 5 or 6 parts, years wildcarded
  SixOrSevenParts,  ///< 6 or 7 parts
};

/// Bitmasks for nth weekday of month (FRI#2) and last weekday of month (FRIL)
inline constexpr std::uint8_t LAST_OCCURRENCE = 0b100000;
inline constexpr std::uint8_t ANY_OCCURRENCE = 0b111111;
inline constexpr std::uint8_t OCCURRENCE_BITMASKS[5] = {0b00001, 0b00010, 0b00100, 0b01000,
                                                       0b10000};

/// Options affecting how a pattern is parsed
struct PatternOptions {
  Mode mode = Mode::Auto;
  /// Quartz weekday numbering, 1 = Sunday ... 7 = Saturday
  bool alternative_weekdays = false;
  /// Allow non-standard stepping like "/10" and "5/5"
  bool sloppy_ranges = false;
};

/// A parsed cron pattern.
///
/// Each field is an array of flags, 1 if the value is part of the pattern. Days and months are
/// stored with index 0 being the 1st and January. day_of_week holds a bitmask of which
/// occurrences in the month match (ANY_OCCURRENCE for all).
class CronPattern {
 public:
  std::string pattern;
  Mode mode;
  bool alternative_weekdays;
  bool sloppy_ranges;

  std::array<std::uint8_t, 60> second{};
  std::array<std::uint8_t, 60> minute{};
  std::array<std::uint8_t, 24> hour{};
  std::array<std::uint8_t, 31> day{};
  std::array<std::uint8_t, 12> month{};
  std::array<std::uint8_t, 7> day_of_week{};
  std::vector<std::uint8_t> year = std::vector<std::uint8_t>(10000, 0);  // index = year
  std::array<std::uint8_t, 31> nearest_weekdays{};

  bool last_day_of_month = false;
  bool last_weekday = false;
  bool star_dom = false;
  bool star_dow = false;
  bool star_year = false;
  /// OCPS 1.4 "+" modifier in day-of-week, AND day-of-month and day-of-week
  bool use_and_logic = false;
  /// Seconds, minutes and hours each have a single value, without wildcard or step
  bool is_fixed_time = false;

  /// @throws CronError on invalid patterns
  explicit CronPattern(std::string pattern_in, PatternOptions options = {})
      : pattern(std::move(pattern_in)),
        mode(options.mode),
        alternative_weekdays(options.alternative_weekdays),
        sloppy_ranges(options.sloppy_ranges) {
    parse();
  }

 private:
  enum class Part { Second, Minute, Hour, Day, Month, DayOfWeek, NearestWeekdays, Year };

  struct Field {
    std::uint8_t* data;
    int length;
  };

  Field field(Part p) {
    switch (p) {
      case Part::Second: return {second.data(), 60};
      case Part::Minute: return {minute.data(), 60};
      case Part::Hour: return {hour.data(), 24};
      case Part::Day: return {day.data(), 31};
      case Part::Month: return {month.data(), 12};
      case Part::DayOfWeek: return {day_of_week.data(), 7};
      case Part::NearestWeekdays: return {nearest_weekdays.data(), 31};
      case Part::Year: return {year.data(), 10000};
    }
    return {nullptr, 0};
  }

  static const char* part_name(Part p) {
    switch (p) {
      case Part::Second: return "second";
      case Part::Minute: return "minute";
      case Part::Hour: return "hour";
      case Part::Day: return "day";
      case Part::Month: return "month";
      case Part::DayOfWeek: return "dayOfWeek";
      case Part::NearestWeekdays: return "nearestWeekdays";
      case Part::Year: return "year";
    }
    return "";
  }

  [[noreturn]] static void fail(const std::string& msg) { throw CronError("CronPattern: " + msg); }

  static std::string to_upper(std::string s) {
    for (auto& c : s) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
    return s;
  }
  static std::string to_lower(std::string s) {
    for (auto& c : s) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return s;
  }
  static bool contains(std::string_view s, char c) { return s.find(c) != std::string_view::npos; }

  static std::string trim(std::string_view s) {
    std::size_t b = 0, e = s.size();
    while (b < e && std::isspace(static_cast<unsigned char>(s[b]))) ++b;
    while (e > b && std::isspace(static_cast<unsigned char>(s[e - 1]))) --e;
    return std::string(s.substr(b, e - b));
  }

  static std::vector<std::string> split(std::string_view s, char sep) {
    std::vector<std::string> out;
    std::size_t start = 0;
    for (;;) {
      const std::size_t p = s.find(sep, start);
      if (p == std::string_view::npos) {
        out.emplace_back(s.substr(start));
        return out;
      }
      out.emplace_back(s.substr(start, p - start));
      start = p + 1;
    }
  }

  /// JavaScript parseInt(s, 10): leading whitespace, optional sign, digits until the first
  /// non-digit. nullopt (NaN) if there are no digits. Saturates instead of overflowing.
  static std::optional<std::int64_t> parse_int(std::string_view s) {
    std::size_t i = 0;
    while (i < s.size() && std::isspace(static_cast<unsigned char>(s[i]))) ++i;
    bool neg = false;
    if (i < s.size() && (s[i] == '+' || s[i] == '-')) {
      neg = s[i] == '-';
      ++i;
    }
    const std::size_t start = i;
    std::int64_t v = 0;
    while (i < s.size() && s[i] >= '0' && s[i] <= '9') {
      if (v < 1000000000000LL) v = v * 10 + (s[i] - '0');
      ++i;
    }
    if (i == start) return std::nullopt;
    return neg ? -v : v;
  }

  /// Case-insensitive replace of all occurrences
  static std::string replace_all_ci(const std::string& s, std::string_view from,
                                    std::string_view to) {
    std::string out;
    const std::string upper = to_upper(s);
    const std::string from_upper = to_upper(std::string(from));
    std::size_t pos = 0;
    for (;;) {
      const std::size_t p = upper.find(from_upper, pos);
      if (p == std::string::npos) break;
      out.append(s, pos, p - pos);
      out.append(to);
      pos = p + from.size();
    }
    out.append(s, pos, std::string::npos);
    return out;
  }

  template <std::size_t N>
  static std::string replace_alpha(std::string conf,
                                   const std::array<std::pair<const char*, const char*>, N>& map) {
    for (const auto& [name, value] : map) conf = replace_all_ci(conf, name, value);
    return conf;
  }

  void parse() {
    // Handle @yearly, @monthly etc
    if (contains(pattern, '@')) pattern = trim(handle_nicknames(pattern));

    // Split on any whitespace
    std::vector<std::string> parts;
    {
      std::size_t i = 0;
      while (i < pattern.size()) {
        while (i < pattern.size() && std::isspace(static_cast<unsigned char>(pattern[i]))) ++i;
        const std::size_t start = i;
        while (i < pattern.size() && !std::isspace(static_cast<unsigned char>(pattern[i]))) ++i;
        if (i > start) parts.push_back(pattern.substr(start, i - start));
      }
      if (parts.empty()) parts.emplace_back("");
    }
    const std::size_t original_count = parts.size();

    if (parts.size() < 5 || parts.size() > 7) {
      fail("invalid configuration format ('" + pattern +
           "'), exactly five, six, or seven space separated parts are required.");
    }

    if (mode != Mode::Auto) {
      bool valid = false;
      std::string expected;
      switch (mode) {
        case Mode::FivePart: valid = original_count == 5; expected = "5"; break;
        case Mode::SixPart: valid = original_count == 6; expected = "6"; break;
        case Mode::SevenPart: valid = original_count == 7; expected = "7"; break;
        case Mode::FiveOrSixParts:
          valid = original_count == 5 || original_count == 6;
          expected = "5 or 6";
          break;
        case Mode::SixOrSevenParts:
          valid = original_count == 6 || original_count == 7;
          expected = "6 or 7";
          break;
        case Mode::Auto: break;
      }
      if (!valid) {
        fail("mode '" + mode_name(mode) + "' requires exactly " + expected +
             " parts, but pattern '" + pattern + "' has " + std::to_string(original_count) +
             " parts.");
      }
    }

    // If seconds is omitted, insert 0 for seconds
    if (parts.size() == 5) parts.insert(parts.begin(), "0");
    // If year is omitted, append * for year
    if (parts.size() == 6) parts.emplace_back("*");

    // OCPS 1.4: '?' is an alias for '*'
    if (contains(pattern, '?')) {
      for (auto& p : parts)
        for (auto& c : p)
          if (c == '?') c = '*';
    }

    // L and LW in day-of-month
    if (to_upper(parts[3]) == "LW") {
      last_weekday = true;
      parts[3] = "";
    } else if (contains(to_upper(parts[3]), 'L')) {
      std::string stripped;
      for (char c : parts[3])
        if (c != 'L' && c != 'l') stripped += c;
      parts[3] = stripped;
      last_day_of_month = true;
    }

    if (parts[3] == "*") star_dom = true;
    if (parts[6] == "*") star_year = true;

    // Replace alpha representations
    static const std::array<std::pair<const char*, const char*>, 12> month_names = {{
        {"jan", "1"}, {"feb", "2"}, {"mar", "3"}, {"apr", "4"}, {"may", "5"}, {"jun", "6"},
        {"jul", "7"}, {"aug", "8"}, {"sep", "9"}, {"oct", "10"}, {"nov", "11"}, {"dec", "12"},
    }};
    // "-sun" must come before "sun": Sunday as the upper value of a range is 7
    static const std::array<std::pair<const char*, const char*>, 8> day_names = {{
        {"-sun", "-7"}, {"sun", "0"}, {"mon", "1"}, {"tue", "2"},
        {"wed", "3"}, {"thu", "4"}, {"fri", "5"}, {"sat", "6"},
    }};
    static const std::array<std::pair<const char*, const char*>, 7> day_names_quartz = {{
        {"sun", "1"}, {"mon", "2"}, {"tue", "3"}, {"wed", "4"},
        {"thu", "5"}, {"fri", "6"}, {"sat", "7"},
    }};
    if (parts[4].size() >= 3) parts[4] = replace_alpha(parts[4], month_names);
    if (parts[5].size() >= 3) {
      parts[5] = alternative_weekdays ? replace_alpha(parts[5], day_names_quartz)
                                      : replace_alpha(parts[5], day_names);
    }

    // OCPS 1.4: "+" in day-of-week for AND logic
    if (!parts[5].empty() && parts[5][0] == '+') {
      use_and_logic = true;
      parts[5] = parts[5].substr(1);
      if (parts[5].empty()) fail("Day-of-week field cannot be empty after '+' modifier.");
    }

    if (parts[5] == "*") star_dow = true;

    // Mode specific overrides
    switch (mode) {
      case Mode::FivePart:
        parts[0] = "0";
        parts[6] = "*";
        break;
      case Mode::SixPart:
      case Mode::FiveOrSixParts:
        parts[6] = "*";
        break;
      default:
        break;
    }

    throw_at_illegal_characters(parts);

    part_to_array(Part::Second, parts[0], 0, 1);
    part_to_array(Part::Minute, parts[1], 0, 1);
    part_to_array(Part::Hour, parts[2], 0, 1);
    part_to_array(Part::Day, parts[3], -1, 1);
    part_to_array(Part::Month, parts[4], -1, 1);
    part_to_array(Part::DayOfWeek, parts[5], alternative_weekdays ? -1 : 0, ANY_OCCURRENCE);
    part_to_array(Part::Year, parts[6], 0, 1);

    const auto is_fixed = [](const std::string& part, const auto& values) {
      if (contains(part, '*') || contains(part, '/')) return false;
      int n = 0;
      for (auto v : values)
        if (v) ++n;
      return n == 1;
    };
    is_fixed_time =
        is_fixed(parts[0], second) && is_fixed(parts[1], minute) && is_fixed(parts[2], hour);
  }

  static std::string mode_name(Mode m) {
    switch (m) {
      case Mode::Auto: return "auto";
      case Mode::FivePart: return "5-part";
      case Mode::SixPart: return "6-part";
      case Mode::SevenPart: return "7-part";
      case Mode::FiveOrSixParts: return "5-or-6-parts";
      case Mode::SixOrSevenParts: return "6-or-7-parts";
    }
    return "";
  }

  void part_to_array(Part type, const std::string& conf, int offset, int default_value) {
    if (conf.empty() && !(type == Part::Day && (last_day_of_month || last_weekday))) {
      fail(std::string("configuration entry ") + part_name(type) + " (" + conf +
           ") is empty, check for trailing spaces.");
    }

    if (conf == "*") {
      const Field f = field(type);
      for (int i = 0; i < f.length; ++i) f.data[i] = static_cast<std::uint8_t>(default_value);
      return;
    }

    const auto items = split(conf, ',');
    if (items.size() > 1) {
      for (const auto& item : items) part_to_array(type, item, offset, default_value);
    } else if (contains(conf, '-') && contains(conf, '/')) {
      handle_range_with_stepping(conf, type, offset, default_value);
    } else if (contains(conf, '-')) {
      handle_range(conf, type, offset, default_value);
    } else if (contains(conf, '/')) {
      handle_stepping(conf, type, offset, default_value);
    } else if (!conf.empty()) {
      handle_number(conf, type, offset, default_value);
    }
  }

  static void throw_at_illegal_characters(const std::vector<std::string>& parts) {
    for (std::size_t i = 0; i < parts.size(); ++i) {
      for (char c : parts[i]) {
        bool ok = c == '/' || c == '*' || (c >= '0' && c <= '9') || c == ',' || c == '-';
        if (i == 3) ok = ok || c == 'W' || c == 'w' || c == 'L' || c == 'l';
        if (i == 5) ok = ok || c == '#' || c == 'L' || c == 'l';
        if (!ok) {
          fail("configuration entry " + std::to_string(i) + " (" + parts[i] +
               ") contains illegal characters.");
        }
      }
    }
  }

  // The nth modifier of a value: nullopt or empty for none, otherwise "L" or a number
  using Nth = std::optional<std::string>;

  void handle_number(const std::string& conf, Part type, int offset, int default_value) {
    const auto [rest, nth] = extract_nth(conf, type);
    const bool nearest = contains(to_upper(conf), 'W');
    if (type != Part::Day && nearest) {
      fail("Nearest weekday modifier (W) only allowed in day-of-month.");
    }
    if (nearest) type = Part::NearestWeekdays;
    const auto v = parse_int(rest);
    if (!v) fail(std::string(part_name(type)) + " is not a number: '" + conf + "'");
    set_part(type, *v + offset, nth, default_value);
  }

  void set_part(Part part, std::int64_t index, const Nth& nth, int default_value) {
    if (part == Part::DayOfWeek) {
      if (index == 7) index = 0;
      if (index < 0 || index > 6) {
        fail("Invalid value for dayOfWeek: " + std::to_string(index));
      }
      set_nth_weekday_of_month(static_cast<int>(index), nth, default_value);
      return;
    }
    std::int64_t lo = 0, hi = 0;
    switch (part) {
      case Part::Second:
      case Part::Minute: hi = 60; break;
      case Part::Hour: hi = 24; break;
      case Part::Day:
      case Part::NearestWeekdays: hi = 31; break;
      case Part::Month: hi = 12; break;
      case Part::Year: lo = 1; hi = 10000; break;
      default: break;
    }
    if (index < lo || index >= hi) {
      fail("Invalid value for " + std::string(part_name(part)) + ": " + std::to_string(index) +
           (part == Part::Year ? " (supported range: 1-9999)" : ""));
    }
    field(part).data[index] = static_cast<std::uint8_t>(default_value);
  }

  void validate_range(std::int64_t lower, std::int64_t upper, std::optional<std::int64_t> steps,
                      Part type, const std::string& conf) {
    if (lower > upper) fail("From value is larger than to value: '" + conf + "'");
    if (steps) {
      if (*steps == 0) fail("Syntax error, illegal stepping: 0");
      if (*steps > field(type).length) {
        fail("Syntax error, steps cannot be greater than maximum value of part (" +
             std::to_string(field(type).length) + ")");
      }
    }
  }

  void handle_range_with_stepping(const std::string& conf, Part type, int offset,
                                  int default_value) {
    if (contains(to_upper(conf), 'W')) fail("Syntax error, W is not allowed in ranges with stepping.");
    const auto [rest, nth] = extract_nth(conf, type);

    // ^(\d+)-(\d+)\/(\d+)$
    const auto is_digits = [](std::string_view s) {
      if (s.empty()) return false;
      for (char c : s)
        if (c < '0' || c > '9') return false;
      return true;
    };
    const std::size_t dash = rest.find('-');
    const std::size_t slash = rest.find('/');
    if (dash == std::string::npos || slash == std::string::npos || slash < dash ||
        !is_digits(std::string_view(rest).substr(0, dash)) ||
        !is_digits(std::string_view(rest).substr(dash + 1, slash - dash - 1)) ||
        !is_digits(std::string_view(rest).substr(slash + 1))) {
      fail("Syntax error, illegal range with stepping: '" + conf + "'");
    }
    const std::int64_t lower = *parse_int(rest.substr(0, dash)) + offset;
    const std::int64_t upper = *parse_int(rest.substr(dash + 1, slash - dash - 1)) + offset;
    const std::int64_t steps = *parse_int(rest.substr(slash + 1));

    validate_range(lower, upper, steps, type, conf);
    for (std::int64_t i = lower; i <= upper; i += steps) set_part(type, i, nth, default_value);
  }

  /// Break out nth weekday (#) or last occurrence (L), only allowed in day-of-week
  static std::pair<std::string, Nth> extract_nth(const std::string& conf, Part type) {
    if (contains(conf, '#')) {
      if (type != Part::DayOfWeek) {
        throw CronError("CronPattern: nth (#) only allowed in day-of-week field");
      }
      const auto pieces = split(conf, '#');
      return {pieces[0], pieces[1]};
    }
    if (!conf.empty() && (conf.back() == 'L' || conf.back() == 'l')) {
      if (type != Part::DayOfWeek) {
        throw CronError(
            "CronPattern: L modifier only allowed in day-of-week field (use L alone for "
            "day-of-month)");
      }
      return {conf.substr(0, conf.size() - 1), std::string("L")};
    }
    return {conf, std::nullopt};
  }

  void handle_range(const std::string& conf, Part type, int offset, int default_value) {
    if (contains(to_upper(conf), 'W')) fail("Syntax error, W is not allowed in a range.");
    const auto [rest, nth] = extract_nth(conf, type);
    const auto pieces = split(rest, '-');
    if (pieces.size() != 2) fail("Syntax error, illegal range: '" + conf + "'");
    const auto lo = parse_int(pieces[0]);
    const auto hi = parse_int(pieces[1]);
    if (!lo) fail("Syntax error, illegal lower range (NaN)");
    if (!hi) fail("Syntax error, illegal upper range (NaN)");
    const std::int64_t lower = *lo + offset, upper = *hi + offset;
    validate_range(lower, upper, std::nullopt, type, conf);
    for (std::int64_t i = lower; i <= upper; ++i) set_part(type, i, nth, default_value);
  }

  void handle_stepping(const std::string& conf, Part type, int offset, int default_value) {
    if (contains(to_upper(conf), 'W')) {
      fail("Syntax error, W is not allowed in parts with stepping.");
    }
    const auto [rest, nth] = extract_nth(conf, type);
    auto pieces = split(rest, '/');
    if (pieces.size() != 2) fail("Syntax error, illegal stepping: '" + conf + "'");

    if (!sloppy_ranges) {
      if (pieces[0].empty()) {
        fail("Syntax error, stepping with missing prefix ('" + conf +
             "') is not allowed. Use wildcard (*/step) or range (min-max/step) instead.");
      }
      if (pieces[0] != "*") {
        fail("Syntax error, stepping with numeric prefix ('" + conf +
             "') is not allowed. Use wildcard (*/step) or range (min-max/step) instead.");
      }
    } else if (pieces[0].empty()) {
      pieces[0] = "*";
    }

    std::int64_t start = 0;
    if (pieces[0] != "*") {
      const auto s = parse_int(pieces[0]);
      // NaN start never enters the loop in JavaScript
      if (!s) start = field(type).length;
      else start = *s + offset;
    }

    const auto steps = parse_int(pieces[1]);
    if (!steps) fail("Syntax error, illegal stepping: (NaN)");
    const int length = field(type).length;
    validate_range(0, length - 1, *steps, type, conf);

    for (std::int64_t i = start; i < length; i += *steps) {
      if (type == Part::Year && i == 0) continue;  // There is no year 0
      set_part(type, i, nth, default_value);
    }
  }

  static std::string handle_nicknames(const std::string& p) {
    const std::string clean = to_lower(trim(p));
    if (clean == "@reboot") {
      fail(
          "@reboot is not supported in this environment. This is an event-based trigger that "
          "requires system startup detection.");
    }
    static const std::array<std::pair<const char*, const char*>, 7> nicknames = {{
        {"@yearly", "0 0 1 1 *"},
        {"@annually", "0 0 1 1 *"},
        {"@monthly", "0 0 1 * *"},
        {"@weekly", "0 0 * * 0"},
        {"@daily", "0 0 * * *"},
        {"@midnight", "0 0 * * *"},
        {"@hourly", "0 * * * *"},
    }};
    for (const auto& [name, value] : nicknames)
      if (clean == name) return value;
    return p;
  }

  void set_nth_weekday_of_month(int index, const Nth& nth, int default_value) {
    auto& v = day_of_week[static_cast<std::size_t>(index)];
    if (!nth || nth->empty()) {
      // Default value, ANY_OCCURRENCE
      if (default_value == ANY_OCCURRENCE) {
        v = ANY_OCCURRENCE;
        return;
      }
      fail("nth weekday out of range, should be 1-5 or L. Value: " +
           std::to_string(default_value));
    }
    if (to_upper(*nth) == "L") {
      v = static_cast<std::uint8_t>(v | LAST_OCCURRENCE);
      return;
    }
    // Number(nth) must be an integer 1-5
    bool numeric = true;
    std::int64_t n = 0;
    for (char c : *nth) {
      if (c < '0' || c > '9') {
        numeric = false;
        break;
      }
      if (n < 1000) n = n * 10 + (c - '0');
    }
    if (numeric && n > 0 && n < 6) {
      v = static_cast<std::uint8_t>(v | OCCURRENCE_BITMASKS[n - 1]);
      return;
    }
    fail("nth weekday out of range, should be 1-5 or L. Value: " + *nth);
  }
};

}  // namespace croner

#endif  // CRONER_PATTERN_HPP
