import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

test("Slash in pattern with wildcards both pre and post should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* */* * * * *");
    scheduler.nextRun();
  });
});

test("Slash in pattern with range pre should not throw", function () {
  let scheduler = new Cron("* 15-45/15 * * * *");
  scheduler.nextRun();
});

test("Slash in pattern with zero stepping should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* */0 * * * *");
    scheduler.nextRun();
  });
});

test("Range with stepping with zero stepping should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* 10-20/0 * * * *");
    scheduler.nextRun();
  });
});

test("Range with stepping with illegal upper range should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* 10-70/5 * * * *");
    scheduler.nextRun();
  });
});

test("Range with stepping with illegal range should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* 50-40/5 * * * *");
    scheduler.nextRun();
  });
});

test("Slash in pattern with letter after should throw should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* */a * * * *");
    scheduler.nextRun();
  });
});

test("Slash in pattern with too high stepping should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* */61 * * * *");
    scheduler.nextRun();
  });
});

test("Multiple stepping should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* */5/5 * * * *");
    scheduler.nextRun();
  });
});

test("Steps for hours should yield correct hours", function () {
  let nextRuns = new Cron("1 1 */3 * * *").nextRuns(10, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getHours(), 0);
  assertEquals(nextRuns[1].getHours(), 3);
  assertEquals(nextRuns[2].getHours(), 6);
  assertEquals(nextRuns[3].getHours(), 9);
  assertEquals(nextRuns[4].getHours(), 12);
  assertEquals(nextRuns[5].getHours(), 15);
  assertEquals(nextRuns[6].getHours(), 18);
  assertEquals(nextRuns[7].getHours(), 21);
  assertEquals(nextRuns[8].getHours(), 0);
  assertEquals(nextRuns[9].getHours(), 3);
});

test("Steps for hours should yield correct hours with range", function () {
  let nextRuns = new Cron("1 1 0-23/3 * * *").nextRuns(10, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getHours(), 0);
  assertEquals(nextRuns[1].getHours(), 3);
  assertEquals(nextRuns[2].getHours(), 6);
  assertEquals(nextRuns[3].getHours(), 9);
  assertEquals(nextRuns[4].getHours(), 12);
  assertEquals(nextRuns[5].getHours(), 15);
  assertEquals(nextRuns[6].getHours(), 18);
  assertEquals(nextRuns[7].getHours(), 21);
  assertEquals(nextRuns[8].getHours(), 0);
  assertEquals(nextRuns[9].getHours(), 3);
});

test("Steps for hours should yield correct hours with range and stepping and comma-separated values", function () {
  let nextRuns = new Cron("1 1 0-12/3,1,10 * * *").nextRuns(10, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getHours(), 0);
  assertEquals(nextRuns[1].getHours(), 1);
  assertEquals(nextRuns[2].getHours(), 3);
  assertEquals(nextRuns[3].getHours(), 6);
  assertEquals(nextRuns[4].getHours(), 9);
  assertEquals(nextRuns[5].getHours(), 10);
  assertEquals(nextRuns[6].getHours(), 12);
});

test("Steps for hours should yield correct hours with stepping and comma-separated values", function () {
  let nextRuns = new Cron("1 1 12/3,1,10 * * *").nextRuns(10, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getHours(), 1);
  assertEquals(nextRuns[1].getHours(), 10);
  assertEquals(nextRuns[2].getHours(), 12);
  assertEquals(nextRuns[3].getHours(), 15);
  assertEquals(nextRuns[4].getHours(), 18);
  assertEquals(nextRuns[5].getHours(), 21);
});

test("Steps for hours should yield correct hours with range and comma-separated values", function () {
  let nextRuns = new Cron("1 1 0-6,1,10 * * *").nextRuns(10, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getHours(), 0);
  assertEquals(nextRuns[1].getHours(), 1);
  assertEquals(nextRuns[2].getHours(), 2);
  assertEquals(nextRuns[3].getHours(), 3);
  assertEquals(nextRuns[4].getHours(), 4);
  assertEquals(nextRuns[5].getHours(), 5);
  assertEquals(nextRuns[6].getHours(), 6);
  assertEquals(nextRuns[7].getHours(), 10);
});

test("Steps for hours should yield correct hours with offset range and comma-separated values on wednesdays (legacy mode)", function () {
  let nextRuns = new Cron("1 1 3-8/2,1,10 * * sat").nextRuns(10, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2020);
  assertEquals(nextRuns[0].getMonth(), 0);
  assertEquals(nextRuns[0].getDate(), 4);
  assertEquals(nextRuns[0].getHours(), 1);
  assertEquals(nextRuns[1].getHours(), 3);
  assertEquals(nextRuns[2].getHours(), 5);
  assertEquals(nextRuns[3].getHours(), 7);
  assertEquals(nextRuns[4].getHours(), 10);
  assertEquals(nextRuns[5].getHours(), 1);
});

test("Steps for months should yield correct months", function () {
  let nextRuns = new Cron("1 1 1 */3 *").nextRuns(10, "2020-12-31T23:59:59");
  assertEquals(nextRuns[0].getMonth(), 0);
  assertEquals(nextRuns[1].getMonth(), 3);
  assertEquals(nextRuns[2].getMonth(), 6);
  assertEquals(nextRuns[3].getMonth(), 9);
});

test("Steps for months should yield correct months with range", function () {
  let nextRuns = new Cron("1 1 1 1-12/3 *").nextRuns(10, "2020-12-31T23:59:59");
  assertEquals(nextRuns[0].getMonth(), 0);
  assertEquals(nextRuns[1].getMonth(), 3);
  assertEquals(nextRuns[2].getMonth(), 6);
  assertEquals(nextRuns[3].getMonth(), 9);
});

test("Steps for months should yield correct months with range and start date", function () {
  let nextRuns = new Cron("1 1 1 5/2 *").nextRuns(10, "2020-12-31T23:59:59");
  assertEquals(nextRuns[0].getMonth(), 4);
  assertEquals(nextRuns[1].getMonth(), 6);
  assertEquals(nextRuns[2].getMonth(), 8);
  assertEquals(nextRuns[3].getMonth(), 10);
  assertEquals(nextRuns[4].getMonth(), 4);
});

test("Steps for days should yield correct days with range and start date", function () {
  let nextRuns = new Cron("1 1 5/3 * *").nextRuns(10, "2020-12-31T23:59:59");
  assertEquals(nextRuns[0].getDate(), 5);
  assertEquals(nextRuns[1].getDate(), 8);
  assertEquals(nextRuns[2].getDate(), 11);
});
