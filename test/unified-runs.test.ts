import { assertEquals } from "@std/assert";
import { Cron } from "../src/croner.ts";
import { test } from "@cross/test";

/**
 * Tests to verify that the unified implementation of nextRuns/previousRuns
 * and findNext/findPrevious work correctly.
 */

test("nextRuns and previousRuns should be symmetric for simple patterns", () => {
  const job = new Cron("*/15 * * * *"); // Every 15 minutes

  const referenceDate = new Date("2024-01-01T12:00:00Z");

  // Get next 5 runs from reference (starts from 12:15, not 12:00)
  const nextRuns = job.nextRuns(5, referenceDate);

  // The first next run should be the last previous run when viewed from a later point
  const laterRef = new Date("2024-01-01T13:30:00Z");
  const previousRuns = job.previousRuns(5, laterRef);

  assertEquals(nextRuns.length, 5);
  assertEquals(previousRuns.length, 5);

  // Check that the times are correct
  assertEquals(nextRuns[0].toISOString(), "2024-01-01T12:15:00.000Z");
  assertEquals(nextRuns[1].toISOString(), "2024-01-01T12:30:00.000Z");
  assertEquals(nextRuns[2].toISOString(), "2024-01-01T12:45:00.000Z");
  assertEquals(nextRuns[3].toISOString(), "2024-01-01T13:00:00.000Z");
  assertEquals(nextRuns[4].toISOString(), "2024-01-01T13:15:00.000Z");

  assertEquals(previousRuns[0].toISOString(), "2024-01-01T13:15:00.000Z");
  assertEquals(previousRuns[1].toISOString(), "2024-01-01T13:00:00.000Z");
  assertEquals(previousRuns[2].toISOString(), "2024-01-01T12:45:00.000Z");
  assertEquals(previousRuns[3].toISOString(), "2024-01-01T12:30:00.000Z");
  assertEquals(previousRuns[4].toISOString(), "2024-01-01T12:15:00.000Z");
});

test("Unified methods handle complex patterns with weekdays correctly", () => {
  // Every Monday, Wednesday, and Friday at 9 AM
  const job = new Cron("0 9 * * 1,3,5");

  const referenceDate = new Date("2024-01-03T12:00:00Z"); // Wednesday

  const nextRuns = job.nextRuns(3, referenceDate);
  assertEquals(nextRuns.length, 3);
  assertEquals(nextRuns[0].toISOString(), "2024-01-05T09:00:00.000Z"); // Friday
  assertEquals(nextRuns[1].toISOString(), "2024-01-08T09:00:00.000Z"); // Monday
  assertEquals(nextRuns[2].toISOString(), "2024-01-10T09:00:00.000Z"); // Wednesday

  const previousRuns = job.previousRuns(3, referenceDate);
  assertEquals(previousRuns.length, 3);
  assertEquals(previousRuns[0].toISOString(), "2024-01-03T09:00:00.000Z"); // Wednesday (same day, earlier)
  assertEquals(previousRuns[1].toISOString(), "2024-01-01T09:00:00.000Z"); // Monday
  assertEquals(previousRuns[2].toISOString(), "2023-12-29T09:00:00.000Z"); // Friday
});

test("Unified methods handle last day of month correctly", () => {
  const job = new Cron("0 0 L * *"); // Last day of every month

  // Test forward from mid-month
  const forwardRef = new Date("2024-01-15T12:00:00Z");
  const nextRuns = job.nextRuns(3, forwardRef);
  assertEquals(nextRuns.length, 3);
  assertEquals(nextRuns[0].toISOString(), "2024-01-31T00:00:00.000Z");
  assertEquals(nextRuns[1].toISOString(), "2024-02-29T00:00:00.000Z"); // Leap year
  assertEquals(nextRuns[2].toISOString(), "2024-03-31T00:00:00.000Z");

  // Test backward from same point
  const previousRuns = job.previousRuns(3, forwardRef);
  assertEquals(previousRuns.length, 3);
  assertEquals(previousRuns[0].toISOString(), "2023-12-31T00:00:00.000Z");
  assertEquals(previousRuns[1].toISOString(), "2023-11-30T00:00:00.000Z");
  assertEquals(previousRuns[2].toISOString(), "2023-10-31T00:00:00.000Z");
});

test("Unified methods handle dayOffset correctly in both directions", () => {
  // Run on 1st of month with 2-day offset
  const job = new Cron("0 0 1 * *", { dayOffset: 2 });

  const referenceDate = new Date("2024-02-15T12:00:00Z");

  const nextRuns = job.nextRuns(3, referenceDate);
  assertEquals(nextRuns.length, 3);
  // Pattern matches 1st, but offset makes it 3rd
  assertEquals(nextRuns[0].toISOString(), "2024-03-03T00:00:00.000Z");
  assertEquals(nextRuns[1].toISOString(), "2024-04-03T00:00:00.000Z");
  assertEquals(nextRuns[2].toISOString(), "2024-05-03T00:00:00.000Z");

  const previousRuns = job.previousRuns(3, referenceDate);
  assertEquals(previousRuns.length, 3);
  assertEquals(previousRuns[0].toISOString(), "2024-02-03T00:00:00.000Z");
  assertEquals(previousRuns[1].toISOString(), "2024-01-03T00:00:00.000Z");
  assertEquals(previousRuns[2].toISOString(), "2023-12-03T00:00:00.000Z");
});

test("Unified methods handle interval option in both directions", () => {
  // Every second with 30-second interval
  const job = new Cron("* * * * * *", { interval: 30 });

  const referenceDate = new Date("2024-01-01T12:00:30Z");

  const nextRuns = job.nextRuns(3, referenceDate);
  assertEquals(nextRuns.length, 3);
  assertEquals(nextRuns[0].toISOString(), "2024-01-01T12:01:00.000Z");
  assertEquals(nextRuns[1].toISOString(), "2024-01-01T12:01:30.000Z");
  assertEquals(nextRuns[2].toISOString(), "2024-01-01T12:02:00.000Z");

  const previousRuns = job.previousRuns(3, referenceDate);
  assertEquals(previousRuns.length, 3);
  assertEquals(previousRuns[0].toISOString(), "2024-01-01T12:00:00.000Z");
  assertEquals(previousRuns[1].toISOString(), "2024-01-01T11:59:30.000Z");
  assertEquals(previousRuns[2].toISOString(), "2024-01-01T11:59:00.000Z");
});

test("Unified methods handle nth weekday patterns", () => {
  // 3rd Thursday of every month
  const job = new Cron("0 10 * * 4#3");

  const referenceDate = new Date("2024-06-15T12:00:00Z");

  const nextRuns = job.nextRuns(3, referenceDate);
  assertEquals(nextRuns.length, 3);
  assertEquals(nextRuns[0].toISOString(), "2024-06-20T10:00:00.000Z"); // 3rd Thursday of June
  assertEquals(nextRuns[1].toISOString(), "2024-07-18T10:00:00.000Z"); // 3rd Thursday of July
  assertEquals(nextRuns[2].toISOString(), "2024-08-15T10:00:00.000Z"); // 3rd Thursday of August

  const previousRuns = job.previousRuns(3, referenceDate);
  assertEquals(previousRuns.length, 3);
  assertEquals(previousRuns[0].toISOString(), "2024-05-16T10:00:00.000Z"); // 3rd Thursday of May
  assertEquals(previousRuns[1].toISOString(), "2024-04-18T10:00:00.000Z"); // 3rd Thursday of April
  assertEquals(previousRuns[2].toISOString(), "2024-03-21T10:00:00.000Z"); // 3rd Thursday of March
});

test("Unified methods handle stepping patterns", () => {
  // Every 6 hours
  const job = new Cron("0 */6 * * *");

  const referenceDate = new Date("2024-01-01T12:00:00Z");

  const nextRuns = job.nextRuns(4, referenceDate);
  assertEquals(nextRuns.length, 4);
  assertEquals(nextRuns[0].toISOString(), "2024-01-01T18:00:00.000Z");
  assertEquals(nextRuns[1].toISOString(), "2024-01-02T00:00:00.000Z");
  assertEquals(nextRuns[2].toISOString(), "2024-01-02T06:00:00.000Z");
  assertEquals(nextRuns[3].toISOString(), "2024-01-02T12:00:00.000Z");

  const previousRuns = job.previousRuns(4, referenceDate);
  assertEquals(previousRuns.length, 4);
  assertEquals(previousRuns[0].toISOString(), "2024-01-01T06:00:00.000Z");
  assertEquals(previousRuns[1].toISOString(), "2024-01-01T00:00:00.000Z");
  assertEquals(previousRuns[2].toISOString(), "2023-12-31T18:00:00.000Z");
  assertEquals(previousRuns[3].toISOString(), "2023-12-31T12:00:00.000Z");
});

test("Unified methods handle month boundaries correctly", () => {
  // Every day at midnight
  const job = new Cron("0 0 * * *");

  // Reference at end of month
  const referenceDate = new Date("2024-01-31T12:00:00Z");

  const nextRuns = job.nextRuns(3, referenceDate);
  assertEquals(nextRuns.length, 3);
  assertEquals(nextRuns[0].toISOString(), "2024-02-01T00:00:00.000Z");
  assertEquals(nextRuns[1].toISOString(), "2024-02-02T00:00:00.000Z");
  assertEquals(nextRuns[2].toISOString(), "2024-02-03T00:00:00.000Z");

  const previousRuns = job.previousRuns(3, referenceDate);
  assertEquals(previousRuns.length, 3);
  assertEquals(previousRuns[0].toISOString(), "2024-01-31T00:00:00.000Z");
  assertEquals(previousRuns[1].toISOString(), "2024-01-30T00:00:00.000Z");
  assertEquals(previousRuns[2].toISOString(), "2024-01-29T00:00:00.000Z");
});

test("Unified methods handle year boundaries correctly", () => {
  // Yearly on New Year's Day
  const job = new Cron("0 0 1 1 *");

  const referenceDate = new Date("2024-06-15T12:00:00Z");

  const nextRuns = job.nextRuns(3, referenceDate);
  assertEquals(nextRuns.length, 3);
  assertEquals(nextRuns[0].toISOString(), "2025-01-01T00:00:00.000Z");
  assertEquals(nextRuns[1].toISOString(), "2026-01-01T00:00:00.000Z");
  assertEquals(nextRuns[2].toISOString(), "2027-01-01T00:00:00.000Z");

  const previousRuns = job.previousRuns(3, referenceDate);
  assertEquals(previousRuns.length, 3);
  assertEquals(previousRuns[0].toISOString(), "2024-01-01T00:00:00.000Z");
  assertEquals(previousRuns[1].toISOString(), "2023-01-01T00:00:00.000Z");
  assertEquals(previousRuns[2].toISOString(), "2022-01-01T00:00:00.000Z");
});
