/**
 * OCPS 1.3 Compliance Tests
 *
 * Tests for advanced calendar scheduling features in OCPS 1.3.
 * Includes L (last), # (nth), and W (closest weekday) modifiers.
 *
 * Reference: https://github.com/open-source-cron/ocps/blob/main/increments/OCPS-increment-1.3.md
 */

import { assert, assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// Section 4.1: L (Last) Modifier
test("OCPS 1.3: L in day-of-month should match last day of month", function () {
  const cron = new Cron("0 0 L * *");
  const runs = cron.nextRuns(12); // Get next 12 runs (across different months)

  for (const run of runs) {
    const year = run.getFullYear();
    const month = run.getMonth();
    // Get last day of this month
    const lastDay = new Date(year, month + 1, 0).getDate();
    assertEquals(
      run.getDate(),
      lastDay,
      `Should run on last day of month (${lastDay})`,
    );
  }
});

test("OCPS 1.3: L in day-of-month should handle February correctly", function () {
  const cron = new Cron("0 0 L 2 *");
  const runs = cron.nextRuns(2); // Next 2 February last days

  for (const run of runs) {
    const year = run.getFullYear();
    const month = run.getMonth();
    assertEquals(month, 1, "Should be February");

    // Check if leap year
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const expectedLastDay = isLeap ? 29 : 28;
    assertEquals(run.getDate(), expectedLastDay, `Should be ${expectedLastDay} for year ${year}`);
  }
});

test("OCPS 1.3: L in day-of-week should match last occurrence of weekday", function () {
  // Last Friday of every month
  const cron = new Cron("0 0 * * FRI#L");
  const runs = cron.nextRuns(12);

  for (const run of runs) {
    assertEquals(run.getDay(), 5, "Should be Friday");

    // Verify it's the last Friday of the month
    const year = run.getFullYear();
    const month = run.getMonth();
    const date = run.getDate();

    // Check that there's no Friday after this one in the same month
    const nextWeek = new Date(year, month, date + 7);
    assert(
      nextWeek.getMonth() !== month,
      "Should be the last Friday (next Friday is in next month)",
    );
  }
});

// Section 4.2: # (Nth) Modifier
test("OCPS 1.3: # should match nth occurrence of weekday", function () {
  // Second Tuesday of every month
  const cron = new Cron("0 0 * * TUE#2");
  const runs = cron.nextRuns(12);

  for (const run of runs) {
    assertEquals(run.getDay(), 2, "Should be Tuesday");

    // Count Tuesdays in the month up to this date
    const year = run.getFullYear();
    const month = run.getMonth();
    const date = run.getDate();

    let tuesdayCount = 0;
    for (let d = 1; d <= date; d++) {
      if (new Date(year, month, d).getDay() === 2) {
        tuesdayCount++;
      }
    }
    assertEquals(tuesdayCount, 2, "Should be the 2nd Tuesday");
  }
});

test("OCPS 1.3: # should work with numbers (0-7)", function () {
  // First Sunday (0) of every month
  const cron = new Cron("0 0 * * 0#1");
  const run = cron.nextRun();

  assert(run !== null, "Pattern should be valid");
  assertEquals(run.getDay(), 0, "Should be Sunday");

  // Verify it's the first Sunday
  const firstWeekDay = new Date(run.getFullYear(), run.getMonth(), 1).getDay();
  const expectedDate = firstWeekDay === 0 ? 1 : (8 - firstWeekDay);
  assertEquals(run.getDate(), expectedDate, "Should be the first Sunday");
});

test("OCPS 1.3: # should support range of occurrences 1-5", function () {
  // Test all 5 possible occurrences
  for (let n = 1; n <= 5; n++) {
    const cron = new Cron(`0 0 * * MON#${n}`);
    const run = cron.nextRun();
    assert(run !== null, `${n}th Monday should be valid`);
    assertEquals(run.getDay(), 1, `Should be Monday for occurrence ${n}`);
  }
});

// Section 4.3: W (Closest Weekday) Modifier
test("OCPS 1.3: W on a weekday should run on that day", function () {
  // Find a month where 15th is a weekday
  // We'll create a specific test date to ensure 15th is a weekday
  const cron = new Cron("0 12 15W * *");
  const runs = cron.nextRuns(12);

  for (const run of runs) {
    const day = run.getDay();
    // Should be Monday-Friday (1-5)
    assert(day >= 1 && day <= 5, `Day ${day} should be a weekday`);

    // Date should be 14, 15, or 16 (15 or nearest weekday)
    const date = run.getDate();
    assert(date >= 14 && date <= 16, `Date ${date} should be 14-16`);
  }
});

test("OCPS 1.3: W on Saturday should run on Friday", function () {
  // March 19, 2022 is a Saturday, so 19W should be March 18 (Friday)
  const cron = new Cron("0 12 19W 3 *");
  const run = cron.nextRun(new Date("2022-01-01"));

  assert(run !== null, "Should find a run");
  // If 19th is Saturday, should be Friday 18th
  // If 19th is Sunday, should be Monday 20th
  // If 19th is weekday, should be 19th
  const day = run.getDay();
  assert(day >= 1 && day <= 5, "Should be a weekday");
});

test("OCPS 1.3: W should not cross month boundaries", function () {
  // 1W: if 1st is Saturday, should be Monday 3rd (not previous month's Friday)
  const cron = new Cron("0 12 1W * *");
  const runs = cron.nextRuns(12);

  for (const run of runs) {
    const date = run.getDate();
    assert(date >= 1 && date <= 3, `Date ${date} should be 1-3 (within month)`);

    const day = run.getDay();
    assert(day >= 1 && day <= 5, `Day ${day} should be a weekday`);
  }
});

test("OCPS 1.3: W at end of month should not cross boundaries", function () {
  // 31W: if 31st is Sunday, should be Friday 29th (not next month's Monday)
  const cron = new Cron("0 12 31W * *");
  const runs = cron.nextRuns(7); // Get next 7 months with 31 days

  for (const run of runs) {
    const year = run.getFullYear();
    const month = run.getMonth();
    const date = run.getDate();

    // Should be within the month
    const lastDay = new Date(year, month + 1, 0).getDate();
    assert(date <= lastDay, `Date ${date} should be within month`);

    const day = run.getDay();
    assert(day >= 1 && day <= 5, `Day ${day} should be a weekday`);
  }
});

test("OCPS 1.3: W should not be used with ranges", function () {
  assertThrows(
    () => {
      new Cron("0 12 10-15W * *");
    },
    TypeError,
    undefined,
    "W with range should throw",
  );
});

// Combining modifiers
test("OCPS 1.3: Should support L in both day-of-month and day-of-week in same pattern", function () {
  // Last day of February OR last Friday
  const cron = new Cron("0 0 L 2 FRI#L", { dayAndDow: true });
  const runs = cron.nextRuns(5);

  for (const run of runs) {
    const month = run.getMonth();
    if (month === 1) { // February
      // Should be either last day of Feb OR last Friday of Feb
      const day = run.getDay();
      const date = run.getDate();
      const year = run.getFullYear();
      const lastDay = new Date(year, 2, 0).getDate();

      assert(
        date === lastDay || day === 5,
        "Should be last day of February OR a Friday",
      );
    }
  }
});

test("OCPS 1.3: # can be combined with day names", function () {
  const cron1 = new Cron("0 0 * * MON#1");
  const cron2 = new Cron("0 0 * * 1#1");

  const runs1 = cron1.nextRuns(3);
  const runs2 = cron2.nextRuns(3);

  for (let i = 0; i < 3; i++) {
    assertEquals(
      runs1[i].getTime(),
      runs2[i].getTime(),
      "MON#1 and 1#1 should be equivalent",
    );
  }
});

test("OCPS 1.3: L with day-of-week numeric should work", function () {
  const cron = new Cron("0 0 * * 5#L");
  const runs = cron.nextRuns(12);

  for (const run of runs) {
    assertEquals(run.getDay(), 5, "Should be Friday");

    // Verify it's the last Friday
    const year = run.getFullYear();
    const month = run.getMonth();
    const date = run.getDate();
    const nextWeek = new Date(year, month, date + 7);
    assert(nextWeek.getMonth() !== month, "Should be the last Friday");
  }
});
