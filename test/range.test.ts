import { assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

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

test("Slash in pattern with preceding number should not throw", function () {
  let scheduler = new Cron("* 5/5 * * * *");
  scheduler.nextRun();
});

test("Slash in pattern with preceding letter should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* a/5 * * * *");
    scheduler.nextRun();
  });
});

test("Slash in pattern with preceding comma separated entries should not throw", function () {
  let scheduler = new Cron("* 1,2/5 * * * *");
  scheduler.nextRun();
});

test("Slash in pattern with preceding range should not throw", function () {
  let scheduler = new Cron("* 1-15/5 * * * *");
  scheduler.nextRun();
});

test("Slash in pattern with preceding range separated by comma should not throw", function () {
  let scheduler = new Cron("* 1-15/5,6 * * * *");
  scheduler.nextRun();
});

test("Range separated by comma should not throw", function () {
  let scheduler = new Cron("* 1-15,17 * * * *");
  scheduler.nextRun();
});

test("Missing lower range should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* -9 * * * *");
    scheduler.nextRun();
  });
});

test("Missing upper range should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* 0- * * * *");
    scheduler.nextRun();
  });
});

test("Higher upper range than lower range should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* 12-2 * * * *");
    scheduler.nextRun();
  });
});

test("Rangerange should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* 0-0-0 * * * *");
    scheduler.nextRun();
  });
});

test("Valid range should not throw", function () {
  let scheduler = new Cron("* 0-9 * * * *");
  scheduler.nextRun();
});

test("Valid seconds should not throw", function () {
  let scheduler = new Cron("0-59 * * * * *");
  scheduler.nextRun();
});

test("Too high second should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("0-60 * * * * *");
    scheduler.nextRun();
  });
});

test("Valid minutes should not throw", function () {
  let scheduler = new Cron("* 0-59 * * * *");
  scheduler.nextRun();
});

test("Too high minute should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("* 0-5,55,60 * * * *");
    scheduler.nextRun();
  });
});

test("Valid hours should not throw", function () {
  let scheduler = new Cron("* * 0-23 * * *");
  scheduler.nextRun();
});

test("Valid days should not throw", function () {
  let scheduler = new Cron("* * * 1-31 * *");
  scheduler.nextRun();
});

test("Sunday as lower value of range should not throw", function () {
  let scheduler = new Cron("* * * * * SUN-MON");
  scheduler.nextRun();
});

test("Sunday as upper value of range should not throw", function () {
  let scheduler = new Cron("* * * * * MON-SUN");
  scheduler.nextRun();
});
