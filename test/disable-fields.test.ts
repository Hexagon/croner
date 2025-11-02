import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// Tests for mode option - 5-part mode
test("5-part mode should force seconds to 0 - pattern with specific seconds", function () {
  const scheduler = new Cron("30 * * * * *", { mode: "5-part" });
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // In 5-part mode, seconds should be forced to 0
  // So it should run every minute at second 0, not just at second 30
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getSeconds(), 0);
  assertEquals(nextRuns[2].getSeconds(), 0);
  // Starting from 00:00:00, next runs are at 00:01:00, 00:02:00, 00:03:00
  assertEquals(nextRuns[0].getMinutes(), 1);
  assertEquals(nextRuns[1].getMinutes(), 2);
  assertEquals(nextRuns[2].getMinutes(), 3);
});

test("5-part mode should work with traditional 5-field pattern", function () {
  // Pattern "0 * * * *" means "at minute 0 of every hour"
  const scheduler = new Cron("0 * * * *", { mode: "5-part" });
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // Should run at minute 0 of each hour, at second 0
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getSeconds(), 0);
  assertEquals(nextRuns[2].getSeconds(), 0);
  assertEquals(nextRuns[0].getMinutes(), 0);
  assertEquals(nextRuns[1].getMinutes(), 0);
  assertEquals(nextRuns[2].getMinutes(), 0);
  // Starting from 00:00:00, next runs are at 01:00:00, 02:00:00, 03:00:00
  assertEquals(nextRuns[0].getHours(), 1);
  assertEquals(nextRuns[1].getHours(), 2);
  assertEquals(nextRuns[2].getHours(), 3);
});

test("5-part mode should work with 6-field pattern", function () {
  const scheduler = new Cron("45 30 12 * * *", { mode: "5-part" });
  const nextRuns = scheduler.nextRuns(2, "2024-01-01T00:00:00");

  // With 5-part mode, it should run at 12:30:00 every day (not 12:30:45)
  assertEquals(nextRuns[0].getHours(), 12);
  assertEquals(nextRuns[0].getMinutes(), 30);
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getHours(), 12);
  assertEquals(nextRuns[1].getMinutes(), 30);
  assertEquals(nextRuns[1].getSeconds(), 0);
});

test("5-part mode should work with 7-field pattern", function () {
  const scheduler = new Cron("55 15 10 1 1 * 2025", { mode: "5-part" });
  const nextRun = scheduler.nextRun("2024-01-01T00:00:00");

  // With 5-part mode, it should run at 10:15:00 on Jan 1 (not 10:15:55)
  // and years should be ignored
  assertEquals(nextRun?.getHours(), 10);
  assertEquals(nextRun?.getMinutes(), 15);
  assertEquals(nextRun?.getSeconds(), 0);
});

test("5-part mode should force years to wildcard", function () {
  const scheduler = new Cron("0 0 12 * * * 2025", { mode: "5-part" });

  // Should be able to get runs beyond 2025 since years are ignored in 5-part mode
  const nextRuns = scheduler.nextRuns(5, "2026-01-01T00:00:00");
  assertEquals(nextRuns.length, 5);
  assertEquals(nextRuns[0].getFullYear(), 2026);
});

// Tests for 6-part mode
test("6-part mode should preserve seconds but ignore years", function () {
  const scheduler = new Cron("0 0 0 1 1 * 2025", { mode: "6-part" });

  // Should match Jan 1 at 00:00:00 in any year, not just 2025
  const nextRun1 = scheduler.nextRun("2024-01-01T00:00:00");
  assertEquals(nextRun1?.getFullYear(), 2025);
  assertEquals(nextRun1?.getMonth(), 0); // January
  assertEquals(nextRun1?.getDate(), 1);
  assertEquals(nextRun1?.getSeconds(), 0); // Seconds preserved

  const nextRun2 = scheduler.nextRun("2025-01-02T00:00:00");
  assertEquals(nextRun2?.getFullYear(), 2026);
  assertEquals(nextRun2?.getMonth(), 0); // January
  assertEquals(nextRun2?.getDate(), 1);
});

test("6-part mode should work with specific year pattern", function () {
  const scheduler = new Cron("0 0 12 15 6 * 2025-2027", { mode: "6-part" });

  // Should match June 15 at 12:00:00 in any year, not just 2025-2027
  const nextRuns = scheduler.nextRuns(3, "2028-01-01T00:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2028);
  assertEquals(nextRuns[0].getMonth(), 5); // June
  assertEquals(nextRuns[0].getDate(), 15);
  assertEquals(nextRuns[0].getSeconds(), 0); // Seconds preserved
});

test("6-part mode should preserve specific seconds", function () {
  const scheduler = new Cron("45 30 12 * * *", { mode: "6-part" });
  const nextRuns = scheduler.nextRuns(2, "2024-01-01T00:00:00");

  // Seconds should be preserved (not forced to 0)
  assertEquals(nextRuns[0].getSeconds(), 45);
  assertEquals(nextRuns[1].getSeconds(), 45);
  assertEquals(nextRuns[0].getMinutes(), 30);
  assertEquals(nextRuns[1].getMinutes(), 30);
});

// Tests for 7-part mode
test("7-part mode should preserve both seconds and years", function () {
  const scheduler = new Cron("15 30 12 * * * 2025", { mode: "7-part" });

  const nextRun = scheduler.nextRun("2024-01-01T00:00:00");
  assertEquals(nextRun?.getFullYear(), 2025);
  assertEquals(nextRun?.getSeconds(), 15);

  const noRun = scheduler.nextRun("2026-01-01T00:00:00");
  assertEquals(noRun, null); // No runs after 2025
});

test("7-part mode with year ranges should work correctly", function () {
  const scheduler = new Cron("0 0 12 1 1 * 2025-2027", { mode: "7-part" });

  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2025);
  assertEquals(nextRuns[1].getFullYear(), 2026);
  assertEquals(nextRuns[2].getFullYear(), 2027);

  // No more runs after 2027
  const noRun = scheduler.nextRun("2028-01-01T00:00:00");
  assertEquals(noRun, null);
});

// Tests for auto mode (default behavior)
test("auto mode should preserve specific seconds", function () {
  const scheduler = new Cron("30 * * * * *", { mode: "auto" });
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // Should run only at second 30 of each minute
  assertEquals(nextRuns[0].getSeconds(), 30);
  assertEquals(nextRuns[1].getSeconds(), 30);
  assertEquals(nextRuns[2].getSeconds(), 30);
});

test("auto mode should preserve specific years", function () {
  const scheduler = new Cron("0 0 0 1 1 * 2025", { mode: "auto" });

  // Should only match 2025
  const nextRun1 = scheduler.nextRun("2024-01-01T00:00:00");
  assertEquals(nextRun1?.getFullYear(), 2025);

  const nextRun2 = scheduler.nextRun("2025-01-02T00:00:00");
  assertEquals(nextRun2, null); // No more runs after 2025
});

test("default (no mode specified) should work like auto mode", function () {
  const scheduler = new Cron("30 * * * * *");
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // Should run only at second 30 of each minute
  assertEquals(nextRuns[0].getSeconds(), 30);
  assertEquals(nextRuns[1].getSeconds(), 30);
  assertEquals(nextRuns[2].getSeconds(), 30);
});

// Edge case tests
test("5-part mode with wildcard seconds should force to 0", function () {
  const scheduler = new Cron("* * * * * *", { mode: "5-part" });
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // Should run every minute at second 0 (not every second)
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getSeconds(), 0);
  assertEquals(nextRuns[2].getSeconds(), 0);
  // Starting from 00:00:00, next runs are at 00:01:00, 00:02:00, 00:03:00
  assertEquals(nextRuns[0].getMinutes(), 1);
  assertEquals(nextRuns[1].getMinutes(), 2);
  assertEquals(nextRuns[2].getMinutes(), 3);
});

test("6-part mode with wildcard years should work correctly", function () {
  const scheduler = new Cron("0 0 12 * * * *", { mode: "6-part" });
  const nextRuns = scheduler.nextRuns(2, "2024-12-31T00:00:00");

  // Should work across year boundaries
  assertEquals(nextRuns[0].getFullYear(), 2024);
  assertEquals(nextRuns[1].getFullYear(), 2025);
});

test("5-part mode with seconds stepping pattern", function () {
  const scheduler = new Cron("*/15 * * * * *", { mode: "5-part" });
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // With 5-part mode, stepping should be ignored
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getSeconds(), 0);
  assertEquals(nextRuns[2].getSeconds(), 0);
  // Starting from 00:00:00, next runs are at 00:01:00, 00:02:00, 00:03:00
  assertEquals(nextRuns[0].getMinutes(), 1);
  assertEquals(nextRuns[1].getMinutes(), 2);
  assertEquals(nextRuns[2].getMinutes(), 3);
});

test("6-part mode with years stepping pattern", function () {
  const scheduler = new Cron("0 0 12 1 1 * 2025/2", { mode: "6-part" });
  const nextRuns = scheduler.nextRuns(3, "2028-01-01T00:00:00");

  // With 6-part mode, should match every year, not just 2025, 2027, 2029...
  assertEquals(nextRuns[0].getFullYear(), 2028);
  assertEquals(nextRuns[1].getFullYear(), 2029);
  assertEquals(nextRuns[2].getFullYear(), 2030);
});

// Validation tests
test("invalid mode should throw", function () {
  assertThrows(
    () => {
      // @ts-expect-error - Testing invalid mode
      new Cron("* * * * * *", { mode: "invalid" });
    },
    Error,
    "mode must be one of",
  );
});
