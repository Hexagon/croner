import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

test("name should be undefined if it's not specified", function () {
  const scheduler = new Cron("* * * * * *");
  assertEquals(scheduler.name, undefined);
});

test("name should be defined if it's specified", function () {
  const uniqueName = "TestJob5" + new Date().getTime().toString();
  const scheduler = new Cron("* * * * * *", { name: uniqueName });
  assertEquals(scheduler.name, uniqueName);
});

test("Valid startAt with DateTime string should not throw", function () {
  let scheduler = new Cron("0 0 12 * * *", { startAt: "2016-12-01 00:00:00" });
  scheduler.nextRun();
});

test("startAt with Date string should not throw (treated like local 00:00:00)", function () {
  let scheduler = new Cron("0 0 12 * * *", { startAt: "2016-12-01" });
  scheduler.nextRun();
});

test("Invalid startat should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("0 0 12 * * *", { startAt: "hellu throw" });
    scheduler.nextRun();
  });
});

test("startAt with time only should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("0 0 12 * * *", { startAt: "00:35:00" });
    scheduler.nextRun();
  });
});

test("Valid stopAt with Date should not throw", function () {
  let dayBefore = new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // Subtract one day
    scheduler = new Cron("0 0 12 * * *", { stopAt: dayBefore });
  scheduler.nextRun();
});

test("Valid stopAt with DateTime string should not throw", function () {
  let scheduler = new Cron("0 0 12 * * *", { stopAt: "2016-12-01 00:00:00" });
  scheduler.nextRun();
});

test("Valid stopAt with Date string should not throw", function () {
  let scheduler = new Cron("0 0 12 * * *", { stopAt: "2016-12-01" });
  scheduler.nextRun();
});

test("Invalid stopAt should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("0 0 12 * * *", { stopAt: "hellu throw" });
    scheduler.nextRun();
  });
});

test("Invalid unref should throw", function () {
  assertThrows(() => {
    //@ts-ignore Invalid option
    let scheduler = new Cron("0 0 12 * * *", { unref: "hellu throw" });
    scheduler.nextRun();
  });
});
test("Valid unref should not throw", function () {
  let scheduler = new Cron("0 0 12 * * *", { unref: true });
  scheduler.nextRun();
});
test("Setting unref to true should work", function () {
  let scheduler = new Cron("0 0 12 * * *", { unref: true }, () => {});
  scheduler.nextRun();
  scheduler.stop();
  assertEquals(scheduler.options.unref, true);
});
test("Undefined unref should set unref to false", function () {
  let scheduler = new Cron("0 0 12 * * *");
  scheduler.nextRun();
  assertEquals(scheduler.options.unref, false);
});
test("Valid utc offset should not throw", function () {
  new Cron("0 0 12 * * *", { utcOffset: -120 });
});
test("Invalid utc offset should throw", function () {
  assertThrows(() => {
    //@ts-ignore Invalid option is expected
    new Cron("0 0 12 * * *", { utcOffset: "hello" });
  });
});
test("Out of bounds utc offset should throw", function () {
  assertThrows(() => {
    new Cron("0 0 12 * * *", { utcOffset: 3000 });
  });
});
test("Combining utcOffset with timezone should throw", function () {
  assertThrows(() => {
    new Cron("0 0 12 * * *", { utcOffset: 60, timezone: "Europe/Stockholm" });
  });
});
test("stopAt with time only should throw", function () {
  assertThrows(() => {
    let scheduler = new Cron("0 0 12 * * *", { stopAt: "00:35:00" });
    scheduler.nextRun();
  });
});
test("0 0 0 * * * with startdate yesterday should return tomorrow, at 12:00:00", function () {
  let dayBefore = new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // Subtract one day
    nextDay = new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Add two days
    scheduler,
    nextRun;

  // Set a fixed hour later than startAt, to be sure that the days doesn't overlap
  dayBefore = new Date(dayBefore.setHours(0));
  nextDay = new Date(nextDay.setHours(0));

  scheduler = new Cron("0 0 0 * * *", { startAt: dayBefore });
  nextRun = scheduler.nextRun();

  // Set seconds, minutes and hours to 00:00:00
  nextDay.setMilliseconds(0);
  nextDay.setSeconds(0);
  nextDay.setMinutes(0);
  nextDay.setHours(0);

  // Do comparison
  assertEquals(nextRun?.getTime(), nextDay.getTime());
});

test("0 0 12 * * * with stopdate yesterday should return null", function () {
  let dayBefore = new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // Subtract one day
    scheduler = new Cron("0 0 12 * * *", {
      timezone: "Etc/UTC",
      stopAt: dayBefore.toISOString(),
    }),
    nextRun = scheduler.nextRun();

  // Do comparison
  assertEquals(nextRun, null);
});

test("Invalid interval should throw", function () {
  assertThrows(() => {
    //@ts-ignore Invalid option is expected
    new Cron("* * * * * *", { interval: "a" }).nextRuns(3, "2022-02-17T00:00:00");
  });
});

test("Negative interval should throw", function () {
  assertThrows(() => {
    //@ts-ignore Invalid option is expected
    new Cron("* * * * * *", { interval: "-1" }).nextRuns(3, "2022-02-17T00:00:00");
  });
});

test("Positive string interval should not throw", function () {
  //@ts-ignore Invalid option is expected
  new Cron("* * * * * *", { interval: "102" }).nextRuns(3, "2022-02-17T00:00:00");
});

test("Valid interval should give correct run times", function () {
  let nextRuns = new Cron("0,30 * * * * *", { interval: 90 }).nextRuns(3, "2022-02-16T00:00:00");

  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 1);
  assertEquals(nextRuns[0].getDate(), 16);
  assertEquals(nextRuns[0].getHours(), 0);
  assertEquals(nextRuns[0].getMinutes(), 1);
  assertEquals(nextRuns[0].getSeconds(), 30);
  assertEquals(nextRuns[1].getHours(), 0);
  assertEquals(nextRuns[1].getMinutes(), 3);
  assertEquals(nextRuns[1].getSeconds(), 0);
});

test("The number of run times returned by enumerate() should not be more than maxRuns", function () {
  let nextRuns = new Cron("* * * * * *", { maxRuns: 5 }).nextRuns(10);

  assertEquals(nextRuns.length, 5);
});

test("Valid interval starting in the past should give correct start date", function () {
  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(19, 31, 2);

  const sixDaysFromNow = new Date(now);
  sixDaysFromNow.setDate(now.getDate() + 6);
  sixDaysFromNow.setHours(19, 31, 2);

  const nextRun = new Cron("* * * * * *", {
    interval: 60 * 60 * 24 * 7,
    startAt: yesterday.toISOString(),
  }).nextRun();

  assertEquals(nextRun?.getFullYear(), sixDaysFromNow.getFullYear());
  assertEquals(nextRun?.getMonth(), sixDaysFromNow.getMonth());
  assertEquals(nextRun?.getDate(), sixDaysFromNow.getDate());
  assertEquals(nextRun?.getHours(), sixDaysFromNow.getHours());
  assertEquals(nextRun?.getMinutes(), sixDaysFromNow.getMinutes());
  assertEquals(nextRun?.getSeconds(), sixDaysFromNow.getSeconds());
});

test("Valid interval starting in the future should give correct start date", function () {
  const now = new Date();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 31, 2);

  const nextRun = new Cron("* * * * * *", {
    interval: 60 * 60 * 24 * 7,
    startAt: tomorrow.toISOString(),
  }).nextRun();

  assertEquals(nextRun?.getFullYear(), tomorrow.getFullYear());
  assertEquals(nextRun?.getMonth(), tomorrow.getMonth());
  assertEquals(nextRun?.getDate(), tomorrow.getDate());
  assertEquals(nextRun?.getHours(), tomorrow.getHours());
  assertEquals(nextRun?.getMinutes(), tomorrow.getMinutes());
  assertEquals(nextRun?.getSeconds(), tomorrow.getSeconds());
});
