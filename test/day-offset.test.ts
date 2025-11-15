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

test("dayOffset should work across DST Spring Forward transition (America/New_York)", function () {
  // America/New_York: DST begins March 9, 2025 at 2:00 AM -> 3:00 AM
  // Pattern: Daily at 2:30 AM (which doesn't exist on March 9)
  const scheduler = new Cron("0 30 2 * * *", { dayOffset: -1, timezone: "America/New_York" });

  // Start from March 8, 2025
  const march8 = new Date("2025-03-08T00:00:00Z");
  const runs = scheduler.nextRuns(3, march8);

  // March 8 pattern match at 2:30 AM EST (07:30 UTC), offset -1 day = March 7 at 07:30 UTC
  assertEquals(runs[0]?.toISOString(), "2025-03-07T07:30:00.000Z");

  // March 9 pattern would be at 2:30 AM (skipped, becomes 3:30 AM EDT = 07:30 UTC), offset -1 day = March 8 at 07:30 UTC
  assertEquals(runs[1]?.toISOString(), "2025-03-08T07:30:00.000Z");

  // March 10 pattern at 2:30 AM EDT (06:30 UTC), offset -1 day = March 9 at 06:30 UTC
  assertEquals(runs[2]?.toISOString(), "2025-03-09T06:30:00.000Z");
});

test("dayOffset should work across DST Fall Back transition (America/New_York)", function () {
  // America/New_York: DST ends November 2, 2025 at 2:00 AM -> 1:00 AM
  // Pattern: Daily at 1:30 AM (which occurs twice on November 2)
  const scheduler = new Cron("0 30 1 * * *", { dayOffset: -1, timezone: "America/New_York" });

  // Start from November 1, 2025
  const nov1 = new Date("2025-11-01T00:00:00Z");
  const runs = scheduler.nextRuns(3, nov1);

  // November 1 pattern at 1:30 AM EDT (05:30 UTC), offset -1 day = October 31 at 05:30 UTC
  assertEquals(runs[0]?.toISOString(), "2025-10-31T05:30:00.000Z");

  // November 2 pattern at 1:30 AM (first occurrence: EDT 05:30 UTC), offset -1 day = November 1 at 05:30 UTC
  assertEquals(runs[1]?.toISOString(), "2025-11-01T05:30:00.000Z");

  // November 3 pattern at 1:30 AM EST (06:30 UTC), offset -1 day = November 2 at 06:30 UTC
  assertEquals(runs[2]?.toISOString(), "2025-11-02T06:30:00.000Z");
});

test("dayOffset should work across DST Spring Forward with positive offset", function () {
  // Europe/London: DST begins March 30, 2025 at 1:00 AM GMT -> 2:00 AM BST
  const scheduler = new Cron("0 0 1 * * *", { dayOffset: 1, timezone: "Europe/London" });

  // Start from March 28, 2025
  const march28 = new Date("2025-03-28T00:00:00Z");
  const runs = scheduler.nextRuns(3, march28);

  // March 28 pattern at 1:00 AM GMT (01:00 UTC), offset +1 day = March 29 at 01:00 UTC
  assertEquals(runs[0]?.toISOString(), "2025-03-29T01:00:00.000Z");

  // March 29 pattern at 1:00 AM GMT (01:00 UTC), offset +1 day = March 30 at 01:00 UTC
  // Note: March 30 at 1:00 AM doesn't exist, but we're offsetting the pattern match from March 29
  assertEquals(runs[1]?.toISOString(), "2025-03-30T01:00:00.000Z");

  // March 30 pattern skipped to 2:00 AM BST (01:00 UTC), offset +1 day = March 31 at 01:00 UTC
  assertEquals(runs[2]?.toISOString(), "2025-03-31T01:00:00.000Z");
});

test("dayOffset should work across DST Fall Back with positive offset", function () {
  // Europe/London: DST ends October 26, 2025 at 2:00 AM BST -> 1:00 AM GMT
  const scheduler = new Cron("0 0 1 * * *", { dayOffset: 1, timezone: "Europe/London" });

  // Start from October 24, 2025
  const oct24 = new Date("2025-10-24T00:00:00Z");
  const runs = scheduler.nextRuns(3, oct24);

  // October 25 pattern at 1:00 AM BST (00:00 UTC), offset +1 day = October 26 at 00:00 UTC
  assertEquals(runs[0]?.toISOString(), "2025-10-26T00:00:00.000Z");

  // October 26 pattern at 1:00 AM (first occurrence BST 00:00 UTC), offset +1 day = October 27 at 00:00 UTC
  assertEquals(runs[1]?.toISOString(), "2025-10-27T00:00:00.000Z");

  // October 27 pattern at 1:00 AM GMT (01:00 UTC), offset +1 day = October 28 at 01:00 UTC
  assertEquals(runs[2]?.toISOString(), "2025-10-28T01:00:00.000Z");
});

test("dayOffset multiple days across DST transition", function () {
  // Test a -3 day offset that crosses DST Spring Forward
  // America/Los_Angeles: DST begins March 9, 2025 at 2:00 AM -> 3:00 AM
  const scheduler = new Cron("0 0 15 * * *", { dayOffset: -3, timezone: "America/Los_Angeles" });

  // Start from March 11, 2025
  const march11 = new Date("2025-03-11T00:00:00Z");
  const next = scheduler.nextRun(march11);

  // March 11 pattern at 3:00 PM PDT (22:00 UTC), offset -3 days = March 8 at 22:00 UTC (2:00 PM PST)
  assertEquals(next?.toISOString(), "2025-03-08T22:00:00.000Z");
});

test("dayOffset should maintain consistency across multiple DST transitions", function () {
  // Pattern: Every day at 2:00 AM with -1 day offset
  const scheduler = new Cron("0 0 2 * * *", { dayOffset: -1, timezone: "America/New_York" });

  // Get runs spanning both DST transitions in 2025
  const feb = new Date("2025-02-28T00:00:00Z");
  const runs = scheduler.nextRuns(15, feb);

  // Check that runs maintain daily spacing (24 hours in most cases, 23 or 25 during DST)
  for (let i = 1; i < runs.length; i++) {
    const diffHours = (runs[i].getTime() - runs[i - 1].getTime()) / (60 * 60 * 1000);
    // Allow for DST transitions causing 23 or 25 hour differences
    const isValidSpacing = diffHours === 24 || diffHours === 23 || diffHours === 25;
    assertEquals(
      isValidSpacing,
      true,
      `Run ${i} spacing should be 23-25 hours, got ${diffHours}`,
    );
  }
});
