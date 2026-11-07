// Compares the built-in zoneinfo reader with the C library (localtime_r with TZ set), which reads
// the same TZif files, for every zone in the system database from 1900 to 2200.
// POSIX only.
#include <croner/croner.hpp>

#include <ctime>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

namespace fs = std::filesystem;

static std::int32_t libc_offset(std::int64_t t) {
  const std::time_t tt = static_cast<std::time_t>(t);
  std::tm tm{};
  localtime_r(&tt, &tm);
  return static_cast<std::int32_t>(tm.tm_gmtoff);
}

int main(int argc, char** argv) {
  const fs::path root = argc > 1 ? argv[1] : "/usr/share/zoneinfo";
  std::vector<std::string> names;
  for (const auto& e : fs::recursive_directory_iterator(root)) {
    if (!e.is_regular_file()) continue;
    const std::string rel = fs::relative(e.path(), root).generic_string();
    if (rel.rfind("posix/", 0) == 0 || rel.rfind("right/", 0) == 0) continue;
    std::ifstream f(e.path(), std::ios::binary);
    char magic[4] = {};
    f.read(magic, 4);
    if (std::string(magic, 4) == "TZif") names.push_back(rel);
  }

  long checks = 0, mismatches = 0;
  for (const auto& name : names) {
    const auto ours = croner::locate_zone(name);
    setenv("TZ", (":" + name).c_str(), 1);
    tzset();
    const auto check = [&](std::int64_t t) {
      ++checks;
      const std::int32_t want = libc_offset(t);
      const std::int32_t got = ours->utc_offset(t);
      if (got != want && ++mismatches <= 20) {
        std::cout << name << " at " << t << ": got " << got << ", want " << want << "\n";
      }
      return want;
    };
    // Every 12 hours from 1900 to 2200, and the exact second of every offset change
    constexpr std::int64_t step = 12 * 3600;
    std::int64_t prev = -2208988800;
    std::int32_t prev_offset = check(prev);
    for (std::int64_t t = prev + step; t < 7258118400; t += step) {
      const std::int32_t offset = check(t);
      if (offset != prev_offset) {
        std::int64_t lo = prev, hi = t;
        while (hi - lo > 1) {
          const std::int64_t mid = lo + (hi - lo) / 2;
          (libc_offset(mid) == prev_offset ? lo : hi) = mid;
        }
        check(lo);
        check(hi);
      }
      prev = t;
      prev_offset = offset;
    }
  }
  std::cout << names.size() << " zones, " << checks << " checks, " << mismatches
            << " mismatches\n";
  return mismatches ? 1 : 0;
}
