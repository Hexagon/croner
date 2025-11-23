import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// Tests for strict range parsing as used by vixie cron and cronie
// According to OCPS requirements, patterns like */10 and 0-59/10 are allowed,
// but patterns like 0/10 or 30/30 (single number with slash) are disallowed.

test("Strict range parsing: */10 should be allowed", function () {
  let scheduler = new Cron("*/10 * * * * *");
  let nextRuns = scheduler.nextRuns(5, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getSeconds(), 10);
  assertEquals(nextRuns[1].getSeconds(), 20);
  assertEquals(nextRuns[2].getSeconds(), 30);
  assertEquals(nextRuns[3].getSeconds(), 40);
  assertEquals(nextRuns[4].getSeconds(), 50);
});

test("Strict range parsing: 0-59/10 should be allowed", function () {
  let scheduler = new Cron("0-59/10 * * * * *");
  let nextRuns = scheduler.nextRuns(5, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getSeconds(), 10);
  assertEquals(nextRuns[1].getSeconds(), 20);
  assertEquals(nextRuns[2].getSeconds(), 30);
  assertEquals(nextRuns[3].getSeconds(), 40);
  assertEquals(nextRuns[4].getSeconds(), 50);
});

test("Strict range parsing: 30-50/10 should be allowed", function () {
  let scheduler = new Cron("30-50/10 * * * * *");
  let nextRuns = scheduler.nextRuns(3, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getSeconds(), 30);
  assertEquals(nextRuns[1].getSeconds(), 40);
  assertEquals(nextRuns[2].getSeconds(), 50);
});

test("Strict range parsing: /10 (missing prefix) should be disallowed", function () {
  assertThrows(
    () => {
      new Cron("* /10 * * * *");
    },
    TypeError,
    "missing prefix",
  );
});

test("Strict range parsing: 0/10 should be disallowed", function () {
  assertThrows(
    () => {
      new Cron("0/10 * * * * *");
    },
    TypeError,
    "stepping with numeric prefix",
  );
});

test("Strict range parsing: 30/30 should be disallowed", function () {
  assertThrows(
    () => {
      new Cron("30/30 * * * * *");
    },
    TypeError,
    "stepping with numeric prefix",
  );
});

test("Strict range parsing: 5/5 should be disallowed", function () {
  assertThrows(
    () => {
      new Cron("5/5 * * * * *");
    },
    TypeError,
    "stepping with numeric prefix",
  );
});

test("Strict range parsing: 0/10 in minutes field should be disallowed", function () {
  assertThrows(
    () => {
      new Cron("* 0/10 * * * *");
    },
    TypeError,
    "stepping with numeric prefix",
  );
});

test("Strict range parsing: 12/6 in hours field should be disallowed", function () {
  assertThrows(
    () => {
      new Cron("* * 12/6 * * *");
    },
    TypeError,
    "stepping with numeric prefix",
  );
});

test("Strict range parsing: 5/2 in days field should be disallowed", function () {
  assertThrows(
    () => {
      new Cron("* * * 5/2 * *");
    },
    TypeError,
    "stepping with numeric prefix",
  );
});

test("Strict range parsing: 3/3 in months field should be disallowed", function () {
  assertThrows(
    () => {
      new Cron("* * * * 3/3 *");
    },
    TypeError,
    "stepping with numeric prefix",
  );
});

test("Strict range parsing: 2/2 in day-of-week field should be disallowed", function () {
  assertThrows(
    () => {
      new Cron("* * * * * 2/2");
    },
    TypeError,
    "stepping with numeric prefix",
  );
});

test("Strict range parsing: */15 in all time fields should be allowed", function () {
  let scheduler = new Cron("*/15 */15 */3 * * *");
  let nextRun = scheduler.nextRun("2020-01-01T00:00:00");
  if (!nextRun) throw new Error("nextRun should not be null");
  assertEquals(nextRun.getSeconds(), 15);
  assertEquals(nextRun.getMinutes(), 0);
  assertEquals(nextRun.getHours(), 0);
});

test("Strict range parsing: 10-20/2 should be allowed", function () {
  let scheduler = new Cron("10-20/2 * * * * *");
  let nextRuns = scheduler.nextRuns(6, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getSeconds(), 10);
  assertEquals(nextRuns[1].getSeconds(), 12);
  assertEquals(nextRuns[2].getSeconds(), 14);
  assertEquals(nextRuns[3].getSeconds(), 16);
  assertEquals(nextRuns[4].getSeconds(), 18);
  assertEquals(nextRuns[5].getSeconds(), 20);
});

test("Strict range parsing: combination of wildcard stepping and ranges should work", function () {
  let scheduler = new Cron("*/10,30-35 * * * * *");
  let nextRuns = scheduler.nextRuns(10, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getSeconds(), 10);
  assertEquals(nextRuns[1].getSeconds(), 20);
  assertEquals(nextRuns[2].getSeconds(), 30);
  assertEquals(nextRuns[3].getSeconds(), 31);
  assertEquals(nextRuns[4].getSeconds(), 32);
  assertEquals(nextRuns[5].getSeconds(), 33);
  assertEquals(nextRuns[6].getSeconds(), 34);
  assertEquals(nextRuns[7].getSeconds(), 35);
  assertEquals(nextRuns[8].getSeconds(), 40);
  assertEquals(nextRuns[9].getSeconds(), 50);
});

test("Strict range parsing: error message should be informative", function () {
  try {
    new Cron("15/5 * * * * *");
    throw new Error("Should have thrown");
  } catch (e) {
    const error = e as Error;
    assertEquals(
      error.message,
      "CronPattern: Syntax error, stepping with numeric prefix ('15/5') is not allowed. Use wildcard (*/step) or range (min-max/step) instead.",
    );
  }
});

// Tests for sloppyRanges option
test("sloppyRanges: /10 should be allowed when sloppyRanges is true", function () {
  // Pattern "* /10 * * * *" means every second, in minutes 0, 10, 20, etc.
  let scheduler = new Cron("* /10 * * * *", { sloppyRanges: true });
  let nextRuns = scheduler.nextRuns(3, "2020-01-01T00:00:00");
  // Since it runs every second in minute 0, the first runs are at 00:00:01, 00:00:02, 00:00:03
  assertEquals(nextRuns[0].getMinutes(), 0);
  assertEquals(nextRuns[1].getMinutes(), 0);
  assertEquals(nextRuns[2].getMinutes(), 0);
  // But after minute 0, next runs should be in minute 10
  let laterRuns = scheduler.nextRuns(3, "2020-01-01T00:01:00");
  assertEquals(laterRuns[0].getMinutes(), 10);
});

test("sloppyRanges: 5/5 should be allowed when sloppyRanges is true", function () {
  let scheduler = new Cron("5/5 * * * * *", { sloppyRanges: true });
  let nextRuns = scheduler.nextRuns(3, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getSeconds(), 5);
  assertEquals(nextRuns[1].getSeconds(), 10);
  assertEquals(nextRuns[2].getSeconds(), 15);
});

test("sloppyRanges: 0/10 should be allowed when sloppyRanges is true", function () {
  let scheduler = new Cron("0/10 * * * * *", { sloppyRanges: true });
  let nextRuns = scheduler.nextRuns(3, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getSeconds(), 10);
  assertEquals(nextRuns[1].getSeconds(), 20);
  assertEquals(nextRuns[2].getSeconds(), 30);
});

test("sloppyRanges: 30/30 should be allowed when sloppyRanges is true", function () {
  // 30/30 means start at 30, step by 30. So: 30, 60 (out of range)
  // Since 60 is out of range for seconds, it only hits second 30
  let scheduler = new Cron("30/30 * * * * *", { sloppyRanges: true });
  let nextRuns = scheduler.nextRuns(3, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getSeconds(), 30);
  assertEquals(nextRuns[1].getSeconds(), 30);
  assertEquals(nextRuns[2].getSeconds(), 30);
});

test("sloppyRanges: default is false (strict mode)", function () {
  assertThrows(
    () => {
      new Cron("5/5 * * * * *");
    },
    TypeError,
    "stepping with numeric prefix",
  );
});
