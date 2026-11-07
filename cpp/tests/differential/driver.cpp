// Reads test cases from stdin (one per line, tab separated) and prints the runs Croner finds.
// Used by fuzz.ts to compare the C++ port with the JavaScript implementation.
//
// Fields: pattern, timezone, utcOffset, domAndDow, alternativeWeekdays, sloppyRanges, interval,
//         startAt, stopAt, dayOffset, mode, reference, direction (n/p), count, maxRuns
#include <croner/croner.hpp>

#include <iostream>
#include <sstream>
#include <string>
#include <vector>

static std::vector<std::string> split_tabs(const std::string& line) {
  std::vector<std::string> out;
  std::string cur;
  for (char c : line) {
    if (c == '\t') {
      out.push_back(cur);
      cur.clear();
    } else {
      cur += c;
    }
  }
  out.push_back(cur);
  return out;
}

static croner::Mode parse_mode(const std::string& m) {
  if (m == "5-part") return croner::Mode::FivePart;
  if (m == "6-part") return croner::Mode::SixPart;
  if (m == "7-part") return croner::Mode::SevenPart;
  if (m == "5-or-6-parts") return croner::Mode::FiveOrSixParts;
  if (m == "6-or-7-parts") return croner::Mode::SixOrSevenParts;
  return croner::Mode::Auto;
}

int main() {
  std::ios::sync_with_stdio(false);
  std::string line;
  while (std::getline(std::cin, line)) {
    const auto f = split_tabs(line);
    if (f.size() < 15) {
      std::cout << "BADLINE\n";
      continue;
    }
    try {
      croner::Options o;
      o.timezone = f[1];
      if (!f[2].empty()) o.utc_offset = std::stoi(f[2]);
      o.dom_and_dow = f[3] == "1";
      o.alternative_weekdays = f[4] == "1";
      o.sloppy_ranges = f[5] == "1";
      o.interval = std::stoll(f[6]);
      if (!f[7].empty()) o.start_at = croner::DateRef(f[7]);
      if (!f[8].empty()) o.stop_at = croner::DateRef(f[8]);
      o.day_offset = std::stoi(f[9]);
      o.mode = parse_mode(f[10]);
      if (!f[14].empty()) o.max_runs = std::stoll(f[14]);
      croner::Cron job(f[0], o);
      const std::size_t n = std::stoul(f[13]);
      const auto runs = f[12] == "p" ? job.previous_runs(n, croner::DateRef(f[11]))
                                     : job.next_runs(n, croner::DateRef(f[11]));
      std::string out;
      for (std::size_t i = 0; i < runs.size(); ++i) {
        if (i) out += ',';
        out += croner::to_iso_string(runs[i]);
      }
      std::cout << (out.empty() ? "-" : out) << "\n";
    } catch (const croner::CronError&) {
      std::cout << "ERR\n";
    }
  }
}
