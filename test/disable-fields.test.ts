import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// Tests for mode option - 5-part mode
test("5-part mode should force seconds to 0", function () {
  const scheduler = new Cron("* * * * *", { mode: "5-part" });
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // In 5-part mode, seconds should be forced to 0
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

test("5-part mode with minute and hour pattern", function () {
  const scheduler = new Cron("30 12 * * *", { mode: "5-part" });
  const nextRuns = scheduler.nextRuns(2, "2024-01-01T00:00:00");

  // With 5-part mode, it should run at 12:30:00 every day
  assertEquals(nextRuns[0].getHours(), 12);
  assertEquals(nextRuns[0].getMinutes(), 30);
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getHours(), 12);
  assertEquals(nextRuns[1].getMinutes(), 30);
  assertEquals(nextRuns[1].getSeconds(), 0);
});

test("5-part mode with day of month pattern", function () {
  const scheduler = new Cron("15 10 1 1 *", { mode: "5-part" });
  const nextRun = scheduler.nextRun("2024-01-01T00:00:00");

  // With 5-part mode, it should run at 10:15:00 on Jan 1
  // and years should be ignored (will run every year)
  assertEquals(nextRun?.getHours(), 10);
  assertEquals(nextRun?.getMinutes(), 15);
  assertEquals(nextRun?.getSeconds(), 0);
});

test("5-part mode should force years to wildcard", function () {
  const scheduler = new Cron("0 12 * * *", { mode: "5-part" });

  // Should be able to get runs in any year since years are ignored in 5-part mode
  const nextRuns = scheduler.nextRuns(5, "2026-01-01T00:00:00");
  assertEquals(nextRuns.length, 5);
  assertEquals(nextRuns[0].getFullYear(), 2026);
});

// Tests for 6-part mode
test("6-part mode should preserve seconds but ignore years", function () {
  const scheduler = new Cron("0 0 0 1 1 *", { mode: "6-part" });

  // Should match Jan 1 at 00:00:00 in any year
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

test("6-part mode should work with any day pattern", function () {
  const scheduler = new Cron("0 0 12 15 6 *", { mode: "6-part" });

  // Should match June 15 at 12:00:00 in any year
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
  assertEquals(nextRuns[0].getHours(), 12);
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
test("5-part mode with wildcard pattern should force seconds to 0", function () {
  const scheduler = new Cron("* * * * *", { mode: "5-part" });
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // Should run every minute at second 0
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getSeconds(), 0);
  assertEquals(nextRuns[2].getSeconds(), 0);
  // Starting from 00:00:00, next runs are at 00:01:00, 00:02:00, 00:03:00
  assertEquals(nextRuns[0].getMinutes(), 1);
  assertEquals(nextRuns[1].getMinutes(), 2);
  assertEquals(nextRuns[2].getMinutes(), 3);
});

test("6-part mode with wildcard pattern should work correctly", function () {
  const scheduler = new Cron("0 0 12 * * *", { mode: "6-part" });
  const nextRuns = scheduler.nextRuns(2, "2024-12-31T00:00:00");

  // Should work across year boundaries (years are ignored in 6-part mode)
  assertEquals(nextRuns[0].getFullYear(), 2024);
  assertEquals(nextRuns[1].getFullYear(), 2025);
});

test("5-part mode with minute stepping pattern", function () {
  const scheduler = new Cron("*/15 * * * *", { mode: "5-part" });
  const nextRuns = scheduler.nextRuns(3, "2024-01-01T00:00:00");

  // With 5-part mode, seconds are forced to 0, minutes step by 15
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getSeconds(), 0);
  assertEquals(nextRuns[2].getSeconds(), 0);
  assertEquals(nextRuns[0].getMinutes(), 15);
  assertEquals(nextRuns[1].getMinutes(), 30);
  assertEquals(nextRuns[2].getMinutes(), 45);
});

test("6-part mode with specific day pattern", function () {
  const scheduler = new Cron("0 0 12 1 1 *", { mode: "6-part" });
  const nextRuns = scheduler.nextRuns(3, "2028-01-01T00:00:00");

  // With 6-part mode, should match every year (Jan 1 at 12:00:00)
  assertEquals(nextRuns[0].getFullYear(), 2028);
  assertEquals(nextRuns[1].getFullYear(), 2029);
  assertEquals(nextRuns[2].getFullYear(), 2030);
  assertEquals(nextRuns[0].getMonth(), 0);
  assertEquals(nextRuns[0].getDate(), 1);
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

// Mode enforcement tests
test("5-part mode should reject 6-part pattern", function () {
  assertThrows(
    () => {
      new Cron("0 0 * * * *", { mode: "5-part" });
    },
    TypeError,
    "mode '5-part' requires exactly 5 parts",
  );
});

test("5-part mode should reject 7-part pattern", function () {
  assertThrows(
    () => {
      new Cron("0 0 0 * * * 2025", { mode: "5-part" });
    },
    TypeError,
    "mode '5-part' requires exactly 5 parts",
  );
});

test("6-part mode should reject 5-part pattern", function () {
  assertThrows(
    () => {
      new Cron("0 * * * *", { mode: "6-part" });
    },
    TypeError,
    "mode '6-part' requires exactly 6 parts",
  );
});

test("6-part mode should reject 7-part pattern", function () {
  assertThrows(
    () => {
      new Cron("0 0 0 * * * 2025", { mode: "6-part" });
    },
    TypeError,
    "mode '6-part' requires exactly 6 parts",
  );
});

test("7-part mode should reject 5-part pattern", function () {
  assertThrows(
    () => {
      new Cron("0 * * * *", { mode: "7-part" });
    },
    TypeError,
    "mode '7-part' requires exactly 7 parts",
  );
});

test("7-part mode should reject 6-part pattern", function () {
  assertThrows(
    () => {
      new Cron("0 0 * * * *", { mode: "7-part" });
    },
    TypeError,
    "mode '7-part' requires exactly 7 parts",
  );
});

test("auto mode should accept 5-part pattern", function () {
  const scheduler = new Cron("0 * * * *", { mode: "auto" });
  const nextRun = scheduler.nextRun("2024-01-01T00:00:00");
  assertEquals(nextRun !== null, true);
});

test("auto mode should accept 6-part pattern", function () {
  const scheduler = new Cron("0 0 * * * *", { mode: "auto" });
  const nextRun = scheduler.nextRun("2024-01-01T00:00:00");
  assertEquals(nextRun !== null, true);
});

test("auto mode should accept 7-part pattern", function () {
  const scheduler = new Cron("0 0 0 * * * 2025", { mode: "auto" });
  const nextRun = scheduler.nextRun("2024-01-01T00:00:00");
  assertEquals(nextRun !== null, true);
});

// Tests for 5-or-6-parts mode
test("5-or-6-parts mode should accept 5-part pattern", function () {
  const scheduler = new Cron("0 * * * *", { mode: "5-or-6-parts" });
  const nextRuns = scheduler.nextRuns(2, "2024-01-01T00:00:00");

  // Should work with 5-part pattern, seconds forced to 0, years wildcarded
  assertEquals(nextRuns[0].getSeconds(), 0);
  assertEquals(nextRuns[1].getSeconds(), 0);
  assertEquals(nextRuns[0] !== null, true);
});

test("5-or-6-parts mode should accept 6-part pattern", function () {
  const scheduler = new Cron("30 0 * * * *", { mode: "5-or-6-parts" });
  const nextRuns = scheduler.nextRuns(2, "2024-01-01T00:00:00");

  // Should work with 6-part pattern, seconds preserved, years wildcarded
  assertEquals(nextRuns[0].getSeconds(), 30);
  assertEquals(nextRuns[1].getSeconds(), 30);
  assertEquals(nextRuns[0] !== null, true);
});

test("5-or-6-parts mode should reject 7-part pattern", function () {
  assertThrows(
    () => {
      new Cron("0 0 0 * * * 2025", { mode: "5-or-6-parts" });
    },
    TypeError,
    "mode '5-or-6-parts' requires exactly 5 or 6 parts",
  );
});

test("5-or-6-parts mode should wildcard years for both 5 and 6 part patterns", function () {
  const scheduler5 = new Cron("0 * * * *", { mode: "5-or-6-parts" });
  const scheduler6 = new Cron("0 0 * * * *", { mode: "5-or-6-parts" });

  // Both should work across years
  const runs5 = scheduler5.nextRuns(2, "2025-12-31T23:59:00");
  const runs6 = scheduler6.nextRuns(2, "2025-12-31T23:59:00");

  assertEquals(runs5[0].getFullYear(), 2026);
  assertEquals(runs6[0].getFullYear(), 2026);
});

// Tests for 6-or-7-parts mode
test("6-or-7-parts mode should accept 6-part pattern", function () {
  const scheduler = new Cron("30 0 * * * *", { mode: "6-or-7-parts" });
  const nextRuns = scheduler.nextRuns(2, "2024-01-01T00:00:00");

  // Should work with 6-part pattern
  assertEquals(nextRuns[0].getSeconds(), 30);
  assertEquals(nextRuns[1].getSeconds(), 30);
  assertEquals(nextRuns[0] !== null, true);
});

test("6-or-7-parts mode should accept 7-part pattern", function () {
  const scheduler = new Cron("30 0 0 * * * 2025", { mode: "6-or-7-parts" });
  const nextRuns = scheduler.nextRuns(2, "2024-01-01T00:00:00");

  // Should work with 7-part pattern
  assertEquals(nextRuns[0].getSeconds(), 30);
  assertEquals(nextRuns[0].getFullYear(), 2025);
  assertEquals(nextRuns[1].getFullYear(), 2025);
});

test("6-or-7-parts mode should reject 5-part pattern", function () {
  assertThrows(
    () => {
      new Cron("0 * * * *", { mode: "6-or-7-parts" });
    },
    TypeError,
    "mode '6-or-7-parts' requires exactly 6 or 7 parts",
  );
});

test("6-or-7-parts mode with 6-part should wildcard years", function () {
  const scheduler = new Cron("0 0 * * * *", { mode: "6-or-7-parts" });

  // 6-part pattern in 6-or-7-parts mode should work across years
  const runs = scheduler.nextRuns(2, "2025-12-31T23:59:00");

  assertEquals(runs[0].getFullYear(), 2026);
  assertEquals(runs[1].getFullYear(), 2026);
});

test("6-or-7-parts mode with 7-part should respect years", function () {
  const scheduler = new Cron("0 0 0 * * * 2025", { mode: "6-or-7-parts" });

  // 7-part pattern in 6-or-7-parts mode should respect years
  const runs = scheduler.nextRuns(2, "2024-01-01T00:00:00");

  assertEquals(runs[0].getFullYear(), 2025);
  assertEquals(runs[1].getFullYear(), 2025);

  // Should not return runs after 2025
  const noRuns = scheduler.nextRun("2026-01-01T00:00:00");
  assertEquals(noRuns, null);
});
