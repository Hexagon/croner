/**
 * Edge Case Tests for Croner 10.0.0
 *
 * Tests for edge cases and potential bugs identified during
 * proactive testing of the upcoming 10.0.0 release.
 */

import { assert, assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

/**
 * W modifier with non-existent days now correctly skips months where the day doesn't exist
 *
 * The OCPS 1.3 spec doesn't explicitly define behavior when W is used with a day
 * that doesn't exist in a month (e.g., 29W in non-leap February, 31W in April).
 *
 * The implementation now follows option #1: Skip months where the day doesn't exist.
 * This is the most predictable and consistent behavior.
 *
 * For example, 29W in February will only match in leap years when Feb 29 exists.
 * Similarly, 31W will skip months with only 30 days (Apr, Jun, Sep, Nov) and February.
 */
test("W modifier with non-existent day skips months correctly", function () {
  // February 2025 has only 28 days (not a leap year)
  const cron = new Cron("0 0 29W 2 *");

  const run = cron.nextRun(new Date("2025-02-01"));

  // Should skip to next leap year (2028) where Feb 29 exists
  assertEquals(run?.getFullYear(), 2028);
  assertEquals(run?.getMonth(), 1); // February
  assertEquals(run?.getDate(), 29);
});

test("W modifier with day 30 in February skips all years", function () {
  // February never has 30 days
  const cron = new Cron("0 0 30W 2 *");

  const run = cron.nextRun(new Date("2025-02-01"));

  // Should skip February entirely and look for other months
  // Since the pattern specifies month 2 (February), and Feb never has 30 days,
  // it will keep looking for a February with 30 days (which doesn't exist)
  // This should either return null or find a very distant match
  if (run) {
    // If a run is found, it should not be in February
    assert(run.getMonth() !== 1, "Should not match in February");
  }
});

test("W modifier with day 31 in 30-day month (April) skips that month", function () {
  // April has only 30 days
  const cron = new Cron("0 0 31W 4 *");

  const run = cron.nextRun(new Date("2025-04-01"));

  // Should skip April entirely since day 31 doesn't exist
  // The pattern specifies month 4 (April) with day 31, which doesn't exist in April
  // So it should not match in April
  if (run && run.getMonth() === 3) { // April
    assert(false, "31W should not match in April which only has 30 days");
  }

  // Should skip to next year or return null since April never has 31 days
  assertEquals(run, null);
});

test("W modifier on valid day in month should work correctly", function () {
  // Test that W modifier works correctly when the day exists
  // January 15, 2025 is a Wednesday (already a weekday)
  const cron = new Cron("0 0 15W 1 *");
  const run = cron.nextRun(new Date("2025-01-01"));

  assertEquals(run?.getFullYear(), 2025);
  assertEquals(run?.getMonth(), 0); // January
  assertEquals(run?.getDate(), 15);
});

test("W modifier on Saturday should move to Friday", function () {
  // January 18, 2025 is a Saturday
  // 18W should match Friday, January 17
  const cron = new Cron("0 0 18W 1 *");
  const run = cron.nextRun(new Date("2025-01-01"));

  assertEquals(run?.getFullYear(), 2025);
  assertEquals(run?.getMonth(), 0);
  assertEquals(run?.getDate(), 17); // Friday before Saturday
});

test("W modifier on Sunday should move to Monday", function () {
  // January 19, 2025 is a Sunday
  // 19W should match Monday, January 20
  const cron = new Cron("0 0 19W 1 *");
  const run = cron.nextRun(new Date("2025-01-01"));

  assertEquals(run?.getFullYear(), 2025);
  assertEquals(run?.getMonth(), 0);
  assertEquals(run?.getDate(), 20); // Monday after Sunday
});

test("W modifier on 1st (if Sunday) should move forward to Monday", function () {
  // Find a month where the 1st is a Sunday
  // June 1, 2025 is a Sunday
  const cron = new Cron("0 0 1W 6 *");
  const run = cron.nextRun(new Date("2025-06-01T00:00:01")); // Start after midnight on June 1

  assertEquals(run?.getFullYear(), 2025);
  assertEquals(run?.getMonth(), 5); // June
  assertEquals(run?.getDate(), 2); // Monday
});

test("W modifier on last day of month (if Sunday) should move back to Friday", function () {
  // March 31, 2025 is a Monday (already weekday)
  // But let's test a month where last day is Sunday
  // Find such a month - August 31, 2025 is a Sunday
  const cron = new Cron("0 0 31W 8 *");
  const run = cron.nextRun(new Date("2025-08-01"));

  assertEquals(run?.getFullYear(), 2025);
  assertEquals(run?.getMonth(), 7); // August
  assertEquals(run?.getDate(), 29); // Friday before Sunday
});

test("Multiple W modifiers in same pattern should work", function () {
  // Test pattern with multiple W modifiers
  const cron = new Cron("0 0 1W,15W 1 *");
  // Start from Dec 31, 2024 so it can match Jan 1, 2025
  const runs = cron.nextRuns(2, new Date("2024-12-31"));

  // January 1, 2025 is Wednesday (weekday), so 1W = Jan 1
  // January 15, 2025 is Wednesday (weekday), so 15W = Jan 15
  assertEquals(runs[0]?.getDate(), 1);
  assertEquals(runs[1]?.getDate(), 15);
});

test("W modifier with leap year February 29 should work", function () {
  // 2024 is a leap year, February has 29 days
  // February 29, 2024 is a Thursday (weekday)
  const cron = new Cron("0 0 29W 2 *");
  const run = cron.nextRun(new Date("2024-02-01"));

  assertEquals(run?.getFullYear(), 2024);
  assertEquals(run?.getMonth(), 1);
  assertEquals(run?.getDate(), 29);
});

/**
 * L modifier (last occurrence) with comma-separated weekdays
 *
 * The L modifier should match only the last occurrence of each specified weekday
 * in the month. For example, MONL,FRIL should match only the last Monday and
 * last Friday of each month.
 */
test("L modifier with comma-separated weekdays should match only last occurrences", function () {
  const cron = new Cron("0 0 * * MONL,FRIL");

  // January 2025: Last Monday is Jan 27, Last Friday is Jan 31
  const runs = cron.nextRuns(5, new Date("2025-01-01"));

  // Count how many are in January
  const januaryRuns = runs.filter((r) => r.getMonth() === 0);

  // Should be exactly 2 (last Mon and last Fri of Jan)
  assertEquals(januaryRuns.length, 2);
  assertEquals(januaryRuns[0].getDate(), 27); // Last Monday
  assertEquals(januaryRuns[1].getDate(), 31); // Last Friday
});

test("Single L modifier should work correctly", function () {
  // Test that a single FRIL works as expected
  const cron = new Cron("0 0 * * FRIL");

  const runs = cron.nextRuns(3, new Date("2025-01-01"));

  // In January 2025, there are 5 Fridays: 3, 10, 17, 24, 31
  // Only the last one (31st) should match with FRIL

  const januaryRuns = runs.filter((r) => r.getMonth() === 0);

  // Should match only the last Friday
  assertEquals(januaryRuns.length, 1); // Should match only last Friday
  assertEquals(januaryRuns[0].getDate(), 31); // Should be the 31st
});

/**
 * L modifier in range (MON-FRIL) behavior
 *
 * When using L in a range like "MON-FRIL", after the fix, the pattern parses
 * "FRIL" → "5L" → extracts "L" → range becomes "1-5" with L modifier.
 * The behavior is now more consistent but may not be the intended use case.
 *
 * This test documents the current behavior after the L fix.
 */
test("L modifier in range has defined behavior after fix", function () {
  // After fix, MON-FRIL is parsed and works consistently
  const cron = new Cron("0 0 * * MON-FRIL");
  const runs = cron.nextRuns(10, new Date("2025-01-01"));

  // Pattern now consistently matches Mon-Fri of the last week(s) in month
  // All matched days should be Mon-Fri (1-5)
  for (const run of runs) {
    const day = run.getDay();
    assert(day >= 1 && day <= 5, `Day ${day} should be Mon-Fri`);
  }
});

/**
 * LW modifier tests (Last Weekday of the month)
 *
 * LW in the day-of-month field means "last weekday (Mon-Fri) of the month"
 * If the last day of the month falls on a weekend, it moves back to Friday.
 */
test("LW modifier should match last weekday of each month", function () {
  const cron = new Cron("0 0 LW * *");
  const runs = cron.nextRuns(12, new Date("2025-01-01"));

  // Expected last weekdays for 2025
  const expected = [
    { month: 0, day: 31 }, // Jan 31 (Fri)
    { month: 1, day: 28 }, // Feb 28 (Fri)
    { month: 2, day: 31 }, // Mar 31 (Mon)
    { month: 3, day: 30 }, // Apr 30 (Wed)
    { month: 4, day: 30 }, // May 30 (Fri) - May 31 is Sat
    { month: 5, day: 30 }, // Jun 30 (Mon)
    { month: 6, day: 31 }, // Jul 31 (Thu)
    { month: 7, day: 29 }, // Aug 29 (Fri) - Aug 31 is Sun
    { month: 8, day: 30 }, // Sep 30 (Tue)
    { month: 9, day: 31 }, // Oct 31 (Fri)
    { month: 10, day: 28 }, // Nov 28 (Fri) - Nov 30 is Sun
    { month: 11, day: 31 }, // Dec 31 (Wed)
  ];

  for (let i = 0; i < expected.length; i++) {
    assertEquals(runs[i].getMonth(), expected[i].month);
    assertEquals(runs[i].getDate(), expected[i].day);

    // Verify it's actually a weekday
    const dow = runs[i].getDay();
    assert(dow >= 1 && dow <= 5, `Day ${runs[i].getDate()} should be a weekday, got ${dow}`);
  }
});

test("LW modifier should work across leap years", function () {
  // Test Feb LW in leap year
  const cron = new Cron("0 0 LW 2 *");

  // 2024 is a leap year, Feb 29 is Thu
  const run2024 = cron.nextRun(new Date("2024-02-01"));
  assertEquals(run2024?.getFullYear(), 2024);
  assertEquals(run2024?.getMonth(), 1);
  assertEquals(run2024?.getDate(), 29); // Feb 29 is Thu (weekday)

  // 2025 is not a leap year, Feb 28 is Fri
  const run2025 = cron.nextRun(new Date("2025-02-01"));
  assertEquals(run2025?.getFullYear(), 2025);
  assertEquals(run2025?.getMonth(), 1);
  assertEquals(run2025?.getDate(), 28); // Feb 28 is Fri (weekday)
});

test("LW modifier should handle months ending on Saturday", function () {
  // May 2025: last day is May 31 (Sat), so LW should be May 30 (Fri)
  const cron = new Cron("0 0 LW 5 *");
  const run = cron.nextRun(new Date("2025-05-01"));

  assertEquals(run?.getFullYear(), 2025);
  assertEquals(run?.getMonth(), 4); // May
  assertEquals(run?.getDate(), 30); // Friday
  assertEquals(run?.getDay(), 5); // Friday
});

test("LW modifier should handle months ending on Sunday", function () {
  // August 2025: last day is Aug 31 (Sun), so LW should be Aug 29 (Fri)
  const cron = new Cron("0 0 LW 8 *");
  const run = cron.nextRun(new Date("2025-08-01"));

  assertEquals(run?.getFullYear(), 2025);
  assertEquals(run?.getMonth(), 7); // August
  assertEquals(run?.getDate(), 29); // Friday
  assertEquals(run?.getDay(), 5); // Friday
});

/**
 * Test that 31W properly skips months without 31 days
 */
test("31W should skip months without 31 days", function () {
  const cron = new Cron("0 0 31W * *");
  const runs = cron.nextRuns(24, new Date("2025-01-01"));

  // Months with 31 days: Jan(0), Mar(2), May(4), Jul(6), Aug(7), Oct(9), Dec(11)
  const monthsWith31Days = [0, 2, 4, 6, 7, 9, 11];

  for (const run of runs) {
    const month = run.getMonth();
    assert(
      monthsWith31Days.includes(month),
      `31W should only match in months with 31 days, got month ${month}`,
    );

    // Also verify the matched day is a weekday
    const dow = run.getDay();
    assert(dow >= 1 && dow <= 5, `Matched day should be a weekday, got ${dow}`);
  }
});

test("31W in a specific 30-day month should not match", function () {
  // April only has 30 days
  const cron = new Cron("0 0 31W 4 *");
  const run = cron.nextRun(new Date("2025-04-01"));

  // Should not match in April since it doesn't have 31 days
  assertEquals(run, null);
});

test("31W in a specific 31-day month should match", function () {
  // January has 31 days
  const cron = new Cron("0 0 31W 1 *");
  const run = cron.nextRun(new Date("2025-01-01"));

  assertEquals(run?.getMonth(), 0); // January
  // Jan 31, 2025 is Friday, so 31W matches Jan 31
  assertEquals(run?.getDate(), 31);
});

test("29W in February should only match leap years", function () {
  const cron = new Cron("0 0 29W 2 *");

  // 2025 is not a leap year, should skip to 2028
  const run1 = cron.nextRun(new Date("2025-02-01"));
  assertEquals(run1?.getFullYear(), 2028);
  assertEquals(run1?.getMonth(), 1); // February
  assertEquals(run1?.getDate(), 29);

  // 2024 is a leap year, should match 2024
  const run2 = cron.nextRun(new Date("2024-02-01"));
  assertEquals(run2?.getFullYear(), 2024);
  assertEquals(run2?.getMonth(), 1); // February
  assertEquals(run2?.getDate(), 29);
});
