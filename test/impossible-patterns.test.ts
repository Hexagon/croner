/**
 * Tests for impossible pattern detection and descriptive error messages
 *
 * Tests that impossible cron patterns are properly detected and provide
 * descriptive error messages instead of returning null silently or throwing
 * unclear errors like "d is not defined".
 */

import { assertEquals, assertExists } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

test("Pattern with year in the past should return null with clear reason", function () {
  // Year 2014 is in the past (current year is 2025)
  const cron = new Cron("* * * * * * 2014");
  const next = cron.nextRun();

  // Should return null as expected
  assertEquals(next, null);

  // Pattern should still be accessible for debugging
  assertExists(cron.getPattern());
});

test("Pattern with conflicting day specifications should return null", function () {
  // 14W (nearest weekday to 14th) combined with FRI#L (last Friday) in 2026
  // This is a highly constrained pattern that may never match
  const cron = new Cron("0 0 0 14W * FRI#L 2026", { domAndDow: true });
  const next = cron.nextRun();

  // Should return null when no match is found
  assertEquals(next, null);
});

test("Pattern with impossible date (Feb 31) should return null", function () {
  // February never has 31 days
  const cron = new Cron("0 0 31 2 *");
  const next = cron.nextRun();

  // Should return null as February 31st doesn't exist
  assertEquals(next, null);
});

test("Pattern with impossible date (April 31) should return null", function () {
  // April only has 30 days
  const cron = new Cron("0 0 31 4 *");
  const next = cron.nextRun();

  // Should return null as April 31st doesn't exist
  assertEquals(next, null);
});

test("Pattern with year range entirely in the past should return null", function () {
  // Years 2010-2015 are all in the past
  const cron = new Cron("0 0 1 1 * * 2010-2015");
  const next = cron.nextRun();

  // Should return null as all years are in the past
  assertEquals(next, null);
});

test("Valid pattern should still work correctly", function () {
  // This should match the next occurrence of 3 AM
  const cron = new Cron("0 3 * * *");
  const next = cron.nextRun();

  // Should return a valid date
  assertExists(next);
  assertEquals(next.getHours(), 3);
  assertEquals(next.getMinutes(), 0);
  assertEquals(next.getSeconds(), 0);
});

test("Pattern with far future year should work within limits", function () {
  // Test with a year in the near future
  const cron = new Cron("0 0 1 1 * * 2030");
  const next = cron.nextRun();

  // Should return a valid date in 2030
  assertExists(next);
  assertEquals(next.getFullYear(), 2030);
});

test("Patterns that can never match return null and empty lists, without throwing", function () {
  const ref = new Date("2026-06-15T12:00:00Z");
  const patterns: [string, { domAndDow?: boolean }][] = [
    ["0 0 30 2 *", {}],
    ["0 0 0 31 4 *", {}],
    ["* 49 2 30W FEB *", {}],
    ["0 0 16 * 5#L", { domAndDow: true }], // The last Friday is never the 16th
    ["0 0 1W * SUN", { domAndDow: true }], // The weekday nearest the 1st is never a Sunday
    ["0 0 1W * +SUN", {}],
  ];
  for (const [pattern, options] of patterns) {
    const cron = new Cron(pattern, { ...options, utcOffset: 0 });
    assertEquals(cron.nextRun(ref), null, pattern);
    assertEquals(cron.nextRuns(3, ref), [], pattern);
    assertEquals(cron.previousRuns(3, ref), [], pattern);
    assertEquals(cron.msToNext(ref), null, pattern);
    assertEquals(cron.enumerate(ref).next().done, true, pattern);
  }
});

test("A job with a pattern that can never match is not running", function () {
  const cron = new Cron("0 0 16 * 5#L", { domAndDow: true }, () => {});
  assertEquals(cron.isRunning(), false);
  cron.stop();
});

test("Matches that are many years apart are still found in both directions", function () {
  // February 29 on a Monday: 2016, 2044
  const cron = new Cron("0 0 0 29 2 MON", { domAndDow: true, utcOffset: 0 });
  assertEquals(
    cron.nextRun(new Date("2016-03-01T00:00:00Z"))?.toISOString(),
    "2044-02-29T00:00:00.000Z",
  );
  assertEquals(
    cron.previousRuns(2, new Date("2044-03-01T00:00:00Z")).map((d) => d.toISOString()),
    ["2044-02-29T00:00:00.000Z", "2016-02-29T00:00:00.000Z"],
  );
});
