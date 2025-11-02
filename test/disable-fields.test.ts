import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// Tests for disableSeconds option
test("disableSeconds should force seconds to 0 - pattern with specific seconds", function () {
  const scheduler = new Cron("30 * * * * *", { disableSeconds: true });
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // With disableSeconds, seconds should be forced to 0
  // So it should run every minute at second 0, not just at second 30
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getSeconds(), 0);
  assertEquals(nextRuns[2].getSeconds(), 0);
  // Starting from 00:00:00, next runs are at 00:01:00, 00:02:00, 00:03:00
  assertEquals(nextRuns[0].getMinutes(), 1);
  assertEquals(nextRuns[1].getMinutes(), 2);
  assertEquals(nextRuns[2].getMinutes(), 3);
});

test("disableSeconds should work with 5-field pattern", function () {
  // Pattern "0 * * * *" means "at minute 0 of every hour"
  const scheduler = new Cron("0 * * * *", { disableSeconds: true });
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

test("disableSeconds should work with 6-field pattern", function () {
  const scheduler = new Cron("45 30 12 * * *", { disableSeconds: true });
  const nextRuns = scheduler.nextRuns(2, "2024-01-01T00:00:00");

  // With disableSeconds, it should run at 12:30:00 every day (not 12:30:45)
  assertEquals(nextRuns[0].getHours(), 12);
  assertEquals(nextRuns[0].getMinutes(), 30);
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getHours(), 12);
  assertEquals(nextRuns[1].getMinutes(), 30);
  assertEquals(nextRuns[1].getSeconds(), 0);
});

test("disableSeconds should work with 7-field pattern", function () {
  const scheduler = new Cron("55 15 10 1 1 * 2025", { disableSeconds: true });
  const nextRun = scheduler.nextRun("2024-01-01T00:00:00");

  // With disableSeconds, it should run at 10:15:00 on Jan 1, 2025 (not 10:15:55)
  // Note: Years are also disabled when seconds are disabled
  assertEquals(nextRun?.getHours(), 10);
  assertEquals(nextRun?.getMinutes(), 15);
  assertEquals(nextRun?.getSeconds(), 0);
});

test("disableSeconds should force disableYears to true", function () {
  const scheduler = new Cron("0 0 12 * * * 2025", { disableSeconds: true });

  // Should be able to get runs beyond 2025 since years are disabled
  const nextRuns = scheduler.nextRuns(5, "2026-01-01T00:00:00");
  assertEquals(nextRuns.length, 5);
  assertEquals(nextRuns[0].getFullYear(), 2026);
});

// Tests for disableYears option
test("disableYears should force years to wildcard", function () {
  const scheduler = new Cron("0 0 0 1 1 * 2025", { disableYears: true });

  // Should match Jan 1 in any year, not just 2025
  const nextRun1 = scheduler.nextRun("2024-01-01T00:00:00");
  assertEquals(nextRun1?.getFullYear(), 2025);
  assertEquals(nextRun1?.getMonth(), 0); // January
  assertEquals(nextRun1?.getDate(), 1);

  const nextRun2 = scheduler.nextRun("2025-01-02T00:00:00");
  assertEquals(nextRun2?.getFullYear(), 2026);
  assertEquals(nextRun2?.getMonth(), 0); // January
  assertEquals(nextRun2?.getDate(), 1);
});

test("disableYears should work with specific year pattern", function () {
  const scheduler = new Cron("0 0 12 15 6 * 2025-2027", { disableYears: true });

  // Should match June 15 at 12:00 in any year, not just 2025-2027
  const nextRuns = scheduler.nextRuns(3, "2028-01-01T00:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2028);
  assertEquals(nextRuns[0].getMonth(), 5); // June
  assertEquals(nextRuns[0].getDate(), 15);
});

test("disableYears should work with wildcard year", function () {
  const scheduler = new Cron("0 0 12 * * * *", { disableYears: true });

  // Should still work normally with wildcard years
  const nextRuns = scheduler.nextRuns(2, "2024-01-01T00:00:00");
  assertEquals(nextRuns[0].getHours(), 12);
  assertEquals(nextRuns[0].getMinutes(), 0);
  assertEquals(nextRuns[0].getSeconds(), 0);
});

// Tests for both options disabled (default behavior)
test("without disableSeconds, specific seconds should be respected", function () {
  const scheduler = new Cron("30 * * * * *");
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // Should run only at second 30 of each minute
  assertEquals(nextRuns[0].getSeconds(), 30);
  assertEquals(nextRuns[1].getSeconds(), 30);
  assertEquals(nextRuns[2].getSeconds(), 30);
});

test("without disableYears, specific years should be respected", function () {
  const scheduler = new Cron("0 0 0 1 1 * 2025");

  // Should only match 2025
  const nextRun1 = scheduler.nextRun("2024-01-01T00:00:00");
  assertEquals(nextRun1?.getFullYear(), 2025);

  const nextRun2 = scheduler.nextRun("2025-01-02T00:00:00");
  assertEquals(nextRun2, null); // No more runs after 2025
});

// Edge case tests
test("disableSeconds with wildcard seconds should still work", function () {
  const scheduler = new Cron("* * * * * *", { disableSeconds: true });
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

test("disableYears with wildcard years should still work", function () {
  const scheduler = new Cron("0 0 12 * * * *", { disableYears: true });
  const nextRuns = scheduler.nextRuns(2, "2024-12-31T00:00:00");

  // Should work across year boundaries
  assertEquals(nextRuns[0].getFullYear(), 2024);
  assertEquals(nextRuns[1].getFullYear(), 2025);
});

test("both options set to false should preserve original behavior", function () {
  const scheduler = new Cron("15 30 12 * * * 2025", {
    disableSeconds: false,
    disableYears: false,
  });

  const nextRun = scheduler.nextRun("2024-01-01T00:00:00");
  assertEquals(nextRun?.getFullYear(), 2025);
  assertEquals(nextRun?.getSeconds(), 15);

  const noRun = scheduler.nextRun("2026-01-01T00:00:00");
  assertEquals(noRun, null); // No runs after 2025
});

test("disableSeconds with seconds stepping pattern", function () {
  const scheduler = new Cron("*/15 * * * * *", { disableSeconds: true });
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // With disableSeconds, stepping should be ignored
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getSeconds(), 0);
  assertEquals(nextRuns[2].getSeconds(), 0);
  // Starting from 00:00:00, next runs are at 00:01:00, 00:02:00, 00:03:00
  assertEquals(nextRuns[0].getMinutes(), 1);
  assertEquals(nextRuns[1].getMinutes(), 2);
  assertEquals(nextRuns[2].getMinutes(), 3);
});

test("disableYears with years stepping pattern", function () {
  const scheduler = new Cron("0 0 12 1 1 * 2025/2", { disableYears: true });
  const nextRuns = scheduler.nextRuns(3, "2028-01-01T00:00:00");

  // With disableYears, should match every year, not just 2025, 2027, 2029...
  assertEquals(nextRuns[0].getFullYear(), 2028);
  assertEquals(nextRuns[1].getFullYear(), 2029);
  assertEquals(nextRuns[2].getFullYear(), 2030);
});
