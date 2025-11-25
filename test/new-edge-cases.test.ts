/**
 * Additional Edge Case Tests for Croner
 *
 * These tests document edge cases and unusual patterns that users might encounter.
 * Some document expected behavior, others test boundary conditions.
 */

import { assert, assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

/**
 * Year field edge cases
 */
test("Year stepping with range should work correctly", function () {
  // Pattern: run on Jan 1 at midnight for years 2024, 2026, 2028, 2030
  const cron = new Cron("0 0 0 1 1 * 2024-2030/2");
  const runs = cron.nextRuns(4, "2023-12-31T00:00:00Z");

  assertEquals(runs[0]?.getFullYear(), 2024);
  assertEquals(runs[1]?.getFullYear(), 2026);
  assertEquals(runs[2]?.getFullYear(), 2028);
  assertEquals(runs[3]?.getFullYear(), 2030);
});

test("Comma-separated years should work correctly", function () {
  const cron = new Cron("0 0 0 1 1 * 2024,2026,2028");
  const runs = cron.nextRuns(3, "2023-12-31T00:00:00Z");

  assertEquals(runs[0]?.getFullYear(), 2024);
  assertEquals(runs[1]?.getFullYear(), 2026);
  assertEquals(runs[2]?.getFullYear(), 2028);
});

test("*/2 year stepping should throw (starts from 0 which is invalid)", function () {
  assertThrows(() => {
    new Cron("0 0 0 1 1 * */2");
  });
});

test("Year range 1-9999/2 should work for odd years", function () {
  const cron = new Cron("0 0 0 1 1 * 1-9999/2");
  const runs = cron.nextRuns(3, "2024-01-01T00:00:01Z");

  // Should get odd years: 2025, 2027, 2029
  assertEquals(runs[0]?.getFullYear(), 2025);
  assertEquals(runs[1]?.getFullYear(), 2027);
  assertEquals(runs[2]?.getFullYear(), 2029);
});

/**
 * Nth weekday edge cases
 */
test("5th weekday should find months with 5 occurrences", function () {
  const cron = new Cron("0 0 * * MON#5");
  const runs = cron.nextRuns(3, "2024-01-01T00:00:00Z");

  // Verify each result is actually the 5th Monday
  for (const run of runs) {
    let count = 0;
    const month = run.getMonth();
    const year = run.getFullYear();
    for (let d = 1; d <= run.getDate(); d++) {
      if (new Date(year, month, d).getDay() === 1) count++;
    }
    assertEquals(count, 5, `Expected 5th Monday but got ${count}th`);
  }
});

test("5th Friday in February requires a leap year ending on Friday", function () {
  const cron = new Cron("0 0 * 2 FRI#5");
  const next = cron.nextRun("2024-01-01T00:00:00Z");

  // Feb 2024 only has 4 Fridays (2, 9, 16, 23), so it should skip to a leap year
  // where Feb 29 is a Friday. Verify dynamically rather than hardcoding the year.
  assert(next !== null, "Should find a 5th Friday in February");
  assertEquals(next.getMonth(), 1, "Should be February");
  assertEquals(next.getDate(), 29, "Should be Feb 29 (leap year)");
  assertEquals(next.getDay(), 5, "Should be Friday");

  // Verify the year is a leap year
  const year = next.getFullYear();
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  assert(isLeapYear, `Year ${year} should be a leap year`);

  // Verify it's actually the 5th Friday
  let fridayCount = 0;
  for (let d = 1; d <= 29; d++) {
    if (new Date(year, 1, d).getDay() === 5) fridayCount++;
  }
  assertEquals(fridayCount, 5, `Expected 5th Friday but got ${fridayCount}th`);
});

/**
 * W modifier edge cases
 */
test("1W when 1st is Saturday should move to Monday the 3rd", function () {
  // March 1, 2025 is a Saturday
  const cron = new Cron("0 0 1W 3 *");
  const next = cron.nextRun("2025-02-01T00:00:00Z");

  assertEquals(next?.getFullYear(), 2025);
  assertEquals(next?.getMonth(), 2); // March
  assertEquals(next?.getDate(), 3); // Monday
});

test("1W when 1st is Sunday should move to Monday the 2nd", function () {
  // June 1, 2025 is a Sunday
  const cron = new Cron("0 0 1W 6 *");
  const next = cron.nextRun("2025-05-01T00:00:00Z");

  assertEquals(next?.getFullYear(), 2025);
  assertEquals(next?.getMonth(), 5); // June
  assertEquals(next?.getDate(), 2); // Monday
});

/**
 * + modifier (AND logic) edge cases
 */
test("Friday the 13th using + modifier", function () {
  const cron = new Cron("0 0 13 * +FRI");
  const runs = cron.nextRuns(3, "2024-01-01T00:00:00Z");

  // All results should be Friday (day 5) and 13th of month
  for (const run of runs) {
    assertEquals(run.getDate(), 13);
    assertEquals(run.getDay(), 5);
  }
});

test("L (last day of month) AND specific weekday using + modifier", function () {
  const cron = new Cron("0 0 L * +FRI"); // Last day of month that is also a Friday
  const runs = cron.nextRuns(3, "2024-01-01T00:00:00Z");

  for (const run of runs) {
    // Verify it's a Friday
    assertEquals(run.getDay(), 5);
    // Verify it's the last day of its month
    const nextDay = new Date(run);
    nextDay.setDate(nextDay.getDate() + 1);
    assert(nextDay.getMonth() !== run.getMonth(), "Should be last day of month");
  }
});

/**
 * Mixed weekday notation edge cases
 */
test("Mixed alpha and numeric weekdays should work", function () {
  const cron = new Cron("0 0 * * MON,3,FRI");
  const runs = cron.nextRuns(6, "2024-01-01T00:00:00Z");

  // Should match Monday (1), Wednesday (3), Friday (5)
  // Jan 1, 2024 is Monday but pattern starts after that, so first match is Wed Jan 3
  const expectedDays = [3, 5, 1, 3, 5, 1]; // Wed, Fri, Mon, Wed, Fri, Mon
  for (let i = 0; i < runs.length; i++) {
    assertEquals(runs[i].getDay(), expectedDays[i]);
  }
});

/**
 * Alternative weekdays (Quartz mode) edge cases
 */
test("Quartz mode: 1 should be Sunday", function () {
  const cron = new Cron("0 0 * * 1", { alternativeWeekdays: true });
  const runs = cron.nextRuns(3, "2024-01-01T00:00:00Z");

  for (const run of runs) {
    assertEquals(run.getDay(), 0); // Sunday in JS = 0
  }
});

test("Quartz mode: 7 should be Saturday", function () {
  const cron = new Cron("0 0 * * 7", { alternativeWeekdays: true });
  const runs = cron.nextRuns(3, "2024-01-01T00:00:00Z");

  for (const run of runs) {
    assertEquals(run.getDay(), 6); // Saturday in JS = 6
  }
});

test("Quartz mode with L modifier should work", function () {
  const cron = new Cron("0 0 * * 6L", { alternativeWeekdays: true }); // Last Friday in Quartz
  const runs = cron.nextRuns(3, "2024-01-01T00:00:00Z");

  for (const run of runs) {
    assertEquals(run.getDay(), 5); // Friday in JS = 5
    // Verify it's the last Friday of the month
    const nextFriday = new Date(run);
    nextFriday.setDate(nextFriday.getDate() + 7);
    assert(nextFriday.getMonth() !== run.getMonth(), "Should be last Friday of month");
  }
});

/**
 * stopAt edge cases
 */
test("stopAt exactly at pattern match time should return null", function () {
  const cron = new Cron("0 0 * * *", {
    stopAt: "2024-01-15T00:00:00Z",
  });
  // Starting just before midnight on Jan 14
  const next = cron.nextRun("2024-01-14T23:59:00Z");

  // The next run would be at 00:00 on Jan 15, but stopAt is also at that time
  // So it should be excluded (stopAt is exclusive)
  assertEquals(next, null);
});

test("stopAt one second after pattern match should include the match", function () {
  const cron = new Cron("0 0 * * *", {
    stopAt: "2024-01-15T00:00:01Z",
  });
  const next = cron.nextRun("2024-01-14T23:59:00Z");

  // The next run at midnight on Jan 15 should be included since stopAt is 1 second later
  assertEquals(next?.toISOString(), "2024-01-15T00:00:00.000Z");
});

/**
 * interval option edge cases
 */
test("Large interval (1 hour = 3600 seconds) should work", function () {
  const cron = new Cron("* * * * * *", { interval: 3600 });
  const runs = cron.nextRuns(3, "2024-01-01T00:00:00Z");

  // Each run should be 1 hour apart
  assertEquals(runs[1].getTime() - runs[0].getTime(), 3600 * 1000);
  assertEquals(runs[2].getTime() - runs[1].getTime(), 3600 * 1000);
});

test("Interval of 1 day (86400 seconds) should work", function () {
  const cron = new Cron("* * * * * *", { interval: 86400 });
  const runs = cron.nextRuns(3, "2024-01-01T00:00:00Z");

  // Each run should be 1 day apart, starting from day after reference
  assertEquals(runs[0].getDate(), 2);
  assertEquals(runs[1].getDate(), 3);
  assertEquals(runs[2].getDate(), 4);
});

/**
 * Pattern validation edge cases
 */
test("Empty pattern should throw", function () {
  assertThrows(() => {
    new Cron("");
  });
});

test("Whitespace-only pattern should throw", function () {
  assertThrows(() => {
    new Cron("   ");
  });
});

/**
 * UTC offset edge cases
 */
test("Maximum valid positive UTC offset (870 minutes = +14:30) should work", function () {
  const cron = new Cron("0 0 12 * * *", { utcOffset: 870 });
  assert(cron.nextRun() !== null);
});

test("Maximum valid negative UTC offset (-870 minutes = -14:30) should work", function () {
  const cron = new Cron("0 0 12 * * *", { utcOffset: -870 });
  assert(cron.nextRun() !== null);
});

test("UTC offset out of bounds (>870) should throw", function () {
  assertThrows(() => {
    new Cron("0 0 12 * * *", { utcOffset: 900 });
  });
});

test("UTC offset out of bounds (<-870) should throw", function () {
  assertThrows(() => {
    new Cron("0 0 12 * * *", { utcOffset: -900 });
  });
});

/**
 * msToNext precision edge cases
 */
test("msToNext should handle milliseconds correctly", function () {
  const cron = new Cron("0 * * * * *"); // Every minute at second 0
  const now = new Date("2024-01-15T12:30:30.500Z");
  const ms = cron.msToNext(now);

  // Next run is at 12:31:00.000, which is 29.5 seconds away
  // Due to rounding, should be close to 29500ms
  assert(ms !== null);
  assertEquals(ms, 29500);
});

/**
 * Starting at exact match time edge cases
 */
test("nextRun when starting at exact pattern match should skip to next occurrence", function () {
  const cron = new Cron("0 0 12 * * *");
  const next = cron.nextRun("2024-01-15T12:00:00Z");

  // Should skip to the next day since we're at exactly the match time
  assertEquals(next?.toISOString(), "2024-01-16T12:00:00.000Z");
});

test("nextRun one second after pattern match should go to next occurrence", function () {
  const cron = new Cron("0 0 12 * * *");
  const next = cron.nextRun("2024-01-15T12:00:01Z");

  assertEquals(next?.toISOString(), "2024-01-16T12:00:00.000Z");
});
