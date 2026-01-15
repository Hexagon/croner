import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// Basic slash/stepping syntax tests
test("Slash in pattern should not throw", function () {
  let scheduler = new Cron("* */5 * * * *");
  scheduler.nextRun();
});

test("Slash in pattern with number first should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* 5/* * * * *");
    scheduler.nextRun();
  });
});

test("Slash in pattern without following number should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* */ * * * *");
    scheduler.nextRun();
  });
});

test("Slash in pattern with preceding number should throw (strict vixie cron parsing)", function () {
  assertThrows(() => {
    let scheduler = new Cron("* 5/5 * * * *");
    scheduler.nextRun();
  });
});

test("Slash in pattern with preceding letter should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* a/5 * * * *");
    scheduler.nextRun();
  });
});

test("Slash in pattern with letter after should throw should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* */a * * * *");
    scheduler.nextRun();
  });
});

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

test("Slash in pattern with preceding comma separated entries should throw (strict vixie cron parsing)", function () {
  assertThrows(() => {
    let scheduler = new Cron("* 1,2/5 * * * *");
    scheduler.nextRun();
  });
});

test("Slash in pattern with preceding range separated by comma should not throw", function () {
  let scheduler = new Cron("* 1-15/5,6 * * * *");
  scheduler.nextRun();
});

// Stepping value tests
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

test("Steps for hours should yield correct hours with wildcard stepping and comma-separated values", function () {
  let nextRuns = new Cron("1 1 */3,1,10 * * *").nextRuns(10, "2020-01-01T00:00:00");
  assertEquals(nextRuns[0].getHours(), 0);
  assertEquals(nextRuns[1].getHours(), 1);
  assertEquals(nextRuns[2].getHours(), 3);
  assertEquals(nextRuns[3].getHours(), 6);
  assertEquals(nextRuns[4].getHours(), 9);
  assertEquals(nextRuns[5].getHours(), 10);
  assertEquals(nextRuns[6].getHours(), 12);
  assertEquals(nextRuns[7].getHours(), 15);
  assertEquals(nextRuns[8].getHours(), 18);
  assertEquals(nextRuns[9].getHours(), 21);
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

test("Steps for months should yield correct months with wildcard and start date", function () {
  let nextRuns = new Cron("1 1 1 */2 *").nextRuns(10, "2020-05-01T00:00:00");
  assertEquals(nextRuns[0].getMonth(), 4); // May (current month, as */2 includes 0,2,4,6,8,10)
  assertEquals(nextRuns[1].getMonth(), 6); // July
  assertEquals(nextRuns[2].getMonth(), 8); // September
  assertEquals(nextRuns[3].getMonth(), 10); // November
  assertEquals(nextRuns[4].getMonth(), 0); // January (next year)
});

test("Steps for days should yield correct days with wildcard and start date", function () {
  let nextRuns = new Cron("1 1 */3 * *").nextRuns(10, "2020-12-05T00:00:00");
  assertEquals(nextRuns[0].getDate(), 7); // */3 includes 1,4,7,10,13,... next is 7
  assertEquals(nextRuns[1].getDate(), 10);
  assertEquals(nextRuns[2].getDate(), 13);
});
