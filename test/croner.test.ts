import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

test("new Cron(...) should not throw", function () {
  let scheduler = new Cron("* * * * * *");
  scheduler.nextRun();
});

test("Array passed as next date should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * * * *");
    scheduler.nextRun([] as unknown as string);
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
    let scheduler = new Cron("* * * * * *", "bogus" as unknown as Function, { maxRuns: 1 });
    scheduler.nextRun();
  });
});

test("Text as third argument should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* * * * * *", { maxRuns: 1 }, "bogus" as unknown as Function);
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
