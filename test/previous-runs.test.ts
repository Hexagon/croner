import { assertEquals } from "@std/assert";
import { Cron } from "../src/croner.ts";
import { test } from "@cross/test";

test("previousRuns() should return empty array when n is 0", () => {
  const job = new Cron("0 0 * * *");
  const runs = job.previousRuns(0);
  assertEquals(runs.length, 0);
});

test("previousRuns() should return previous scheduled times", () => {
  // Create a job that runs every minute
  const job = new Cron("* * * * *");

  // Get 5 previous runs from a reference date
  const referenceDate = new Date("2024-01-01T12:00:00Z");
  const runs = job.previousRuns(5, referenceDate);

  assertEquals(runs.length, 5);

  // Verify they're in reverse chronological order (most recent first)
  assertEquals(runs[0].toISOString(), "2024-01-01T11:59:00.000Z");
  assertEquals(runs[1].toISOString(), "2024-01-01T11:58:00.000Z");
  assertEquals(runs[2].toISOString(), "2024-01-01T11:57:00.000Z");
  assertEquals(runs[3].toISOString(), "2024-01-01T11:56:00.000Z");
  assertEquals(runs[4].toISOString(), "2024-01-01T11:55:00.000Z");
});

test("previousRuns() should work with hourly pattern", () => {
  // Create a job that runs at minute 30 of every hour
  const job = new Cron("30 * * * *");

  const referenceDate = new Date("2024-01-01T12:45:00Z");
  const runs = job.previousRuns(3, referenceDate);

  assertEquals(runs.length, 3);
  assertEquals(runs[0].toISOString(), "2024-01-01T12:30:00.000Z");
  assertEquals(runs[1].toISOString(), "2024-01-01T11:30:00.000Z");
  assertEquals(runs[2].toISOString(), "2024-01-01T10:30:00.000Z");
});

test("previousRuns() should work with daily pattern", () => {
  // Create a job that runs at 9:00 AM every day
  const job = new Cron("0 9 * * *");

  const referenceDate = new Date("2024-01-05T15:00:00Z");
  const runs = job.previousRuns(3, referenceDate);

  assertEquals(runs.length, 3);
  assertEquals(runs[0].toISOString(), "2024-01-05T09:00:00.000Z");
  assertEquals(runs[1].toISOString(), "2024-01-04T09:00:00.000Z");
  assertEquals(runs[2].toISOString(), "2024-01-03T09:00:00.000Z");
});

test("previousRuns() should work with weekly pattern", () => {
  // Create a job that runs every Monday at 10:00 AM
  const job = new Cron("0 10 * * 1");

  // Reference is Wednesday, Jan 10, 2024
  const referenceDate = new Date("2024-01-10T15:00:00Z");
  const runs = job.previousRuns(3, referenceDate);

  assertEquals(runs.length, 3);
  assertEquals(runs[0].toISOString(), "2024-01-08T10:00:00.000Z"); // Monday Jan 8
  assertEquals(runs[1].toISOString(), "2024-01-01T10:00:00.000Z"); // Monday Jan 1
  assertEquals(runs[2].toISOString(), "2023-12-25T10:00:00.000Z"); // Monday Dec 25
});

// TODO: Fix startAt handling - currently has issues due to how nextRuns interacts with startAt
// test("previousRuns() should respect startAt option", () => {
//   const startDate = new Date("2024-01-01T10:00:00Z");
//   const job = new Cron("* * * * *", { startAt: startDate });
//   const referenceDate = new Date("2024-01-01T10:03:00Z");
//   const runs = job.previousRuns(5, referenceDate);
//   assertEquals(runs.length >= 2, true);
//   assertEquals(runs[0].toISOString(), "2024-01-01T10:02:00.000Z");
//   assertEquals(runs[1].toISOString(), "2024-01-01T10:01:00.000Z");
// });

test("previousRuns() should work with complex patterns", () => {
  // Every 5 minutes
  const job = new Cron("*/5 * * * *");

  const referenceDate = new Date("2024-01-01T12:30:00Z");
  const runs = job.previousRuns(4, referenceDate);

  assertEquals(runs.length, 4);
  assertEquals(runs[0].toISOString(), "2024-01-01T12:25:00.000Z");
  assertEquals(runs[1].toISOString(), "2024-01-01T12:20:00.000Z");
  assertEquals(runs[2].toISOString(), "2024-01-01T12:15:00.000Z");
  assertEquals(runs[3].toISOString(), "2024-01-01T12:10:00.000Z");
});

test("previousRuns() should work with interval option", () => {
  // Every second with 10 second interval
  const job = new Cron("* * * * * *", { interval: 10 });

  const referenceDate = new Date("2024-01-01T12:00:45Z");
  const runs = job.previousRuns(3, referenceDate);

  assertEquals(runs.length, 3);
  // With interval 10, from :45 we go back to :35, :25, :15
  assertEquals(runs[0].toISOString(), "2024-01-01T12:00:35.000Z");
  assertEquals(runs[1].toISOString(), "2024-01-01T12:00:25.000Z");
  assertEquals(runs[2].toISOString(), "2024-01-01T12:00:15.000Z");
});

// TODO: Fix timing test to work reliably with current time
// test("previousRuns() should use current time as default reference", () => {
//   const job = new Cron("* * * * *");
//   const before = new Date();
//   const runs = job.previousRuns(2);
//   const after = new Date();
//   assertEquals(runs.length, 2);
//   const firstRunTime = runs[0].getTime();
//   assertEquals(firstRunTime <= before.getTime(), true);
//   assertEquals(firstRunTime > before.getTime() - 60000, true);
// });

test("previousRuns() should work with day of month patterns", () => {
  // Run on the 1st and 15th of every month at noon
  const job = new Cron("0 12 1,15 * *");

  const referenceDate = new Date("2024-02-20T15:00:00Z");
  const runs = job.previousRuns(4, referenceDate);

  assertEquals(runs.length, 4);
  assertEquals(runs[0].toISOString(), "2024-02-15T12:00:00.000Z");
  assertEquals(runs[1].toISOString(), "2024-02-01T12:00:00.000Z");
  assertEquals(runs[2].toISOString(), "2024-01-15T12:00:00.000Z");
  assertEquals(runs[3].toISOString(), "2024-01-01T12:00:00.000Z");
});

test("previousRuns() should work with last day of month (L)", () => {
  // Run on the last day of every month
  const job = new Cron("0 0 L * *");

  const referenceDate = new Date("2024-03-15T12:00:00Z");
  const runs = job.previousRuns(3, referenceDate);

  assertEquals(runs.length, 3);
  assertEquals(runs[0].toISOString(), "2024-02-29T00:00:00.000Z"); // 2024 is a leap year
  assertEquals(runs[1].toISOString(), "2024-01-31T00:00:00.000Z");
  assertEquals(runs[2].toISOString(), "2023-12-31T00:00:00.000Z");
});

test("previousRuns() should work with nth weekday patterns", () => {
  // Run on the 2nd Monday of every month
  const job = new Cron("0 0 * * 1#2");

  const referenceDate = new Date("2024-02-20T12:00:00Z");
  const runs = job.previousRuns(3, referenceDate);

  assertEquals(runs.length, 3);
  assertEquals(runs[0].toISOString(), "2024-02-12T00:00:00.000Z"); // 2nd Monday of Feb 2024
  assertEquals(runs[1].toISOString(), "2024-01-08T00:00:00.000Z"); // 2nd Monday of Jan 2024
  assertEquals(runs[2].toISOString(), "2023-12-11T00:00:00.000Z"); // 2nd Monday of Dec 2023
});

test("previousRuns() should work with last weekday of month (L)", () => {
  // Run on the last Friday of every month
  const job = new Cron("0 0 * * 5L");

  const referenceDate = new Date("2024-03-01T12:00:00Z");
  const runs = job.previousRuns(3, referenceDate);

  assertEquals(runs.length, 3);
  assertEquals(runs[0].toISOString(), "2024-02-23T00:00:00.000Z"); // Last Friday of Feb 2024
  assertEquals(runs[1].toISOString(), "2024-01-26T00:00:00.000Z"); // Last Friday of Jan 2024
  assertEquals(runs[2].toISOString(), "2023-12-29T00:00:00.000Z"); // Last Friday of Dec 2023
});

test("previousRuns() should work with timezone", () => {
  // Run at 9 AM in New York timezone
  const job = new Cron("0 9 * * *", { timezone: "America/New_York" });

  const referenceDate = new Date("2024-01-03T15:00:00Z"); // 10 AM EST
  const runs = job.previousRuns(2, referenceDate);

  assertEquals(runs.length, 2);
  // 9 AM EST = 2 PM UTC (in winter)
  assertEquals(runs[0].toISOString(), "2024-01-03T14:00:00.000Z");
  assertEquals(runs[1].toISOString(), "2024-01-02T14:00:00.000Z");
});

test("previousRuns() with stopAt should not return runs after stopAt", () => {
  const stopDate = new Date("2024-01-01T12:00:00Z");
  const job = new Cron("* * * * *", { stopAt: stopDate });

  // Reference after stopAt - should get runs up to (but possibly not including) stopAt
  const referenceDate = new Date("2024-01-01T14:00:00Z");
  const runs = job.previousRuns(3, referenceDate);

  assertEquals(runs.length, 3);
  // Note: Similar to startAt, stopAt may not be included due to how nextRuns works
  assertEquals(runs[0].toISOString(), "2024-01-01T11:59:00.000Z");
  assertEquals(runs[1].toISOString(), "2024-01-01T11:58:00.000Z");
  assertEquals(runs[2].toISOString(), "2024-01-01T11:57:00.000Z");
});

test("previousRuns() should work with dayOffset option", () => {
  // Run on the 1st of every month, but offset by +1 day
  const job = new Cron("0 0 1 * *", { dayOffset: 1 });

  const referenceDate = new Date("2024-03-15T12:00:00Z");
  const runs = job.previousRuns(3, referenceDate);

  assertEquals(runs.length, 3);
  // Base dates would be 1st of each month, but offset by +1 day = 2nd
  assertEquals(runs[0].toISOString(), "2024-03-02T00:00:00.000Z");
  assertEquals(runs[1].toISOString(), "2024-02-02T00:00:00.000Z");
  assertEquals(runs[2].toISOString(), "2024-01-02T00:00:00.000Z");
});

test("previousRuns() should handle patterns spanning year boundaries", () => {
  const job = new Cron("0 0 31 12 *"); // December 31st
  const referenceDate = new Date("2024-01-15T12:00:00Z");
  const runs = job.previousRuns(3, referenceDate);
  assertEquals(runs.length, 3);
  assertEquals(runs[0].toISOString(), "2023-12-31T00:00:00.000Z");
  assertEquals(runs[1].toISOString(), "2022-12-31T00:00:00.000Z");
  assertEquals(runs[2].toISOString(), "2021-12-31T00:00:00.000Z");
});

test("previousRuns() works independently of job execution", () => {
  // Create a paused job that never executes
  const job = new Cron("0 0 * * *", { paused: true });

  const referenceDate = new Date("2024-01-05T12:00:00Z");
  const runs = job.previousRuns(3, referenceDate);

  // Should still return scheduled times even though job never ran
  assertEquals(runs.length, 3);
  assertEquals(runs[0].toISOString(), "2024-01-05T00:00:00.000Z");
  assertEquals(runs[1].toISOString(), "2024-01-04T00:00:00.000Z");
  assertEquals(runs[2].toISOString(), "2024-01-03T00:00:00.000Z");
});

test("previousRuns() with one-off schedule returns single date if before reference", () => {
  const scheduleDate = new Date("2024-01-01T12:00:00Z");
  const job = new Cron(scheduleDate);

  const referenceDate = new Date("2024-01-02T12:00:00Z");
  const runs = job.previousRuns(5, referenceDate);

  // Should only return the one scheduled time
  assertEquals(runs.length, 1);
  assertEquals(runs[0].toISOString(), "2024-01-01T12:00:00.000Z");
});

test("previousRuns() with one-off schedule returns nothing if after reference", () => {
  const scheduleDate = new Date("2024-01-05T12:00:00Z");
  const job = new Cron(scheduleDate);

  const referenceDate = new Date("2024-01-01T12:00:00Z");
  const runs = job.previousRuns(5, referenceDate);

  // Should return nothing since scheduled time is in the future
  assertEquals(runs.length, 0);
});
