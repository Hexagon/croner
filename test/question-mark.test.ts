/**
 * Tests for the ? (question mark) character
 *
 * OCPS 1.4: The ? character is non-portable and should behave as an alias for * (wildcard)
 * when supported. It's only meaningful in day-of-month and day-of-week fields.
 *
 * Reference: https://github.com/open-source-cron/ocps/blob/main/increments/OCPS-increment-1.4.md#42--character-definition
 */

import { assert, assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

test("? character: should behave as wildcard in seconds field", function () {
  const cron1 = new Cron("? * * * * *");
  const cron2 = new Cron("* * * * * *");

  const run1 = cron1.nextRun();
  const run2 = cron2.nextRun();

  assert(run1 !== null && run2 !== null, "Both patterns should work");
  assertEquals(run1.getTime(), run2.getTime(), "? should match same as *");
});

test("? character: should behave as wildcard in minutes field", function () {
  const cron1 = new Cron("0 ? * * * *");
  const cron2 = new Cron("0 * * * * *");

  const run1 = cron1.nextRun();
  const run2 = cron2.nextRun();

  assert(run1 !== null && run2 !== null, "Both patterns should work");
  assertEquals(run1.getTime(), run2.getTime(), "? should match same as *");
});

test("? character: should behave as wildcard in hours field", function () {
  const cron1 = new Cron("0 0 ? * * *");
  const cron2 = new Cron("0 0 * * * *");

  const run1 = cron1.nextRun();
  const run2 = cron2.nextRun();

  assert(run1 !== null && run2 !== null, "Both patterns should work");
  assertEquals(run1.getTime(), run2.getTime(), "? should match same as *");
});

test("? character: should behave as wildcard in day-of-month field", function () {
  const cron1 = new Cron("0 0 12 ? * *");
  const cron2 = new Cron("0 0 12 * * *");

  const runs1 = cron1.nextRuns(5);
  const runs2 = cron2.nextRuns(5);

  assertEquals(runs1.length, 5, "Should get 5 runs with ?");
  assertEquals(runs2.length, 5, "Should get 5 runs with *");

  // Verify that ? matches all days (not just one specific day)
  const uniqueDays = new Set(runs1.map((r) => r.getDate()));
  assert(uniqueDays.size > 1, "? should match multiple different days");

  // Verify that ? and * produce the same results
  for (let i = 0; i < 5; i++) {
    assertEquals(
      runs1[i].getTime(),
      runs2[i].getTime(),
      `Run ${i + 1} should match`,
    );
  }
});

test("? character: should behave as wildcard in month field", function () {
  const cron1 = new Cron("0 0 12 1 ? *");
  const cron2 = new Cron("0 0 12 1 * *");

  const runs1 = cron1.nextRuns(5);
  const runs2 = cron2.nextRuns(5);

  assertEquals(runs1.length, 5, "Should get 5 runs with ?");
  assertEquals(runs2.length, 5, "Should get 5 runs with *");

  // Verify that ? matches all months (not just one specific month)
  const uniqueMonths = new Set(runs1.map((r) => r.getMonth()));
  assert(uniqueMonths.size > 1, "? should match multiple different months");

  // Verify that ? and * produce the same results
  for (let i = 0; i < 5; i++) {
    assertEquals(
      runs1[i].getTime(),
      runs2[i].getTime(),
      `Run ${i + 1} should match`,
    );
  }
});

test("? character: should behave as wildcard in day-of-week field", function () {
  const cron1 = new Cron("0 0 12 * * ?");
  const cron2 = new Cron("0 0 12 * * *");

  const runs1 = cron1.nextRuns(10);
  const runs2 = cron2.nextRuns(10);

  assertEquals(runs1.length, 10, "Should get 10 runs with ?");
  assertEquals(runs2.length, 10, "Should get 10 runs with *");

  // Verify that ? matches all days of week (not just one specific day)
  const uniqueDays = new Set(runs1.map((r) => r.getDay()));
  assert(uniqueDays.size > 1, "? should match multiple different weekdays");

  // Verify that ? and * produce the same results
  for (let i = 0; i < 10; i++) {
    assertEquals(
      runs1[i].getTime(),
      runs2[i].getTime(),
      `Run ${i + 1} should match`,
    );
  }
});

test("? character: should behave as wildcard in year field", function () {
  const cron1 = new Cron("0 0 12 1 1 * ?");
  const cron2 = new Cron("0 0 12 1 1 * *");

  const runs1 = cron1.nextRuns(5);
  const runs2 = cron2.nextRuns(5);

  assertEquals(runs1.length, 5, "Should get 5 runs with ?");
  assertEquals(runs2.length, 5, "Should get 5 runs with *");

  // Verify that ? matches all years (not just one specific year)
  const uniqueYears = new Set(runs1.map((r) => r.getFullYear()));
  assert(uniqueYears.size > 1, "? should match multiple different years");

  // Verify that ? and * produce the same results
  for (let i = 0; i < 5; i++) {
    assertEquals(
      runs1[i].getTime(),
      runs2[i].getTime(),
      `Run ${i + 1} should match`,
    );
  }
});

test("? character: should work in all fields simultaneously", function () {
  const cron1 = new Cron("? ? ? ? ? ?");
  const cron2 = new Cron("* * * * * *");

  const run1 = cron1.nextRun();
  const run2 = cron2.nextRun();

  assert(run1 !== null && run2 !== null, "Both patterns should work");
  assertEquals(run1.getTime(), run2.getTime(), "All ? should match same as all *");
});

test("? character: should work with mixed ? and * in same pattern", function () {
  const cron = new Cron("? 30 * * * MON");
  const runs = cron.nextRuns(5);

  assertEquals(runs.length, 5, "Should get 5 runs");

  for (const run of runs) {
    assertEquals(run.getMinutes(), 30, "Minutes should be 30");
    assertEquals(run.getDay(), 1, "Day should be Monday");
  }
});

test("? character: should work with ranges", function () {
  const cron1 = new Cron("0 0 12 1-5 ? *");
  const cron2 = new Cron("0 0 12 1-5 * *");

  const runs1 = cron1.nextRuns(10);
  const runs2 = cron2.nextRuns(10);

  for (let i = 0; i < 10; i++) {
    assertEquals(
      runs1[i].getTime(),
      runs2[i].getTime(),
      `Run ${i + 1} should match`,
    );
  }
});

test("? character: should work with stepping", function () {
  const cron1 = new Cron("0 ?/15 * * * *");
  const cron2 = new Cron("0 */15 * * * *");

  const runs1 = cron1.nextRuns(5);
  const runs2 = cron2.nextRuns(5);

  for (let i = 0; i < 5; i++) {
    assertEquals(
      runs1[i].getTime(),
      runs2[i].getTime(),
      `Run ${i + 1} should match`,
    );
  }
});

test("? character: should work with comma-separated values", function () {
  const cron1 = new Cron("0 ?/15 * * * *");
  const cron2 = new Cron("0 */15 * * * *");

  const runs1 = cron1.nextRuns(5);
  const runs2 = cron2.nextRuns(5);

  for (let i = 0; i < 5; i++) {
    assertEquals(
      runs1[i].getTime(),
      runs2[i].getTime(),
      `Run ${i + 1} should match`,
    );
  }
});

test("? character: multiple ? in same field should work like multiple *", function () {
  // This tests that global replace works correctly
  const cron1 = new Cron("0 0 12 ? * ?");
  const cron2 = new Cron("0 0 12 * * *");

  const runs1 = cron1.nextRuns(5);
  const runs2 = cron2.nextRuns(5);

  for (let i = 0; i < 5; i++) {
    assertEquals(
      runs1[i].getTime(),
      runs2[i].getTime(),
      `Run ${i + 1} should match`,
    );
  }
});

test("? character: should work with + modifier in day-of-week", function () {
  const cron1 = new Cron("0 12 1 * +?");
  const cron2 = new Cron("0 12 1 * +*");

  const runs1 = cron1.nextRuns(3);
  const runs2 = cron2.nextRuns(3);

  // Both should match when 1st is any day of week (which is always true)
  for (let i = 0; i < 3; i++) {
    assertEquals(runs1[i].getDate(), 1, "Should be 1st of month");
    assertEquals(runs2[i].getDate(), 1, "Should be 1st of month");
    assertEquals(
      runs1[i].getTime(),
      runs2[i].getTime(),
      `Run ${i + 1} should match`,
    );
  }
});

test("? character: OCPS 1.4 compliance - should match wildcard behavior exactly", function () {
  // This is the key OCPS 1.4 compliance test
  // ? MUST behave as an alias for * (wildcard)

  const patterns = [
    ["? ? ? ? ? ?", "* * * * * *"],
    ["0 ? * * * *", "0 * * * * *"],
    ["0 0 ? * * *", "0 0 * * * *"],
    ["0 0 0 ? * *", "0 0 0 * * *"],
    ["0 0 0 * ? *", "0 0 0 * * *"],
    ["0 0 0 * * ?", "0 0 0 * * *"],
  ];

  for (const [questionPattern, starPattern] of patterns) {
    const cron1 = new Cron(questionPattern);
    const cron2 = new Cron(starPattern);

    const run1 = cron1.nextRun();
    const run2 = cron2.nextRun();

    assert(
      run1 !== null && run2 !== null,
      `Both patterns should work: ${questionPattern} vs ${starPattern}`,
    );
    assertEquals(
      run1.getTime(),
      run2.getTime(),
      `Pattern ${questionPattern} should match ${starPattern}`,
    );
  }
});
