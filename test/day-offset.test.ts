import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

test("dayOffset should default to 0 if not specified", function () {
  const scheduler = new Cron("0 0 12 * * *");
  const now = new Date("2025-01-15T00:00:00.000Z");
  const next = scheduler.nextRun(now);
  assertEquals(next?.toISOString(), "2025-01-15T12:00:00.000Z");
});

test("dayOffset -1 should schedule one day before pattern match", function () {
  const scheduler = new Cron("0 0 12 * * *", { dayOffset: -1 });
  const now = new Date("2025-01-15T00:00:00.000Z");
  const next = scheduler.nextRun(now);
  // Pattern matches at 2025-01-15T12:00:00.000Z, offset by -1 day = 2025-01-14T12:00:00.000Z
  assertEquals(next?.toISOString(), "2025-01-14T12:00:00.000Z");
});

test("dayOffset +1 should schedule one day after pattern match", function () {
  const scheduler = new Cron("0 0 12 * * *", { dayOffset: 1 });
  const now = new Date("2025-01-15T00:00:00.000Z");
  const next = scheduler.nextRun(now);
  // Pattern matches at 2025-01-15T12:00:00.000Z, offset by +1 day = 2025-01-16T12:00:00.000Z
  assertEquals(next?.toISOString(), "2025-01-16T12:00:00.000Z");
});

test("dayOffset -2 should schedule two days before pattern match", function () {
  const scheduler = new Cron("0 0 12 * * *", { dayOffset: -2 });
  const now = new Date("2025-01-15T00:00:00.000Z");
  const next = scheduler.nextRun(now);
  // Pattern matches at 2025-01-15T12:00:00.000Z, offset by -2 days = 2025-01-13T12:00:00.000Z
  assertEquals(next?.toISOString(), "2025-01-13T12:00:00.000Z");
});

test("dayOffset with first Saturday of month (issue #276 example)", function () {
  // Event on first Saturday at 8 AM
  const scheduler = new Cron("0 8 * * 6#1", { dayOffset: -1, legacyMode: false });
  const now = new Date("2025-01-01T00:00:00.000Z");
  const next = scheduler.nextRun(now);

  // First Saturday of January 2025 is the 4th
  // Pattern matches at 2025-01-04T08:00:00.000Z, offset by -1 day = 2025-01-03T08:00:00.000Z (Friday)
  assertEquals(next?.toISOString(), "2025-01-03T08:00:00.000Z");
  assertEquals(next?.getUTCDay(), 5); // Friday is day 5
});

test("dayOffset should work across month boundaries (backward)", function () {
  const scheduler = new Cron("0 0 12 1 * *", { dayOffset: -1 }); // First day of month at noon
  const now = new Date("2025-01-01T00:00:00.000Z");
  const next = scheduler.nextRun(now);
  // Pattern matches at 2025-01-01T12:00:00.000Z, offset by -1 day = 2024-12-31T12:00:00.000Z
  assertEquals(next?.toISOString(), "2024-12-31T12:00:00.000Z");
});

test("dayOffset should work across month boundaries (forward)", function () {
  const scheduler = new Cron("0 0 12 31 1 *", { dayOffset: 1 }); // January 31st at noon
  const now = new Date("2025-01-01T00:00:00.000Z");
  const next = scheduler.nextRun(now);
  // Pattern matches at 2025-01-31T12:00:00.000Z, offset by +1 day = 2025-02-01T12:00:00.000Z
  assertEquals(next?.toISOString(), "2025-02-01T12:00:00.000Z");
});

test("dayOffset should work across year boundaries (backward)", function () {
  const scheduler = new Cron("0 0 12 1 1 *", { dayOffset: -1 }); // January 1st at noon
  const now = new Date("2025-01-01T00:00:00.000Z");
  const next = scheduler.nextRun(now);
  // Pattern matches at 2025-01-01T12:00:00.000Z, offset by -1 day = 2024-12-31T12:00:00.000Z
  assertEquals(next?.toISOString(), "2024-12-31T12:00:00.000Z");
});

test("dayOffset should work across year boundaries (forward)", function () {
  const scheduler = new Cron("0 0 12 31 12 *", { dayOffset: 1 }); // December 31st at noon
  const now = new Date("2025-12-01T00:00:00.000Z");
  const next = scheduler.nextRun(now);
  // Pattern matches at 2025-12-31T12:00:00.000Z, offset by +1 day = 2026-01-01T12:00:00.000Z
  assertEquals(next?.toISOString(), "2026-01-01T12:00:00.000Z");
});

test("dayOffset with multiple runs should maintain offset", function () {
  const scheduler = new Cron("0 0 12 * * *", { dayOffset: -1 });
  const now = new Date("2025-01-15T00:00:00.000Z");
  const runs = scheduler.nextRuns(3, now);

  assertEquals(runs.length, 3);
  // Pattern matches at noon each day, offset by -1 day
  assertEquals(runs[0]?.toISOString(), "2025-01-14T12:00:00.000Z");
  assertEquals(runs[1]?.toISOString(), "2025-01-15T12:00:00.000Z");
  assertEquals(runs[2]?.toISOString(), "2025-01-16T12:00:00.000Z");
});

test("dayOffset should work with weekly patterns", function () {
  const scheduler = new Cron("0 0 12 * * 1", { dayOffset: -1 }); // Every Monday at noon
  const now = new Date("2025-01-01T00:00:00.000Z"); // Wednesday
  const next = scheduler.nextRun(now);

  // Next Monday is 2025-01-06, offset by -1 day = 2025-01-05 (Sunday)
  assertEquals(next?.toISOString(), "2025-01-05T12:00:00.000Z");
  assertEquals(next?.getUTCDay(), 0); // Sunday is day 0
});

test("dayOffset should work with last day of month", function () {
  const scheduler = new Cron("0 0 12 L * *", { dayOffset: -1 }); // Last day of month at noon
  const now = new Date("2025-01-01T00:00:00.000Z");
  const next = scheduler.nextRun(now);

  // Last day of January is 31st, offset by -1 day = 30th
  assertEquals(next?.toISOString(), "2025-01-30T12:00:00.000Z");
});

test("dayOffset with 0 should not change the schedule", function () {
  const scheduler = new Cron("0 0 12 15 * *", { dayOffset: 0 });
  const now = new Date("2025-01-01T00:00:00.000Z");
  const next = scheduler.nextRun(now);

  assertEquals(next?.toISOString(), "2025-01-15T12:00:00.000Z");
});

test("dayOffset should throw on invalid (NaN) value", function () {
  assertThrows(
    () => {
      new Cron("0 0 12 * * *", { dayOffset: NaN });
    },
    Error,
    "Invalid value passed for dayOffset",
  );
});

test("dayOffset should work with timezone option", function () {
  const scheduler = new Cron("0 0 12 * * *", { dayOffset: -1, timezone: "America/New_York" });
  const now = new Date("2025-01-15T05:00:00.000Z"); // 00:00 EST
  const next = scheduler.nextRun(now);

  // Pattern matches at 2025-01-15 12:00 EST (17:00 UTC), offset by -1 day = 2025-01-14 12:00 EST (17:00 UTC)
  assertEquals(next?.toISOString(), "2025-01-14T17:00:00.000Z");
});

test("dayOffset large positive value should work", function () {
  const scheduler = new Cron("0 0 12 1 * *", { dayOffset: 10 }); // First day of month at noon, offset by 10 days
  const now = new Date("2025-01-01T00:00:00.000Z");
  const next = scheduler.nextRun(now);

  // Pattern matches at 2025-01-01T12:00:00.000Z, offset by +10 days = 2025-01-11T12:00:00.000Z
  assertEquals(next?.toISOString(), "2025-01-11T12:00:00.000Z");
});

test("dayOffset large negative value should work", function () {
  const scheduler = new Cron("0 0 12 15 * *", { dayOffset: -10 }); // 15th of month at noon, offset by -10 days
  const now = new Date("2025-01-01T00:00:00.000Z");
  const next = scheduler.nextRun(now);

  // Pattern matches at 2025-01-15T12:00:00.000Z, offset by -10 days = 2025-01-05T12:00:00.000Z
  assertEquals(next?.toISOString(), "2025-01-05T12:00:00.000Z");
});
