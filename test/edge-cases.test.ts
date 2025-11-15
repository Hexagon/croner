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
 * Issue: W modifier with non-existent days uses JavaScript Date overflow
 *
 * The OCPS 1.3 spec doesn't explicitly define behavior when W is used with a day
 * that doesn't exist in a month (e.g., 29W in non-leap February, 31W in April).
 *
 * Two interpretations are possible:
 * 1. Skip months where the day doesn't exist
 * 2. Apply W to the last valid day of that month (e.g., 31W in April → 30W)
 *
 * The current implementation attempts #2, but uses JavaScript's Date constructor
 * which overflows to the next month, causing unpredictable weekday calculations.
 *
 * For example, new Date(2025, 1, 29) becomes March 1, 2025, and the W logic
 * uses March 1's weekday to calculate, returning Feb 28 incorrectly.
 *
 * This test documents the current behavior caused by Date overflow.
 */
test("W modifier with non-existent day causes Date overflow behavior", function () {
  // February 2025 has only 28 days (not a leap year)
  const cron = new Cron("0 0 29W 2 *");

  const run = cron.nextRun(new Date("2025-02-01"));

  // Current behavior: Date(2025, 1, 29) overflows to March 1 (Saturday)
  // W logic sees Saturday, goes back to Friday → returns Feb 28
  // This happens because getNearestWeekday doesn't check if day 29 exists
  assertEquals(run?.getFullYear(), 2025);
  assertEquals(run?.getMonth(), 1); // February
  assertEquals(run?.getDate(), 28);

  // Possible fixes:
  // Option 1: Skip to next leap year (Feb 29, 2028)
  // Option 2: Treat 29W in Feb as "last valid day W" (28W in non-leap years)
  // Option 3: Check day validity in getNearestWeekday() before Date construction
});

test("W modifier with day 30 in February - Date overflow behavior", function () {
  // February never has 30 days
  const cron = new Cron("0 0 30W 2 *");

  const run = cron.nextRun(new Date("2025-02-01"));

  // Due to Date overflow: Date(2025, 1, 30) → March 2
  // The W logic will look far ahead for when this would be a weekday match
  if (run) {
    console.log(`30W in February matched: ${run.toISOString()}`);
  }

  // Since Feb 30 never exists, the Date overflow behavior is unpredictable
  // Implementation could either skip February entirely or define consistent behavior
});

test("W modifier with day 31 in 30-day month (April) - interpretation question", function () {
  // April has only 30 days
  // Two interpretations: (1) skip April, or (2) treat as 30W
  const cron = new Cron("0 0 31W 4 *");

  const run = cron.nextRun(new Date("2025-04-01"));

  // Current behavior: Date(2025, 3, 31) overflows to May 1
  // The W logic then operates on May 1's weekday, but constrained to April
  // Result: matches April 30 (which could be considered "31W" = "last day W")
  if (run && run.getMonth() === 3) { // April
    assertEquals(run.getDate(), 30);
    console.log(`31W in April matched day ${run.getDate()}`);
  }

  // This behavior could be intentional: "31W" = "nearest weekday to 31st",
  // which in a 30-day month means "nearest weekday to day 30"
  // However, Date overflow makes this logic inconsistent and unpredictable
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
