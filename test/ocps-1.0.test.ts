/**
 * OCPS 1.0 Compliance Tests
 *
 * Tests for the baseline features of the Open Cron Pattern Specification (OCPS) 1.0.
 * These tests verify that Croner correctly implements the foundational Vixie/ISC cron standard.
 *
 * Reference: https://github.com/open-source-cron/ocps/blob/main/specifications/OCPS-1.0.md
 */

import { assert, assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// Section 4.1: Pattern Format - Five Fields
test("OCPS 1.0: Should accept 5-field pattern", function () {
  const cron = new Cron("0 0 * * *");
  const next = cron.nextRun();
  assert(next !== null, "5-field pattern should be valid");
});

test("OCPS 1.0: Should accept 5-field pattern with leading/trailing whitespace", function () {
  const cron = new Cron("  0 0 * * *  ");
  const next = cron.nextRun();
  assert(next !== null, "Pattern with whitespace should be valid");
});

test("OCPS 1.0: Should accept pattern with multiple consecutive whitespace", function () {
  const cron = new Cron("0  0   *    *     *");
  const next = cron.nextRun();
  assert(next !== null, "Pattern with multiple spaces should be valid");
});

test("OCPS 1.0: Should accept pattern with tab delimiters", function () {
  const cron = new Cron("0\t0\t*\t*\t*");
  const next = cron.nextRun();
  assert(next !== null, "Pattern with tabs should be valid");
});

// Section 4.2: Field Values
test("OCPS 1.0: Should accept valid minute values (0-59)", function () {
  const cron = new Cron("0,30,59 * * * *");
  const next = cron.nextRun();
  assert(next !== null, "Valid minute values should work");
});

test("OCPS 1.0: Should accept valid hour values (0-23)", function () {
  const cron = new Cron("0 0,12,23 * * *");
  const next = cron.nextRun();
  assert(next !== null, "Valid hour values should work");
});

test("OCPS 1.0: Should accept valid day of month values (1-31)", function () {
  const cron = new Cron("0 0 1,15,31 * *");
  const next = cron.nextRun();
  assert(next !== null, "Valid day values should work");
});

test("OCPS 1.0: Should accept valid month values (1-12)", function () {
  const cron = new Cron("0 0 1 1,6,12 *");
  const next = cron.nextRun();
  assert(next !== null, "Valid month values should work");
});

test("OCPS 1.0: Should accept valid day of week values (0-7, where 0 and 7 are Sunday)", function () {
  const cron1 = new Cron("0 0 * * 0");
  const cron2 = new Cron("0 0 * * 7");
  const next1 = cron1.nextRun();
  const next2 = cron2.nextRun();
  assert(next1 !== null && next2 !== null, "Both 0 and 7 should represent Sunday");
  // Both should give the same day of week
  assertEquals(next1?.getDay(), next2?.getDay(), "0 and 7 should represent the same day");
});

// Section 4.2: Month Names
test("OCPS 1.0: Should accept month names (case-insensitive)", function () {
  const cron1 = new Cron("0 0 1 JAN *");
  const cron2 = new Cron("0 0 1 jan *");
  const cron3 = new Cron("0 0 1 DEC *");
  const cron4 = new Cron("0 0 1 dec *");
  assert(cron1.nextRun() !== null, "JAN should work");
  assert(cron2.nextRun() !== null, "jan should work");
  assert(cron3.nextRun() !== null, "DEC should work");
  assert(cron4.nextRun() !== null, "dec should work");
});

test("OCPS 1.0: Should accept day of week names (case-insensitive)", function () {
  const cron1 = new Cron("0 0 * * SUN");
  const cron2 = new Cron("0 0 * * sun");
  const cron3 = new Cron("0 0 * * SAT");
  const cron4 = new Cron("0 0 * * sat");
  assert(cron1.nextRun() !== null, "SUN should work");
  assert(cron2.nextRun() !== null, "sun should work");
  assert(cron3.nextRun() !== null, "SAT should work");
  assert(cron4.nextRun() !== null, "sat should work");
});

// Section 5: Special Characters
test("OCPS 1.0: Wildcard (*) should match all values", function () {
  const cron = new Cron("* * * * *");
  const next = cron.nextRun();
  assert(next !== null, "Wildcard pattern should work");
});

test("OCPS 1.0: List separator (,) should specify multiple values", function () {
  const cron = new Cron("0,15,30,45 * * * *");
  // Use a fixed starting time to ensure deterministic results
  // Start at 10:59 so the next run will be at 11:00 (minute 0)
  const startTime = new Date("2025-01-01T10:59:00Z");
  const runs = cron.nextRuns(4, startTime);
  assertEquals(runs.length, 4, "Should return 4 runs");
  assertEquals(runs[0].getMinutes(), 0, "First should be at minute 0");
  assertEquals(runs[1].getMinutes(), 15, "Second should be at minute 15");
});

test("OCPS 1.0: Range (-) should specify inclusive range", function () {
  const cron = new Cron("0 9-17 * * *");
  const next = cron.nextRun();
  assert(next !== null, "Range pattern should work");
  const hour = next!.getHours();
  assert(hour >= 9 && hour <= 17, "Hour should be in range 9-17");
});

test("OCPS 1.0: Step (/) should specify intervals", function () {
  const cron = new Cron("0 0-20/5 * * *");
  const runs = cron.nextRuns(5);
  assertEquals(runs.length, 5, "Should return 5 runs");
  // Hours should be 0, 5, 10, 15, 20 (within range 0-20 with step 5)
});

// Section 5.1: Combining Special Characters
test("OCPS 1.0: Should combine comma and range", function () {
  const cron = new Cron("0 1-3,10-12 * * *");
  const next = cron.nextRun();
  assert(next !== null, "Combined comma and range should work");
});

test("OCPS 1.0: Should combine range and step", function () {
  const cron = new Cron("0 10-20/2 * * *");
  const next = cron.nextRun();
  assert(next !== null, "Combined range and step should work");
});

// Section 6.1: Logical Combination of Day of Month and Day of Week (OR by default)
test("OCPS 1.0: Day of month and day of week should use OR logic by default (legacy mode)", function () {
  // Pattern: noon on the 1st of the month OR noon on Monday
  const cron = new Cron("0 12 1 * MON", { domAndDow: false });
  const runs = cron.nextRuns(10);

  // Should include both:
  // - 1st of months that aren't Monday
  // - Mondays that aren't the 1st
  // - 1st of months that are Monday

  let has1stNotMonday = false;
  let hasMondayNot1st = false;

  for (const run of runs) {
    const is1st = run.getDate() === 1;
    const isMonday = run.getDay() === 1;

    if (is1st && !isMonday) has1stNotMonday = true;
    if (isMonday && !is1st) hasMondayNot1st = true;
  }

  assert(
    has1stNotMonday || hasMondayNot1st,
    "Should match either day-of-month OR day-of-week (OR logic)",
  );
});

// Section 6.2: Error Handling
test("OCPS 1.0: Should reject out-of-range minute value", function () {
  assertThrows(() => {
    new Cron("60 * * * *");
  });
});

test("OCPS 1.0: Should reject out-of-range hour value", function () {
  assertThrows(() => {
    new Cron("0 24 * * *");
  });
});

test("OCPS 1.0: Should reject out-of-range day of month value", function () {
  assertThrows(() => {
    new Cron("0 0 32 * *");
  });
});

test("OCPS 1.0: Should reject out-of-range month value", function () {
  assertThrows(() => {
    new Cron("0 0 1 13 *");
  });
});

test("OCPS 1.0: Should reject out-of-range day of week value", function () {
  assertThrows(() => {
    new Cron("0 0 * * 8");
  });
});

test("OCPS 1.0: Should reject invalid range (start > end)", function () {
  assertThrows(() => {
    new Cron("0 17-9 * * *");
  });
});

test("OCPS 1.0: Should reject step value of 0", function () {
  assertThrows(() => {
    new Cron("0 */0 * * *");
  });
});

test("OCPS 1.0: Should accept impossible date combinations without parsing error", function () {
  // February 31st is impossible but should parse
  const cron = new Cron("0 0 31 2 *");
  assert(cron !== null, "Impossible date should parse successfully");
  // The iterator should indicate no valid run time
  const next = cron.nextRun();
  assertEquals(next, null, "Should return null for impossible date");
});
