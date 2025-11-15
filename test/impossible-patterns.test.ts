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
  const cron = new Cron("0 0 0 14W * FRI#L 2026", { dayAndDow: false });
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
