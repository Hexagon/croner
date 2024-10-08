/* A few sanity checks for the distributed build */
import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../dist/croner.js";

test("new Cron(...) should not throw", function () {
  let scheduler = new Cron("* * * * * *");
  scheduler.nextRun();
});

test("Array passed as next date should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * * * *");
    scheduler.nextRun([]);
  });
});

test("31st february should not be found", function () {
  let scheduler = new Cron("* * * 31 2 *");
  assertEquals(scheduler.nextRun(), null);
});

test("Too high days should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * 32 * *");
    scheduler.nextRun();
  });
});

test("Too low days should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * 0 * *");
    scheduler.nextRun();
  });
});

test("Valid months should not throw", function () {
  let scheduler = new Cron("* * * * 1,2,3,4,5,6,7,8,9,10,11,12 *");
  scheduler.nextRun();
});

test("Options as second argument should not throw", function () {
  let scheduler = new Cron("* * * * * *", { maxRuns: 1 });
  scheduler.nextRun();
});

test("Options as third argument should not throw", function () {
  let scheduler = new Cron("* * * * * *", () => {}, { maxRuns: 1 });
  scheduler.nextRun();
  scheduler.stop();
});

test("Text as second argument should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * * * *", "bogus", { maxRuns: 1 });
    scheduler.nextRun();
  });
});

test("Text as third argument should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * * * *", { maxRuns: 1 }, "test");
    scheduler.nextRun();
  });
});

test("Too high months should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * * 7-13 *");
    scheduler.nextRun();
  });
});

test("Too low months should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * * 0-3 *");
    scheduler.nextRun();
  });
});

test("Valid weekdays should not throw", function () {
  let scheduler = new Cron("* * * * * 0,1,2,3,4,5,6,7");
  scheduler.nextRun();
});

test("Too high weekday should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * * * 8");
    scheduler.nextRun();
  });
});

test("Too low weekday should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * * * -1");
    scheduler.nextRun();
  });
});

test("Too high hours minute should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * 0,23,24 * * *");
    scheduler.nextRun();
  });
});

test("Next 10 run times is returned by enumeration(), and contain a reasonable time span", () => {
  let now = new Date(),
    nextRuns = new Cron("*/30 * * * * *").nextRuns(10);

  // Check number of times returned
  assertEquals(nextRuns.length, 10);

  // Check that time span of first entry is within a minute
  assertEquals(nextRuns[0].getTime() >= now.getTime() - 1000, true);
  assertEquals(nextRuns[0].getTime() <= now.getTime() + 61 * 1000, true);

  // Check that time span of last entry is about 5 minutes from now
  assertEquals(nextRuns[9].getTime() > now.getTime() + 4 * 60 * 1000, true);
  assertEquals(nextRuns[9].getTime() < now.getTime() + 6 * 60 * 1000, true);
});

test("Extra whitespace at beginning should throw", () => {
  assertThrows(() => {
    new Cron(" 0 0 12 9 *").nextRun();
  });
});

test("Extra whitespace at end should throw", () => {
  assertThrows(() => {
    new Cron("0 0 12 9 * ").nextRun();
  });
});

test("Next 10 run times is returned by enumeration(), and contain a reasonable time span, when using modified start time", () => {
  // 20 minutes before now
  let now = new Date(new Date().getTime() - 1200 * 1000),
    nextRuns = new Cron("0 * * * * *").nextRuns(10, now);

  // Check number of times returned
  assertEquals(nextRuns.length, 10);

  // Check that time span of first entry is within a minute
  assertEquals(nextRuns[0].getTime() >= now.getTime(), true);
  assertEquals(nextRuns[0].getTime() <= now.getTime() + 61 * 1000, true);

  // Check that time span of last entry is about 10 minutes from 'now'
  assertEquals(nextRuns[9].getTime() > now.getTime() + 9 * 60 * 1000, true);
  assertEquals(nextRuns[9].getTime() < now.getTime() + 11 * 60 * 1000, true);
});

test("@yearly should be replaced", function () {
  let nextRuns = new Cron("@yearly").nextRuns(3, "2022-02-17T00:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2023);
  assertEquals(nextRuns[0].getMonth(), 0);
  assertEquals(nextRuns[0].getDate(), 1);
  assertEquals(nextRuns[1].getFullYear(), 2024);
  assertEquals(nextRuns[2].getFullYear(), 2025);
});

test("@annually should be replaced", function () {
  let nextRuns = new Cron("@annually").nextRuns(3, "2022-02-17T00:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2023);
  assertEquals(nextRuns[0].getMonth(), 0);
  assertEquals(nextRuns[0].getDate(), 1);
});
