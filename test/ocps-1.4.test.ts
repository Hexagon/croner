/**
 * OCPS 1.4 Compliance Tests
 *
 * Tests for logical and implementation semantics in OCPS 1.4.
 * Includes AND/OR logic, + modifier, ? character, and DST handling.
 *
 * Reference: https://github.com/open-source-cron/ocps/blob/main/increments/OCPS-increment-1.4.md
 */

import { assert, assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// Section 4.1: Logical Combination of Date Fields
test("OCPS 1.4: Default OR logic for day-of-month and day-of-week", function () {
  // Pattern: 1st of month OR Monday
  const cron = new Cron("0 12 1 * MON", { dayAndDow: true });
  const runs = cron.nextRuns(10);

  let has1stNotMonday = false;
  let hasMondayNot1st = false;
  let has1stAndMonday = false;

  for (const run of runs) {
    const is1st = run.getDate() === 1;
    const isMonday = run.getDay() === 1;

    if (is1st && !isMonday) has1stNotMonday = true;
    if (isMonday && !is1st) hasMondayNot1st = true;
    if (is1st && isMonday) has1stAndMonday = true;
  }

  assert(
    has1stNotMonday || hasMondayNot1st,
    "Should match either condition (OR logic)",
  );
});

test("OCPS 1.4: + modifier should enforce AND logic", function () {
  // Pattern: 1st of month AND Monday (only when 1st is a Monday)
  const cron = new Cron("0 12 1 * +MON");
  const runs = cron.nextRuns(5);

  for (const run of runs) {
    assertEquals(run.getDate(), 1, "Should be 1st of month");
    assertEquals(run.getDay(), 1, "Should be Monday");
  }
});

test("OCPS 1.4: + modifier should work with day numbers", function () {
  // Pattern: 15th of month AND Friday
  const cron = new Cron("0 12 15 * +5");
  const runs = cron.nextRuns(5);

  for (const run of runs) {
    assertEquals(run.getDate(), 15, "Should be 15th of month");
    assertEquals(run.getDay(), 5, "Should be Friday");
  }
});

test("OCPS 1.4: + modifier should work with day ranges", function () {
  // Pattern: 1st of month AND Monday-Friday
  const cron = new Cron("0 12 1 * +MON-FRI");
  const runs = cron.nextRuns(5);

  for (const run of runs) {
    assertEquals(run.getDate(), 1, "Should be 1st of month");
    const day = run.getDay();
    assert(day >= 1 && day <= 5, "Should be Monday-Friday");
  }
});

test("OCPS 1.4: + modifier in non-day-of-week field should throw", function () {
  // + modifier is only valid in day-of-week field
  assertThrows(
    () => {
      new Cron("0 +12 * * *");
    },
    TypeError,
    undefined,
    "+ modifier should only work in day-of-week field",
  );
});

test("OCPS 1.4: + without following value should throw", function () {
  assertThrows(
    () => {
      new Cron("0 12 1 * +");
    },
    TypeError,
    undefined,
    "+ must be followed by a value",
  );
});

// Section 4.2: ? Character Definition
test("OCPS 1.4: ? character should work as wildcard alias", function () {
  // ? should behave like *
  const cron1 = new Cron("? ? ? ? ? ?");
  const cron2 = new Cron("* * * * * *");

  const run1 = cron1.nextRun();
  const run2 = cron2.nextRun();

  assert(run1 !== null && run2 !== null, "Both patterns should work");
  // They should produce similar (though not necessarily identical due to timing) results
});

test("OCPS 1.4: ? should work in day-of-month field", function () {
  const cron = new Cron("0 0 ? * *");
  const run = cron.nextRun();
  assert(run !== null, "? in day-of-month should work");
});

test("OCPS 1.4: ? should work in day-of-week field", function () {
  const cron = new Cron("0 0 * * ?");
  const run = cron.nextRun();
  assert(run !== null, "? in day-of-week should work");
});

// Section 4.3.1: DST Transitions
test("OCPS 1.4: DST Gap (Spring Forward) - job should be skipped", function () {
  // In America/New_York, DST begins on March 12, 2023 at 2:00 AM
  // Clock jumps from 2:00 AM to 3:00 AM
  // A job scheduled for 2:30 AM should be adjusted to 3:30 AM
  const cron = new Cron("0 30 2 12 3 *", { timezone: "America/New_York" });

  // Start from before the DST transition
  const startDate = new Date("2023-03-12T00:00:00Z");
  const run = cron.nextRun(startDate);

  assert(run !== null, "Should find a next run");
  // The job should run on March 12, 2023
  assertEquals(run.getFullYear(), 2023, "Should run in 2023");
  assertEquals(run.getMonth(), 2, "Should run in March (month 2)");
  assertEquals(run.getDate(), 12, "Should run on the 12th");

  // The time 2:30 AM doesn't exist, so it should be adjusted to 3:30 AM EDT
  // 3:30 AM EDT = 07:30 UTC
  assertEquals(run.toISOString(), "2023-03-12T07:30:00.000Z", "Should be adjusted to 3:30 AM EDT");
});

test("OCPS 1.4: DST Overlap (Fall Back) - job should run once at first occurrence", function () {
  // In America/New_York, DST ends on November 5, 2023 at 2:00 AM
  // Clock falls back from 2:00 AM to 1:00 AM (1:00-2:00 happens twice)
  // A job scheduled for 1:30 AM should run only at the first occurrence

  const cron = new Cron("0 30 1 5 11 *", { timezone: "America/New_York" });

  // Start from before the DST transition
  const startDate = new Date("2023-11-05T00:00:00-04:00"); // EDT
  const run1 = cron.nextRun(startDate);

  assert(run1 !== null, "Should find first occurrence");

  // The next run after that should be the following year
  const run2 = cron.nextRun(run1);
  if (run2 !== null && run2.getMonth() === 10 && run2.getDate() === 5) {
    assert(
      run2.getFullYear() > run1.getFullYear(),
      "Should not run twice on the same day",
    );
  }
});

// Section 4.3.2: Date and Time Range Limitations
test("OCPS 1.4: Years 1-9999 should be supported", function () {
  // Test year 1 (though it will return null as it's in the past)
  const cron1 = new Cron("0 0 0 1 1 * 1");
  assert(cron1 !== null, "Year 1 should parse successfully");
  assertEquals(cron1.nextRun(), null, "Year 1 is in the past");

  // Test year 9999
  const cron2 = new Cron("0 0 0 1 1 * 9999");
  assert(cron2 !== null, "Year 9999 should parse successfully");
  const run2 = cron2.nextRun();
  assert(run2 !== null, "Year 9999 should be in the future");
  assertEquals(run2.getFullYear(), 9999, "Should match year 9999");
});

test("OCPS 1.4: Year 0 should not be supported", function () {
  assertThrows(
    () => {
      new Cron("0 0 0 1 1 * 0");
    },
    RangeError,
    undefined,
    "Year 0 should not be accepted",
  );
});

test("OCPS 1.4: Year 10000 should not be supported", function () {
  assertThrows(
    () => {
      new Cron("0 0 0 1 1 * 10000");
    },
    RangeError,
    undefined,
    "Year 10000 should not be accepted",
  );
});

test("OCPS 1.4: Pattern that never matches should return null", function () {
  // Impossible pattern: February 31st
  const cron = new Cron("0 0 31 2 *");
  const run = cron.nextRun();
  assertEquals(run, null, "Impossible date should return null");
});

test("OCPS 1.4: Year search should not infinite loop", function () {
  // Pattern that can only match in distant future
  const cron = new Cron("0 0 1 1 * * 9999");
  const start = Date.now();
  const run = cron.nextRun();
  const elapsed = Date.now() - start;

  assert(run !== null, "Should find matching year");
  assert(elapsed < 5000, "Should not take more than 5 seconds");
});

// Combining OCPS 1.4 features
test("OCPS 1.4: Should combine + modifier with # modifier", function () {
  // First Monday of month that is also the 1st (AND logic)
  const cron = new Cron("0 12 1 * +MON#1");
  const runs = cron.nextRuns(3);

  for (const run of runs) {
    assertEquals(run.getDate(), 1, "Should be 1st of month");
    assertEquals(run.getDay(), 1, "Should be Monday");

    // Should also be the first Monday of the month
    const firstOfMonth = new Date(run.getFullYear(), run.getMonth(), 1);
    assertEquals(firstOfMonth.getDay(), 1, "1st of month should be Monday");
  }
});

test("OCPS 1.4: Should combine + modifier with year field", function () {
  const currentYear = new Date().getFullYear();
  const targetYear = currentYear + 1;

  // Pattern: 15th of month AND Friday, in specific year at 12:00:00
  const cron = new Cron(`0 0 12 15 * +FRI ${targetYear}`);
  const runs = cron.nextRuns(5);

  for (const run of runs) {
    assertEquals(run.getDate(), 15, "Should be 15th");
    assertEquals(run.getDay(), 5, "Should be Friday");
    assertEquals(run.getFullYear(), targetYear, `Should be in ${targetYear}`);
  }
});

test("OCPS 1.4: Non-legacy mode should use AND logic without + modifier", function () {
  // Pattern: 1st of month AND Monday (without + modifier, but dayAndDow: false)
  const cron = new Cron("0 12 1 * MON", { dayAndDow: false });
  const runs = cron.nextRuns(5);

  for (const run of runs) {
    assertEquals(run.getDate(), 1, "Should be 1st of month");
    assertEquals(run.getDay(), 1, "Should be Monday");
  }
});
