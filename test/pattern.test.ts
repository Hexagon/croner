import { assert, assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

test("Stepping without asterisk should not throw with sloppyRanges option", function () {
  let scheduler = new Cron("/3 * * * * *", { sloppyRanges: true });
  scheduler.nextRun();
});

test("Clean 6 part pattern should not throw", function () {
  let scheduler = new Cron("* * * * * *");
  scheduler.nextRun();
});

test("Clean 5 part pattern should not throw", function () {
  let scheduler = new Cron("* * * * *");
  scheduler.nextRun();
});

test("Pattern should be returned by .getPattern() (0 0 0 * * *)", function () {
  let job = new Cron("0 0 0 * * *");
  assertEquals(job.getPattern(), "0 0 0 * * *");
});

test("getPattern() should return undefined when using ISO 8601 date string", function () {
  let job = new Cron("2025-11-28T10:35:00.000Z");
  assertEquals(job.getPattern(), undefined);
});

test("getPattern() should return undefined when using Date object", function () {
  let job = new Cron(new Date("2025-11-28T10:35:00.000Z"));
  assertEquals(job.getPattern(), undefined);
});

test("getPattern() should return pattern for regular cron pattern", function () {
  let job = new Cron("*/5 * * * *");
  assertEquals(job.getPattern(), "*/5 * * * *");
});

test("String object pattern should not throw", function () {
  //@ts-ignore
  let scheduler = new Cron(new String("* * * * * *"));
  scheduler.nextRun();
});

test("Short pattern should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * *");
    scheduler.nextRun();
  });
});

// 7-field pattern tests are now covered by OCPS 1.2 tests

test("Letter in pattern should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* a * * * *");
    scheduler.nextRun();
  });
});

test("Letter combined with star in pattern should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* *a * * * *");
    scheduler.nextRun();
  });
});

test("Number combined with star in pattern should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* *1 * * * *");
    scheduler.nextRun();
  });
});

test("Invalid data type of pattern should throw", function () {
  assertThrows(() => {
    //@ts-ignore
    let scheduler = new Cron(new Object());
    scheduler.nextRun();
  });
});

// Sunday as 0 or 7 tests are now covered by OCPS 1.0 tests

test("0 0 0 * * * should return tomorrow, at 00:00:00", function () {
  let scheduler = new Cron("0 0 0 * * *"),
    nextRun = scheduler.nextRun(),
    // ToDay/nextDay is a fix for DST in test
    toDay = new Date(),
    nextDay = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // Add one day

  // Set seconds, minutes and hours to 00:00:00
  toDay.setMilliseconds(0);
  toDay.setSeconds(0);
  toDay.setMinutes(0);
  toDay.setHours(0);
  nextDay = new Date(toDay.getTime() + 36 * 60 * 60 * 1000);
  nextDay.setMilliseconds(0);
  nextDay.setSeconds(0);
  nextDay.setMinutes(0);
  nextDay.setHours(0);

  // Do comparison
  assertEquals(nextRun?.getTime(), nextDay.getTime());
});

test('new String("0 0 0 * * *") should return tomorrow, at 00:00:00', function () {
  //@ts-ignore
  let scheduler = new Cron(new String("0 0 0 * * *")),
    nextRun = scheduler.nextRun(),
    // ToDay/nextDay is a fix for DST in test
    toDay = new Date(),
    nextDay = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // Add one day

  // Set seconds, minutes and hours to 00:00:00
  toDay.setMilliseconds(0);
  toDay.setSeconds(0);
  toDay.setMinutes(0);
  toDay.setHours(0);
  nextDay = new Date(toDay.getTime() + 36 * 60 * 60 * 1000);
  nextDay.setMilliseconds(0);
  nextDay.setSeconds(0);
  nextDay.setMinutes(0);
  nextDay.setHours(0);

  // Do comparison
  assertEquals(nextRun?.getTime(), nextDay.getTime());
});

test("0 0 12 * * * with startdate tomorrow should return day after tomorrow, at 12:00:00", function () {
  let nextDay = new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Add one day
    dayAfterNext = new Date(new Date().getTime() + 48 * 60 * 60 * 1000), // Add two days
    scheduler,
    nextRun;

  // Set a fixed hour later than startAt, to be sure that the days doesn't overlap
  nextDay = new Date(nextDay.setUTCHours(14));
  scheduler = new Cron("0 0 12 * * *", { timezone: "Etc/UTC", startAt: nextDay.toISOString() });
  nextRun = scheduler.nextRun();

  // Set seconds, minutes and hours to 00:00:00
  dayAfterNext.setMilliseconds(0);
  dayAfterNext.setUTCSeconds(0);
  dayAfterNext.setUTCMinutes(0);
  dayAfterNext.setUTCHours(12);

  // Do comparison
  assertEquals(nextRun?.getTime(), dayAfterNext.getTime());
});

test("* 17 * * * should return today, at 17:00:00 (if time is before 17:00:00)", function () {
  let todayAt12 = new Date(), // Subtract one day
    scheduler,
    nextRun;

  todayAt12.setHours(12);
  todayAt12.setMinutes(34);
  todayAt12.setMinutes(54);

  scheduler = new Cron("* * 17 * * *");
  nextRun = scheduler.nextRun(todayAt12);

  // Do comparison
  assertEquals(nextRun?.getHours(), 17);
  assertEquals(nextRun?.getMinutes(), 0);
  assertEquals(nextRun?.getMinutes(), 0);
});

test("*/5 * 15 * * should return today, at 15:00:00 (if time is before 17:00:00)", function () {
  let todayAt12 = new Date(), // Subtract one day
    scheduler,
    nextRun;

  todayAt12.setHours(12);
  todayAt12.setMinutes(34);
  todayAt12.setMinutes(54);

  scheduler = new Cron("*/5 * 15 * * *");
  nextRun = scheduler.nextRun(todayAt12);

  // Do comparison
  assertEquals(nextRun?.getHours(), 15);
  assertEquals(nextRun?.getMinutes(), 0);
  assertEquals(nextRun?.getMinutes(), 0);
});

test("* * 15 * * should return today, at 15:00:00 (if time is before 17:00:00)", function () {
  let todayAt12 = new Date(), // Subtract one day
    scheduler,
    nextRun;

  todayAt12.setHours(12);
  todayAt12.setMinutes(34);
  todayAt12.setMinutes(54);

  scheduler = new Cron("* * 15 * * *");
  nextRun = scheduler.nextRun(todayAt12);

  // Do comparison
  assertEquals(nextRun?.getHours(), 15);
  assertEquals(nextRun?.getMinutes(), 0);
  assertEquals(nextRun?.getMinutes(), 0);
});
test("59 * ? ? ? ? should (almost always) run within a minute", function () {
  let now = new Date(),
    scheduler,
    nextRun;

  // Set seconds to a low value to make sure the hour does not tip over
  now.setSeconds(30);

  scheduler = new Cron("59 * ? ? ? ?");
  nextRun = scheduler.nextRun(now);

  // Do compariso
  assertEquals(nextRun && nextRun?.getTime() < now.getTime() + 60000, true);
  assertEquals(nextRun && nextRun?.getTime() >= now.getTime(), true);
});

test("? * ? ? ? ? should (almost always) run within a minute", function () {
  let now = new Date(),
    scheduler,
    nextRun;

  // Set seconds to a low value to make sure the hour/minute does not tip over
  now.setSeconds(30);

  scheduler = new Cron("? * ? ? ? ?");
  nextRun = scheduler.nextRun(now);

  // Do compariso
  assertEquals(nextRun && nextRun.getTime() < now.getTime() + 60000, true);
  assertEquals(nextRun && nextRun.getTime() >= now.getTime(), true);
});

test("* * ? ? ? ? should return correct hour when used with a custom time zone", function () {
  let now = new Date(),
    scheduler,
    nextRun;

  // Set seconds to a low value to make sure the hour/minute does not tip over
  now.setSeconds(30);

  scheduler = new Cron("* * ? ? ? ?", { timezone: "America/New_York" });
  nextRun = scheduler.nextRun(now);

  // Do comparison
  assertEquals(nextRun && nextRun.getUTCHours(), now.getUTCHours());
});

test("* ? ? ? ? ? should (almost always) run within a second", function () {
  let now = new Date(),
    scheduler,
    nextRun;

  // Set seconds to a low value to make sure the hour does not tip over
  now.setSeconds(30);

  scheduler = new Cron("* ? ? ? ? ?");
  nextRun = scheduler.nextRun(now);

  // Do compariso
  assertEquals(nextRun && nextRun.getTime() < now.getTime() + 1500, true);
  assertEquals(nextRun && nextRun.getTime() >= now.getTime(), true);
});

test("*/5 * 11 * * should return next day, at 11:00:00, if time is 12", function () {
  let todayAt12 = new Date(), // Subtract one day
    scheduler,
    nextRun;

  todayAt12.setHours(12);
  todayAt12.setMinutes(34);
  todayAt12.setMinutes(54);

  scheduler = new Cron("*/5 * 11 * * *"), nextRun = scheduler.nextRun(todayAt12);

  // Do comparison
  assertEquals(nextRun && nextRun.getHours(), 11);
  assertEquals(nextRun && nextRun.getMinutes(), 0);
  assertEquals(nextRun && nextRun.getMinutes(), 0);
});

test("0 0 0 L 2 * should find last day of february(28 2022)", function () {
  let scheduler = new Cron("0 0 0 L 2 *"),
    prevRun = new Date(1643930208380), // From 4th of february 2022
    nextRun = scheduler.nextRun(prevRun);

  // Do comparison
  assertEquals(nextRun && nextRun.getDate(), 28);
  assertEquals(nextRun && nextRun.getMonth(), 1);
  assertEquals(nextRun && nextRun.getFullYear(), 2022);
});

test("0 0 0 L 2 * should find last day of february (29 2024)", function () {
  let scheduler = new Cron("0 0 0 L 2 *"),
    prevRun = new Date(1703891808380), // From 30th of december 2023
    nextRun = scheduler.nextRun(prevRun);

  // Do comparison
  assertEquals(nextRun && nextRun.getDate(), 29);
  assertEquals(nextRun && nextRun.getMonth(), 1);
  assertEquals(nextRun && nextRun.getFullYear(), 2024);
});

test("0 0 0 * 2 SUN#L should find last sunday of february 2024 (25/2 2024)", function () {
  let scheduler = new Cron("0 0 0 * 2 SUN#L"),
    prevRun = new Date(1703891808380), // From 30th of december 2023
    nextRun = scheduler.nextRun(prevRun);

  // Do comparison
  assertEquals(nextRun && nextRun.getDate(), 25);
  assertEquals(nextRun && nextRun.getMonth(), 1);
  assertEquals(nextRun && nextRun.getFullYear(), 2024);
});

test("0 0 0 * 2 SUN#L should find last thursday of february 2024 (29/2 2024)", function () {
  let scheduler = new Cron("0 0 0 * 2 THU#L"),
    prevRun = new Date(1703891808380), // From 30th of december 2023
    nextRun = scheduler.nextRun(prevRun);

  // Do comparison
  assertEquals(nextRun && nextRun.getDate(), 29);
  assertEquals(nextRun && nextRun.getMonth(), 1);
  assertEquals(nextRun && nextRun.getFullYear(), 2024);
});

test("0 0 0 * 2 FRI#L should find last friday of february 2024 (23/2 2024)", function () {
  let scheduler = new Cron("0 0 0 * 2 FRI#L"),
    prevRun = new Date(1703891808380), // From 30th of december 2023
    nextRun = scheduler.nextRun(prevRun);

  // Do comparison
  assertEquals(nextRun && nextRun.getDate(), 23);
  assertEquals(nextRun && nextRun.getMonth(), 1);
  assertEquals(nextRun && nextRun.getFullYear(), 2024);
});

test("0 0 0 * 2 THU-FRI#L should find last thursday or friday of february 2024 (23/2 2024)", function () {
  let scheduler = new Cron("0 0 0 * 2 THU-FRI#L"),
    prevRun = new Date(1703891808380), // From 30th of december 2023
    nextRun = scheduler.nextRun(prevRun);

  // Do comparison
  assertEquals(nextRun && nextRun.getDate(), 23);
  assertEquals(nextRun && nextRun.getMonth(), 1);
  assertEquals(nextRun && nextRun.getFullYear(), 2024);
});

test("0 0 0 * * SAT-SUN#L,SUN#1 should find last saturday or sunday of august 2023 (26-27/8 2023) as well as fist sunday of september", function () {
  let scheduler = new Cron("0 0 0 * * SAT-SUN#L,SUN#1"),
    prevRun = new Date(1691536579072), // From 9th of august 2023
    nextRun = scheduler.nextRuns(5, prevRun);

  // Do comparison
  assertEquals(nextRun[0].getDate(), 26);
  assertEquals(nextRun[0].getMonth(), 7);
  assertEquals(nextRun[0].getFullYear(), 2023);

  assertEquals(nextRun[1].getDate(), 27);
  assertEquals(nextRun[1].getMonth(), 7);
  assertEquals(nextRun[1].getFullYear(), 2023);

  assertEquals(nextRun[2].getDate(), 3);
  assertEquals(nextRun[2].getMonth(), 8);
  assertEquals(nextRun[2].getFullYear(), 2023);

  assertEquals(nextRun[3].getDate(), 24);
  assertEquals(nextRun[3].getMonth(), 8);
  assertEquals(nextRun[3].getFullYear(), 2023);

  assertEquals(nextRun[4].getDate(), 30);
  assertEquals(nextRun[4].getMonth(), 8);
  assertEquals(nextRun[4].getFullYear(), 2023);
});

test("0 0 0 * * SUN-MON#3,MON-TUE#1 should work", function () {
  let scheduler = new Cron("0 0 0 * * SUN-MON#3,MON-TUE#1"),
    prevRun = new Date(1691536579072), // From 9th of august 2023
    nextRun = scheduler.nextRuns(5, prevRun);

  // Do comparison
  assertEquals(nextRun[0].getDate(), 20);
  assertEquals(nextRun[0].getMonth(), 7);
  assertEquals(nextRun[0].getFullYear(), 2023);

  assertEquals(nextRun[1].getDate(), 21);
  assertEquals(nextRun[1].getMonth(), 7);
  assertEquals(nextRun[1].getFullYear(), 2023);

  assertEquals(nextRun[2].getDate(), 4);
  assertEquals(nextRun[2].getMonth(), 8);
  assertEquals(nextRun[2].getFullYear(), 2023);

  assertEquals(nextRun[3].getDate(), 5);
  assertEquals(nextRun[3].getMonth(), 8);
  assertEquals(nextRun[3].getFullYear(), 2023);
});

test("W Modifier: '15W' on a weekday should run on the 15th", function () {
  // July 15, 2025 is a Tuesday
  const scheduler = new Cron("0 0 0 15W 7 *", { timezone: "Etc/UTC" });
  const nextRun = scheduler.nextRun("2025-07-01T00:00:00Z");
  assertEquals(nextRun?.getUTCDate(), 15);
});

test("W Modifier: '19W' on a Saturday should run on Friday the 18th", function () {
  // July 19, 2025 is a Saturday
  const scheduler = new Cron("0 0 0 19W 7 *", { timezone: "Etc/UTC" });
  const nextRun = scheduler.nextRun("2025-07-01T00:00:00Z");
  assertEquals(nextRun?.getUTCDate(), 18);
});

test("W Modifier: '20W' on a Sunday should run on Monday the 21st", function () {
  // July 20, 2025 is a Sunday
  const scheduler = new Cron("0 0 0 20W 7 *", { timezone: "Etc/UTC" });
  const nextRun = scheduler.nextRun("2025-07-01T00:00:00Z");
  assertEquals(nextRun?.getUTCDate(), 21);
});

test("W Modifier: '1W' on a Saturday should run on Monday the 3rd", function () {
  // August 2, 2025 is a Saturday, but we test for the 1st.
  // June 1, 2025 is a Sunday. The nearest weekday is Monday, June 2nd.
  const scheduler = new Cron("0 0 0 1W 6 *", { timezone: "Etc/UTC" });
  const nextRun = scheduler.nextRun("2025-05-01T00:00:00Z");
  assertEquals(nextRun?.getUTCDate(), 2);
  assertEquals(nextRun?.getUTCMonth(), 5); // June
});

test("W Modifier: '31W' on a Sunday should run on Friday the 29th", function () {
  // August 31, 2025 is a Sunday. The nearest weekday is Friday, August 29th.
  const scheduler = new Cron("0 0 0 31W 8 *", { timezone: "Etc/UTC" });
  const nextRun = scheduler.nextRun("2025-08-01T00:00:00Z");
  assertEquals(nextRun?.getUTCDate(), 29);
});

test("W Modifier: Should throw when used in the minute field", function () {
  assertThrows(
    () => {
      new Cron("0 15W * * * *");
    },
    TypeError,
    "contains illegal characters",
  );
});

test("W Modifier: Should throw when used in the day-of-week field", function () {
  assertThrows(
    () => {
      new Cron("0 0 * * * 2W");
    },
    TypeError,
    "contains illegal characters",
  );
});

test("W Modifier: Should throw when used with a range", function () {
  assertThrows(
    () => {
      new Cron("0 0 0 15W-20 * *");
    },
    TypeError,
    "W is not allowed in a range",
  );
});

// Case-insensitivity tests for modifiers and aliases
test("L modifier in day-of-week field should be case-insensitive (fril)", function () {
  const scheduler = new Cron("0 0 * * fril");
  const nextRun = scheduler.nextRun(new Date("2024-01-01T00:00:00Z"));
  assert(nextRun !== null);
  assertEquals(nextRun.getUTCDay(), 5); // Friday
});

test("L modifier in day-of-week field should be case-insensitive (fri#l)", function () {
  const scheduler = new Cron("0 0 * * fri#l");
  const nextRun = scheduler.nextRun(new Date("2024-01-01T00:00:00Z"));
  assert(nextRun !== null);
  assertEquals(nextRun.getUTCDay(), 5); // Friday
});

test("L modifier in day-of-week field should be case-insensitive (5l)", function () {
  const scheduler = new Cron("0 0 * * 5l");
  const nextRun = scheduler.nextRun(new Date("2024-01-01T00:00:00Z"));
  assert(nextRun !== null);
  assertEquals(nextRun.getUTCDay(), 5); // Friday
});

test("L modifier in day-of-week should produce same results for upper and lower case", function () {
  const upperScheduler = new Cron("0 0 * * FRI#L");
  const lowerScheduler = new Cron("0 0 * * fri#l");
  const startDate = new Date("2024-01-01T00:00:00Z");

  const upperRuns = upperScheduler.nextRuns(5, startDate);
  const lowerRuns = lowerScheduler.nextRuns(5, startDate);

  assertEquals(upperRuns.length, lowerRuns.length);
  for (let i = 0; i < upperRuns.length; i++) {
    assertEquals(upperRuns[i].getTime(), lowerRuns[i].getTime());
  }
});

test("L modifier in day-of-month field should be case-insensitive (l)", function () {
  const scheduler = new Cron("0 0 l * *");
  const nextRun = scheduler.nextRun(new Date("2024-01-01T00:00:00Z"));
  assert(nextRun !== null);
  assertEquals(nextRun.getUTCDate(), 31); // Last day of January
});

test("L modifier in day-of-month should produce same results for upper and lower case", function () {
  const upperScheduler = new Cron("0 0 L * *");
  const lowerScheduler = new Cron("0 0 l * *");
  const startDate = new Date("2024-01-01T00:00:00Z");

  const upperRuns = upperScheduler.nextRuns(5, startDate);
  const lowerRuns = lowerScheduler.nextRuns(5, startDate);

  assertEquals(upperRuns.length, lowerRuns.length);
  for (let i = 0; i < upperRuns.length; i++) {
    assertEquals(upperRuns[i].getTime(), lowerRuns[i].getTime());
  }
});

test("W modifier in day-of-month field should be case-insensitive (15w)", function () {
  // July 15, 2025 is a Tuesday
  const scheduler = new Cron("0 0 0 15w 7 *", { timezone: "Etc/UTC" });
  const nextRun = scheduler.nextRun("2025-07-01T00:00:00Z");
  assert(nextRun !== null);
  assertEquals(nextRun.getUTCDate(), 15);
});

test("W modifier in day-of-month should produce same results for upper and lower case", function () {
  const upperScheduler = new Cron("0 0 0 15W 7 *", { timezone: "Etc/UTC" });
  const lowerScheduler = new Cron("0 0 0 15w 7 *", { timezone: "Etc/UTC" });
  const startDate = "2025-07-01T00:00:00Z";

  const upperRun = upperScheduler.nextRun(startDate);
  const lowerRun = lowerScheduler.nextRun(startDate);

  assert(upperRun !== null);
  assert(lowerRun !== null);
  assertEquals(upperRun.getTime(), lowerRun.getTime());
});

test("LW modifier in day-of-month field should be case-insensitive (lw)", function () {
  const scheduler = new Cron("0 0 lw * *");
  const nextRun = scheduler.nextRun(new Date("2024-01-01T00:00:00Z"));
  assert(nextRun !== null);
  // January 31, 2024 is a Wednesday, so last weekday is the 31st
  assertEquals(nextRun.getUTCDate(), 31);
});

test("LW modifier in day-of-month should produce same results for upper and lower case", function () {
  const upperScheduler = new Cron("0 0 LW * *");
  const lowerScheduler = new Cron("0 0 lw * *");
  const startDate = new Date("2024-01-01T00:00:00Z");

  const upperRuns = upperScheduler.nextRuns(5, startDate);
  const lowerRuns = lowerScheduler.nextRuns(5, startDate);

  assertEquals(upperRuns.length, lowerRuns.length);
  for (let i = 0; i < upperRuns.length; i++) {
    assertEquals(upperRuns[i].getTime(), lowerRuns[i].getTime());
  }
});

test("Mixed case modifiers should work (Lw, lW)", function () {
  const lw = new Cron("0 0 Lw * *");
  const Lw = new Cron("0 0 lW * *");
  const startDate = new Date("2024-01-01T00:00:00Z");

  const lwRun = lw.nextRun(startDate);
  const LwRun = Lw.nextRun(startDate);

  assert(lwRun !== null);
  assert(LwRun !== null);
  assertEquals(lwRun.getTime(), LwRun.getTime());
});
