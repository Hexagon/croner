/**
 * OCPS 1.2 Compliance Tests
 *
 * Tests for second and year-level precision in OCPS 1.2.
 *
 * Reference: https://github.com/open-source-cron/ocps/blob/main/increments/OCPS-increment-1.2.md
 */

import { assert, assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// Section 4.1: Optional Second-Level Precision
test("OCPS 1.2: 6-field pattern with seconds should work", function () {
  const cron = new Cron("30 0 0 * * *");
  const next = cron.nextRun();
  assert(next !== null, "6-field pattern should be valid");
  assertEquals(next.getSeconds(), 30, "Should run at 30 seconds");
});

test("OCPS 1.2: 5-field pattern should default seconds to 0", function () {
  const cron = new Cron("0 0 * * *");
  const next = cron.nextRun();
  assert(next !== null, "5-field pattern should work");
  assertEquals(next.getSeconds(), 0, "Should default to 0 seconds");
});

test("OCPS 1.2: Seconds field should support all special characters", function () {
  // Wildcard
  const cron1 = new Cron("* * * * * *");
  assert(cron1.nextRun() !== null, "Wildcard in seconds should work");

  // Range
  const cron2 = new Cron("0-30 * * * * *");
  const next2 = cron2.nextRun();
  assert(next2 !== null, "Range in seconds should work");
  const seconds2 = next2.getSeconds();
  assert(seconds2 >= 0 && seconds2 <= 30, "Seconds should be in range 0-30");

  // List
  const cron3 = new Cron("0,15,30,45 * * * * *");
  const runs3 = cron3.nextRuns(4);
  assertEquals(runs3.length, 4, "List in seconds should work");

  // Step
  const cron4 = new Cron("*/15 * * * * *");
  assert(cron4.nextRun() !== null, "Step in seconds should work");
});

test("OCPS 1.2: Predefined schedules should default to 0 seconds", function () {
  const cron = new Cron("@hourly");
  const next = cron.nextRun();
  assert(next !== null, "Predefined schedule should work");
  assertEquals(next.getSeconds(), 0, "Predefined schedule should default to 0 seconds");
});

// Section 4.2: Optional Year-Level Precision
test("OCPS 1.2: 7-field pattern with year should work", function () {
  const currentYear = new Date().getFullYear();
  const targetYear = currentYear + 1;
  const cron = new Cron(`0 0 0 1 1 * ${targetYear}`);
  const next = cron.nextRun();
  assert(next !== null, "7-field pattern should be valid");
  assertEquals(next.getFullYear(), targetYear, `Should run in ${targetYear}`);
});

test("OCPS 1.2: 6-field pattern should match all years (year defaults to *)", function () {
  const cron = new Cron("0 0 0 1 1 *");
  const runs = cron.nextRuns(3);
  assertEquals(runs.length, 3, "Should return runs across multiple years if needed");
  // Just verify we get valid runs - they may be in the same or different years
  for (const run of runs) {
    assert(run.getFullYear() > 0, "Should have valid year");
  }
});

test("OCPS 1.2: Year field should support ranges", function () {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear + 1;
  const endYear = currentYear + 3;
  const cron = new Cron(`0 0 0 1 1 * ${startYear}-${endYear}`);
  const runs = cron.nextRuns(3);

  for (const run of runs) {
    const year = run.getFullYear();
    assert(
      year >= startYear && year <= endYear,
      `Year ${year} should be in range ${startYear}-${endYear}`,
    );
  }
});

test("OCPS 1.2: Year field should support lists", function () {
  const currentYear = new Date().getFullYear();
  const year1 = currentYear + 1;
  const year2 = currentYear + 3;
  const cron = new Cron(`0 0 0 1 1 * ${year1},${year2}`);
  const runs = cron.nextRuns(2);

  assertEquals(runs[0].getFullYear(), year1, `First run should be in ${year1}`);
  assertEquals(runs[1].getFullYear(), year2, `Second run should be in ${year2}`);
});

test("OCPS 1.2: Year field should support steps", function () {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear;
  const endYear = currentYear + 10;
  const cron = new Cron(`0 0 0 1 1 * ${startYear}-${endYear}/2`);
  const runs = cron.nextRuns(3);

  // Should run every 2 years
  for (let i = 1; i < runs.length; i++) {
    const yearDiff = runs[i].getFullYear() - runs[i - 1].getFullYear();
    assertEquals(yearDiff, 2, "Should run every 2 years");
  }
});

test("OCPS 1.2: Year field should support wildcards", function () {
  const cron = new Cron("0 0 0 1 1 * *");
  const runs = cron.nextRuns(3);
  assertEquals(runs.length, 3, "Wildcard year should match all years");
  // Should get runs in consecutive years (or same year if we're before Jan 1)
  assert(runs[0].getFullYear() > 0, "Should have valid year");
});

// Combining seconds and year
test("OCPS 1.2: Should support both seconds and year fields", function () {
  const currentYear = new Date().getFullYear();
  const targetYear = currentYear + 1;
  const cron = new Cron(`30 0 0 1 1 * ${targetYear}`);
  const next = cron.nextRun();

  assert(next !== null, "Pattern with both seconds and year should work");
  assertEquals(next.getSeconds(), 30, "Should run at 30 seconds");
  assertEquals(next.getFullYear(), targetYear, `Should run in ${targetYear}`);
  assertEquals(next.getMonth(), 0, "Should run in January");
  assertEquals(next.getDate(), 1, "Should run on 1st");
});

// Edge cases
test("OCPS 1.2: Year field boundary - year 1 should be supported", function () {
  // OCPS 1.4 recommends supporting years 1-9999
  // This pattern would never match in practice (year 1 is in the past)
  // but it should parse correctly
  const cron = new Cron("0 0 0 1 1 * 1");
  assert(cron !== null, "Year 1 should be accepted");
  // nextRun will return null as year 1 is in the past
  const next = cron.nextRun();
  assertEquals(next, null, "Year 1 is in the past, should return null");
});

test("OCPS 1.2: Year field boundary - year 9999 should be supported", function () {
  const cron = new Cron("0 0 0 1 1 * 9999");
  assert(cron !== null, "Year 9999 should be accepted");
  const next = cron.nextRun();
  assert(next !== null, "Year 9999 should be in the future");
  assertEquals(next.getFullYear(), 9999, "Should run in year 9999");
});

test("OCPS 1.2: Very distant future year should work", function () {
  const cron = new Cron("0 0 0 1 1 * 5000");
  const next = cron.nextRun();
  assert(next !== null, "Future year should work");
  assertEquals(next.getFullYear(), 5000, "Should run in year 5000");
});
