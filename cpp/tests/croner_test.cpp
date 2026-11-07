// Unit tests for the C++ port. Expected values come from the JavaScript test suite
// (../../test) and from running the JavaScript implementation.
#include <croner/croner.hpp>

#include <atomic>
#include <chrono>
#include <cstdlib>
#include <stdexcept>
#include <thread>

#include "test_main.hpp"

using croner::Cron;
using croner::CronError;
using croner::DateRef;
using croner::Options;

namespace {

std::vector<std::string> iso(const std::vector<croner::TimePoint>& runs) {
  std::vector<std::string> out;
  for (const auto& r : runs) out.push_back(croner::to_iso_string(r));
  return out;
}

std::string iso(const std::optional<croner::TimePoint>& run) {
  return run ? croner::to_iso_string(*run) : "null";
}

Options tz(const std::string& zone) {
  Options o;
  o.timezone = zone;
  return o;
}

using Strings = std::vector<std::string>;

}  // namespace

// --- Patterns -------------------------------------------------------------------------------

TEST("five part pattern, every 15 minutes") {
  Cron job("*/15 * * * *", tz("Etc/UTC"));
  CHECK_EQ(iso(job.next_runs(3, "2024-01-01T00:07:00Z")),
           (Strings{"2024-01-01T00:15:00.000Z", "2024-01-01T00:30:00.000Z",
                    "2024-01-01T00:45:00.000Z"}));
}

TEST("six part pattern with seconds") {
  Cron job("*/20 * * * * *", tz("Etc/UTC"));
  CHECK_EQ(iso(job.next_runs(3, "2024-01-01T00:00:00Z")),
           (Strings{"2024-01-01T00:00:20.000Z", "2024-01-01T00:00:40.000Z",
                    "2024-01-01T00:01:00.000Z"}));
}

TEST("nicknames") {
  CHECK_EQ(*Cron("@daily").get_pattern(), std::string("0 0 * * *"));
  CHECK_EQ(*Cron("@HOURLY").get_pattern(), std::string("0 * * * *"));
  Cron job("@weekly", tz("Etc/UTC"));
  CHECK_EQ(iso(job.next_run("2024-01-01T00:00:00Z")), std::string("2024-01-07T00:00:00.000Z"));
  CHECK_THROWS(Cron("@reboot"));
}

TEST("last day of month") {
  Cron job("0 0 L * *", tz("Etc/UTC"));
  CHECK_EQ(iso(job.next_runs(3, "2024-01-15T00:00:00Z")),
           (Strings{"2024-01-31T00:00:00.000Z", "2024-02-29T00:00:00.000Z",
                    "2024-03-31T00:00:00.000Z"}));
}

TEST("last weekday of month") {
  Cron job("0 0 LW * *", tz("Etc/UTC"));
  // 2024-03-31 is a Sunday, 2024-08-31 a Saturday
  CHECK_EQ(iso(job.next_run("2024-03-01T00:00:00Z")), std::string("2024-03-29T00:00:00.000Z"));
  CHECK_EQ(iso(job.next_run("2024-08-01T00:00:00Z")), std::string("2024-08-30T00:00:00.000Z"));
}

TEST("nearest weekday") {
  Cron job("0 0 15W * *", tz("Etc/UTC"));
  // 2024-06-15 is a Saturday, 2024-09-15 a Sunday
  CHECK_EQ(iso(job.next_run("2024-06-01T00:00:00Z")), std::string("2024-06-14T00:00:00.000Z"));
  CHECK_EQ(iso(job.next_run("2024-09-01T00:00:00Z")), std::string("2024-09-16T00:00:00.000Z"));
  // 1W on a Saturday moves forward to Monday the 3rd
  Cron first("0 0 1W * *", tz("Etc/UTC"));
  CHECK_EQ(iso(first.next_run("2024-05-31T00:00:00Z")), std::string("2024-06-03T00:00:00.000Z"));
}

TEST("nth weekday and last weekday of month") {
  Cron second_friday("0 0 * * FRI#2", tz("Etc/UTC"));
  CHECK_EQ(iso(second_friday.next_runs(2, "2024-01-01T00:00:00Z")),
           (Strings{"2024-01-12T00:00:00.000Z", "2024-02-09T00:00:00.000Z"}));
  Cron last_friday("0 0 * * 5L", tz("Etc/UTC"));
  CHECK_EQ(iso(last_friday.next_runs(2, "2024-01-01T00:00:00Z")),
           (Strings{"2024-01-26T00:00:00.000Z", "2024-02-23T00:00:00.000Z"}));
}

TEST("day-of-month and day-of-week are ORed by default, ANDed with + or dom_and_dow") {
  Cron or_job("0 0 13 * FRI", tz("Etc/UTC"));
  CHECK_EQ(iso(or_job.next_runs(2, "2024-09-01T00:00:00Z")),
           (Strings{"2024-09-06T00:00:00.000Z", "2024-09-13T00:00:00.000Z"}));
  Cron and_job("0 0 13 * +FRI", tz("Etc/UTC"));
  CHECK_EQ(iso(and_job.next_run("2024-01-01T00:00:00Z")), std::string("2024-09-13T00:00:00.000Z"));
  Options o = tz("Etc/UTC");
  o.dom_and_dow = true;
  Cron and_option("0 0 13 * FRI", o);
  CHECK_EQ(iso(and_option.next_run("2024-01-01T00:00:00Z")),
           std::string("2024-09-13T00:00:00.000Z"));
}

TEST("names, ranges and Sunday as 7") {
  Cron job("0 0 * JAN-MAR SAT-SUN", tz("Etc/UTC"));
  CHECK_EQ(iso(job.next_runs(3, "2024-03-29T00:00:00Z")),
           (Strings{"2024-03-30T00:00:00.000Z", "2024-03-31T00:00:00.000Z",
                    "2025-01-04T00:00:00.000Z"}));
}

TEST("question mark is a wildcard") {
  Cron job("0 0 12 ? * MON", tz("Etc/UTC"));
  CHECK_EQ(iso(job.next_run("2024-01-01T12:00:00Z")), std::string("2024-01-08T12:00:00.000Z"));
}

TEST("year field") {
  Cron job("0 0 0 1 1 * 2030-2031", tz("Etc/UTC"));
  CHECK_EQ(iso(job.next_runs(3, "2024-01-01T00:00:00Z")),
           (Strings{"2030-01-01T00:00:00.000Z", "2031-01-01T00:00:00.000Z"}));
  CHECK_EQ(iso(job.previous_runs(3, "2035-01-01T00:00:00Z")),
           (Strings{"2031-01-01T00:00:00.000Z", "2030-01-01T00:00:00.000Z"}));
}

TEST("alternative weekdays (Quartz)") {
  Options o = tz("Etc/UTC");
  o.alternative_weekdays = true;
  Cron job("0 0 0 * * 2", o);  // 2 = Monday
  CHECK_EQ(iso(job.next_run("2024-01-01T00:00:00Z")), std::string("2024-01-08T00:00:00.000Z"));
}

TEST("impossible patterns have no runs") {
  Cron job("0 0 30 2 *", tz("Etc/UTC"));
  CHECK(!job.next_run("2024-01-01T00:00:00Z"));
  CHECK(job.previous_runs(1, "2024-01-01T00:00:00Z").empty());
}

TEST("invalid patterns throw") {
  CHECK_THROWS(Cron("* * * *"));
  CHECK_THROWS(Cron("* * * * * * * *"));
  CHECK_THROWS(Cron("60 * * * * *"));
  CHECK_THROWS(Cron("* 24 * * *"));
  CHECK_THROWS(Cron("* * 32 * *"));
  CHECK_THROWS(Cron("* * * 13 *"));
  CHECK_THROWS(Cron("* * * * 8"));
  CHECK_THROWS(Cron("5-1 * * * *"));
  CHECK_THROWS(Cron("*/0 * * * *"));
  CHECK_THROWS(Cron("0/10 * * * *"));  // numeric prefix needs sloppy_ranges
  CHECK_THROWS(Cron("* * * * MON#6"));
  CHECK_THROWS(Cron("* * 1#1 * *"));
  CHECK_THROWS(Cron("* * * * +"));
  CHECK_THROWS(Cron("a * * * *"));
  CHECK_THROWS(Cron("0 0 0 1 1 * 0"));
  Options sloppy;
  sloppy.sloppy_ranges = true;
  Cron ok("0/10 * * * *", sloppy);
  Options five;
  five.mode = croner::Mode::FivePart;
  CHECK_THROWS(Cron("* * * * * *", five));
}

TEST("mode 5-part forces seconds to 0") {
  Options o = tz("Etc/UTC");
  o.mode = croner::Mode::FivePart;
  Cron job("* * * * *", o);
  CHECK_EQ(iso(job.next_run("2024-01-01T00:00:10Z")), std::string("2024-01-01T00:01:00.000Z"));
}

TEST("match") {
  Cron job("0 30 * * * *", tz("Etc/UTC"));
  CHECK(job.match("2024-01-01T10:30:00Z"));
  CHECK(job.match("2024-01-01T10:30:00.500Z"));
  CHECK(!job.match("2024-01-01T10:31:00Z"));
  Cron last("0 0 L * *", tz("Etc/UTC"));
  CHECK(last.match("2024-02-29T00:00:00Z"));
  CHECK(!last.match("2024-02-28T00:00:00Z"));
}

TEST("previous runs") {
  Cron job("0 0 12 * * *", tz("Etc/UTC"));
  CHECK_EQ(iso(job.previous_runs(3, "2024-01-10T12:00:00Z")),
           (Strings{"2024-01-09T12:00:00.000Z", "2024-01-08T12:00:00.000Z",
                    "2024-01-07T12:00:00.000Z"}));
}

// --- Options --------------------------------------------------------------------------------

TEST("start_at is inclusive, stop_at exclusive") {
  Options o = tz("Etc/UTC");
  o.start_at = DateRef("2024-01-01T00:02:00Z");
  o.stop_at = DateRef("2024-01-01T00:05:00Z");
  Cron job("* * * * *", o);
  CHECK_EQ(iso(job.next_runs(10, "2024-01-01T00:00:00Z")),
           (Strings{"2024-01-01T00:02:00.000Z", "2024-01-01T00:03:00.000Z",
                    "2024-01-01T00:04:00.000Z"}));
}

TEST("start_at strings are read in the time zone of the job") {
  Options o = tz("Europe/Stockholm");
  o.start_at = DateRef("2024-06-01T10:00:00");
  Cron job("0 * * * *", o);
  CHECK_EQ(iso(job.next_run("2024-01-01T00:00:00Z")), std::string("2024-06-01T08:00:00.000Z"));
}

TEST("interval") {
  Options o = tz("Etc/UTC");
  o.interval = 90;
  Cron job("* * * * * *", o);
  CHECK_EQ(iso(job.next_runs(3, "2024-01-01T00:00:00Z")),
           (Strings{"2024-01-01T00:01:30.000Z", "2024-01-01T00:03:00.000Z",
                    "2024-01-01T00:04:30.000Z"}));
}

TEST("utc_offset") {
  Options o;
  o.utc_offset = 330;  // +05:30
  Cron job("0 0 9 * * *", o);
  CHECK_EQ(iso(job.next_run("2024-01-01T00:00:00Z")), std::string("2024-01-01T03:30:00.000Z"));
  Options bad;
  bad.utc_offset = 900;
  CHECK_THROWS(Cron("* * * * *", bad));
  Options both;
  both.utc_offset = 60;
  both.timezone = "Europe/Stockholm";
  CHECK_THROWS(Cron("* * * * *", both));
}

TEST("day_offset shifts runs") {
  Options o = tz("Etc/UTC");
  o.day_offset = -1;
  Cron job("0 0 12 1 * *", o);  // the day before the 1st
  CHECK_EQ(iso(job.next_run("2024-01-15T00:00:00Z")), std::string("2024-01-31T12:00:00.000Z"));
}

TEST("max_runs limits next_runs") {
  Options o = tz("Etc/UTC");
  o.max_runs = 2;
  Cron job("* * * * *", o);
  CHECK_EQ(job.next_runs(5, "2024-01-01T00:00:00Z").size(), std::size_t(2));
  CHECK_EQ(*job.runs_left(), std::int64_t(2));
}

TEST("invalid time zone throws") {
  CHECK_THROWS(Cron("* * * * *", tz("Europe/Nowhere")));
  CHECK_THROWS(Cron("* * * * *", tz("../../etc/passwd")));
}

TEST("custom time zone implementation") {
  struct Plus2 : croner::TimeZone {
    std::int32_t utc_offset(std::int64_t) const override { return 7200; }
    std::string name() const override { return "plus2"; }
  };
  Options o;
  o.zone = std::make_shared<Plus2>();
  Cron job("0 0 12 * * *", o);
  CHECK_EQ(iso(job.next_run("2024-01-01T00:00:00Z")), std::string("2024-01-01T10:00:00.000Z"));
}

TEST("named jobs are unique until stopped") {
  Options o;
  o.name = "unique-job";
  {
    Cron a("* * * * *", o);
    CHECK_THROWS(Cron("* * * * *", o));
    CHECK_EQ(croner::scheduled_jobs().size(), std::size_t(1));
    a.stop();
    CHECK(croner::scheduled_jobs().empty());
    Cron b("* * * * *", o);
  }
  CHECK(croner::scheduled_jobs().empty());
}

// --- One-off jobs ----------------------------------------------------------------------------

TEST("one-off job from an ISO string") {
  Cron job("2099-01-01T00:00:00Z");
  CHECK(!job.get_pattern());
  CHECK_EQ(iso(job.get_once()), std::string("2099-01-01T00:00:00.000Z"));
  CHECK_EQ(iso(job.next_run()), std::string("2099-01-01T00:00:00.000Z"));
  CHECK(job.match("2099-01-01T00:00:00Z"));
}

TEST("one-off job in the past has no run unless allow_past") {
  Cron past("2000-01-01T00:00:00Z");
  CHECK(!past.next_run());
  Options o;
  o.allow_past = true;
  Cron allowed("2000-01-01T00:00:00Z", o);
  CHECK(allowed.next_run().has_value());
}

TEST("one-off job from a time point") {
  const auto at = croner::Clock::now() + std::chrono::hours(1);
  Cron job(at);
  CHECK(job.next_run().has_value());
}

// --- DST, shared with croner-rust -------------------------------------------------------------

TEST("fixed-time job runs once in a repeated hour, an interval job twice") {
  const char* from = "2025-11-02T04:00:00Z";  // America/New_York, 1 AM repeats from 06:00Z
  CHECK_EQ(iso(Cron("0 30 1 * * *", tz("America/New_York")).next_runs(2, from)),
           (Strings{"2025-11-02T05:30:00.000Z", "2025-11-03T06:30:00.000Z"}));
  CHECK_EQ(iso(Cron("0 30 1,2 * * *", tz("America/New_York")).next_runs(3, from)),
           (Strings{"2025-11-02T05:30:00.000Z", "2025-11-02T06:30:00.000Z",
                    "2025-11-02T07:30:00.000Z"}));
}

TEST("fixed-time job in a DST gap runs when the gap ends") {
  // 2025-03-30 02:30 does not exist in Europe/Stockholm
  CHECK_EQ(iso(Cron("0 30 2 * * *", tz("Europe/Stockholm")).next_runs(3, "2025-03-29T00:00:00")),
           (Strings{"2025-03-29T01:30:00.000Z", "2025-03-30T01:00:00.000Z",
                    "2025-03-31T00:30:00.000Z"}));
  // An interval job skips the gap
  CHECK_EQ(iso(Cron("0 30 * * * *", tz("Europe/Stockholm")).next_runs(2, "2025-03-30T00:45:00Z")),
           (Strings{"2025-03-30T01:30:00.000Z", "2025-03-30T02:30:00.000Z"}));
}

TEST("a match in a later overlap takes its own real order") {
  Cron job("*/30 2 26-27 10 *", tz("Europe/Paris"));
  CHECK_EQ(iso(job.next_run("2024-10-27T01:45:00Z")), std::string("2025-10-26T00:00:00.000Z"));
}

TEST("iterating minutes through an overlap covers every instant once") {
  for (const char* zone : {"Europe/Paris", "Australia/Lord_Howe", "Pacific/Chatham"}) {
    Cron job("* * * * *", tz(zone));
    const auto forward = job.next_runs(200, "2024-04-06T13:00:00Z");
    for (std::size_t i = 1; i < forward.size(); ++i) {
      CHECK_EQ((forward[i] - forward[i - 1]).count(), 60000);
    }
    auto backward = job.previous_runs(199, DateRef(forward[199]));
    std::reverse(backward.begin(), backward.end());
    CHECK_EQ(iso(backward), iso(std::vector<croner::TimePoint>(forward.begin(), forward.begin() + 199)));
  }
}

// --- Iterator ------------------------------------------------------------------------------

TEST("enumerate with range-for") {
  Options o = tz("Etc/UTC");
  o.stop_at = DateRef("2024-01-01T00:03:00Z");
  Cron job("* * * * *", o);
  Strings runs;
  for (auto t : job.enumerate("2024-01-01T00:00:00Z")) runs.push_back(croner::to_iso_string(t));
  CHECK_EQ(runs, (Strings{"2024-01-01T00:01:00.000Z", "2024-01-01T00:02:00.000Z"}));
}

TEST("iterator peek, next and reset") {
  Cron job("0 0 * * *", tz("Etc/UTC"));
  auto it = job.enumerate("2024-01-01T00:00:00Z");
  CHECK_EQ(iso(it.peek()), std::string("2024-01-02T00:00:00.000Z"));
  CHECK_EQ(iso(it.next()), std::string("2024-01-02T00:00:00.000Z"));
  CHECK_EQ(iso(it.next()), std::string("2024-01-03T00:00:00.000Z"));
  it.reset("2024-06-01T00:00:00Z");
  CHECK_EQ(iso(it.next()), std::string("2024-06-02T00:00:00.000Z"));
}

// --- Time zones -----------------------------------------------------------------------------

TEST("POSIX TZ rules") {
  using croner::detail::PosixParser;
  const auto ny = PosixParser("EST5EDT,M3.2.0,M11.1.0").parse();
  CHECK(ny.has_value());
  // 2030-07-01T12:00:00Z and 2030-01-01T12:00:00Z
  CHECK_EQ(ny->offset_at(1909137600), -4 * 3600);
  CHECK_EQ(ny->offset_at(1893499200), -5 * 3600);
  const auto syd = PosixParser("AEST-10AEDT,M10.1.0,M4.1.0/3").parse();
  CHECK_EQ(syd->offset_at(1909137600), 10 * 3600);
  CHECK_EQ(syd->offset_at(1893499200), 11 * 3600);
  const auto tehran = PosixParser("<+0330>-3:30").parse();
  CHECK_EQ(tehran->offset_at(0), 3 * 3600 + 1800);
  CHECK(!PosixParser("garbage").parse());
}

TEST("zoneinfo zones follow the POSIX footer far into the future") {
  const auto z = croner::locate_zone("Europe/Stockholm");
  CHECK_EQ(z->utc_offset(4118313600), 7200);  // 2100-07-01
  CHECK_EQ(z->utc_offset(4102488000), 3600);  // 2100-01-01
}

// --- Scheduling ----------------------------------------------------------------------------

TEST("scheduled job runs max_runs times, then stops") {
  std::atomic<int> runs{0};
  Options o;
  o.max_runs = 2;
  Cron job("* * * * * *", o, [&](Cron&) { ++runs; });
  CHECK(job.is_running());
  job.join();
  CHECK_EQ(runs.load(), 2);
  CHECK_EQ(*job.runs_left(), std::int64_t(0));
  CHECK(!job.is_running());
  CHECK(job.previous_run().has_value());
}

TEST("job can stop itself") {
  std::atomic<int> runs{0};
  Cron job("* * * * * *", [&](Cron& self) {
    ++runs;
    self.stop();
  });
  job.join();
  CHECK_EQ(runs.load(), 1);
  CHECK(job.is_stopped());
}

TEST("paused job does not run until resumed") {
  std::atomic<int> runs{0};
  Options o;
  o.paused = true;
  o.max_runs = 1;
  Cron job("* * * * * *", o, [&](Cron&) { ++runs; });
  std::this_thread::sleep_for(std::chrono::milliseconds(1500));
  CHECK_EQ(runs.load(), 0);
  CHECK(job.resume());
  job.join();
  CHECK_EQ(runs.load(), 1);
}

TEST("protect skips runs while busy and calls on_protect") {
  std::atomic<int> runs{0}, blocked{0};
  Options o;
  o.on_protect = [&](Cron&) { ++blocked; };
  Cron job("* * * * * *", o, [&](Cron&) {
    ++runs;
    std::this_thread::sleep_for(std::chrono::milliseconds(2300));
  });
  std::this_thread::sleep_for(std::chrono::milliseconds(3200));
  job.stop();
  job.join();
  CHECK_EQ(runs.load(), 1);
  CHECK(blocked.load() >= 1);
}

TEST("errors are passed to on_error") {
  std::atomic<int> errors{0};
  Options o;
  o.max_runs = 1;
  o.on_error = [&](std::exception_ptr e, Cron&) {
    try {
      std::rethrow_exception(e);
    } catch (const std::runtime_error& err) {
      if (std::string(err.what()) == "boom") ++errors;
    }
  };
  Cron job("* * * * * *", o, [](Cron&) { throw std::runtime_error("boom"); });
  job.join();
  CHECK_EQ(errors.load(), 1);
  CHECK(!job.is_busy());
}

TEST("trigger runs on the calling thread and propagates exceptions") {
  int runs = 0;
  Cron job("0 0 1 1 *", [&](Cron&) { ++runs; });
  job.trigger();
  CHECK_EQ(runs, 1);
  CHECK(job.current_run().has_value());
  Cron failing("0 0 1 1 *", [](Cron&) { throw std::logic_error("x"); });
  bool thrown = false;
  try {
    failing.trigger();
  } catch (const std::logic_error&) {
    thrown = true;
  }
  CHECK(thrown);
  CHECK(!failing.is_busy());
}

TEST("scheduling two functions throws") {
  Cron job("0 0 1 1 *", [](Cron&) {});
  CHECK_THROWS(job.schedule([](Cron&) {}));
}

TEST("one-off job fires once") {
  std::atomic<int> runs{0};
  Cron job(croner::Clock::now() + std::chrono::milliseconds(1200), [&](Cron&) { ++runs; });
  job.join();
  CHECK_EQ(runs.load(), 1);
}

int main(int argc, char** argv) { return croner_test::run_all(argc, argv); }
