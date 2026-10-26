import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";
import { timeout } from "./utils.ts";

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
  yesterday.setHours(19, 31, 2, 0);

  const sixDaysFromNow = new Date(now);
  sixDaysFromNow.setDate(now.getDate() + 6);
  sixDaysFromNow.setHours(19, 31, 2, 0);

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
  tomorrow.setHours(0, 31, 2, 0);

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

for (const pattern of ["0 0 0 1 1 * 2020", "0 0 0 29 2 * 2021"]) {
  test(`Exhausted interval with startAt should return no runs: ${pattern}`, function () {
    const scheduler = new Cron(pattern, {
      startAt: "2019-01-01T00:00:00Z",
      interval: 60,
      timezone: "UTC",
    });

    assertEquals(scheduler.nextRun(), null);
    assertEquals(scheduler.nextRuns(3), []);
    assertEquals(scheduler.msToNext(), null);
    assertEquals(scheduler.isRunning(), false);
  });

  test(`Exhausted interval with startAt should not schedule a callback: ${pattern}`, function () {
    const scheduler = new Cron(pattern, {
      startAt: "2019-01-01T00:00:00Z",
      interval: 60,
      timezone: "UTC",
    }, () => {
      throw new Error("Exhausted schedule must not run");
    });

    try {
      assertEquals(scheduler.isRunning(), false);
      assertEquals(scheduler.currentRun(), null);
    } finally {
      scheduler.stop();
    }
  });
}

// Backward compatibility tests for legacyMode -> domAndDow migration
test("domAndDow: false should use OR logic (default)", function () {
  const cron = new Cron("0 12 1 * MON");
  const runs = cron.nextRuns(10);

  // Default should be OR logic (legacy behavior)
  let has1stNotMonday = false;
  let hasMondayNot1st = false;

  for (const run of runs) {
    const is1st = run.getDate() === 1;
    const isMonday = run.getDay() === 1;

    if (is1st && !isMonday) has1stNotMonday = true;
    if (isMonday && !is1st) hasMondayNot1st = true;
  }

  assertEquals(has1stNotMonday || hasMondayNot1st, true, "Should match 1st OR Monday");
});

test("domAndDow: true should use AND logic", function () {
  const cron = new Cron("0 12 1 * MON", { domAndDow: true });
  const runs = cron.nextRuns(5);

  // All runs should be both 1st AND Monday
  for (const run of runs) {
    assertEquals(run.getDate(), 1, "Should be 1st of month");
    assertEquals(run.getDay(), 1, "Should be Monday");
  }
});

test("legacyMode: true should still work (backward compatibility)", function () {
  const cron = new Cron("0 12 1 * MON", { legacyMode: true });
  const runs = cron.nextRuns(10);

  let has1stNotMonday = false;
  let hasMondayNot1st = false;

  for (const run of runs) {
    const is1st = run.getDate() === 1;
    const isMonday = run.getDay() === 1;

    if (is1st && !isMonday) has1stNotMonday = true;
    if (isMonday && !is1st) hasMondayNot1st = true;
  }

  assertEquals(has1stNotMonday || hasMondayNot1st, true, "Should match 1st OR Monday");
});

test("legacyMode: false should still work (backward compatibility)", function () {
  const cron = new Cron("0 12 1 * MON", { legacyMode: false });
  const runs = cron.nextRuns(5);

  // All runs should be both 1st AND Monday
  for (const run of runs) {
    assertEquals(run.getDate(), 1, "Should be 1st of month");
    assertEquals(run.getDay(), 1, "Should be Monday");
  }
});

test("domAndDow should take precedence over legacyMode when both are provided", function () {
  const cron = new Cron("0 12 1 * MON", { legacyMode: false, domAndDow: false });
  const runs = cron.nextRuns(10);

  // domAndDow: false should win, using OR logic
  let has1stNotMonday = false;
  let hasMondayNot1st = false;

  for (const run of runs) {
    const is1st = run.getDate() === 1;
    const isMonday = run.getDay() === 1;

    if (is1st && !isMonday) has1stNotMonday = true;
    if (isMonday && !is1st) hasMondayNot1st = true;
  }

  assertEquals(has1stNotMonday || hasMondayNot1st, true, "Should match 1st OR Monday");
});

test("startAt is inclusive when it falls exactly on a pattern match", function () {
  const job = new Cron("0 0 12 * * *", { timezone: "UTC", startAt: "2025-01-01T12:00:00Z" });
  assertEquals(
    job.nextRun(new Date("2025-01-01T00:00:00Z"))?.toISOString(),
    "2025-01-01T12:00:00.000Z",
  );
  assertEquals(
    job.nextRun(new Date("2025-01-01T12:00:00Z"))?.toISOString(),
    "2025-01-02T12:00:00.000Z",
  );
});

test("startAt string is read in the UTC offset of the job", function () {
  // 12:00 at +02:00 is 10:00 UTC
  const job = new Cron("0 0 12 * * *", { utcOffset: 120, startAt: "2025-01-02T12:00:00" });
  assertEquals(
    job.nextRun(new Date("2025-01-01T00:00:00Z"))?.toISOString(),
    "2025-01-02T10:00:00.000Z",
  );
});

test("startAt between two seconds starts at the next second", function () {
  const startAt = new Date("2026-06-10T12:00:00.400Z");
  for (const tz of [{ utcOffset: 0 }, { timezone: "Europe/Stockholm" }, {}]) {
    const job = new Cron("* * * * * *", { ...tz, startAt });
    assertEquals(
      job.nextRun(new Date("2026-06-01T00:00:00Z"))?.toISOString(),
      "2026-06-10T12:00:01.000Z",
      JSON.stringify(tz),
    );
  }
  const daily = new Cron("0 0 12 * * *", { utcOffset: 0, startAt });
  assertEquals(
    daily.nextRun(new Date("2026-06-01T00:00:00Z"))?.toISOString(),
    "2026-06-11T12:00:00.000Z",
  );
});

test("stopAt between two seconds still includes the second before it", function () {
  const job = new Cron("* * * * * *", {
    timezone: "Europe/Stockholm",
    stopAt: new Date("2026-06-10T12:00:00.400Z"),
  });
  assertEquals(
    job.nextRuns(2, new Date("2026-06-10T11:59:58.500Z")).map((d) => d.toISOString()),
    ["2026-06-10T11:59:59.000Z", "2026-06-10T12:00:00.000Z"],
  );
});

test("startAt and stopAt strings between two seconds behave like Dates", function () {
  // The same instant written as a Date, a Z string, an offset string and a local string
  const cases: [Record<string, unknown>, string][] = [
    [{}, "2026-06-10T12:00:01.400Z"],
    [{ utcOffset: 0 }, "2026-06-10T12:00:01.400"],
    [{ utcOffset: 120 }, "2026-06-10T14:00:01.400"],
    [{ timezone: "Europe/Stockholm" }, "2026-06-10T14:00:01.400"],
    [{ timezone: "America/New_York" }, "2026-06-10T14:00:01.400+02:00"],
  ];
  const date = new Date("2026-06-10T12:00:01.400Z");
  for (const [tz, str] of cases) {
    for (const value of [str, date]) {
      const label = `${JSON.stringify(tz)} ${String(value)}`;
      const started = new Cron("* * * * * *", { ...tz, paused: true, startAt: value });
      assertEquals(
        started.nextRun(new Date("2026-06-10T12:00:00.000Z"))?.toISOString(),
        "2026-06-10T12:00:02.000Z",
        label,
      );
      const stopped = new Cron("* * * * * *", { ...tz, paused: true, stopAt: value });
      assertEquals(
        stopped.nextRuns(3, new Date("2026-06-10T11:59:59.500Z")).map((d) => d.toISOString()),
        ["2026-06-10T12:00:00.000Z", "2026-06-10T12:00:01.000Z"],
        label,
      );
    }
  }
});

test("Date strings with milliseconds are the same instant as Dates", function () {
  const str = "2030-01-01T00:00:00.500Z";
  const date = new Date(str);

  // One-off job
  assertEquals(new Cron(str, { paused: true }).getOnce()?.toISOString(), str);
  assertEquals(new Cron(str, { paused: true }).nextRun()?.toISOString(), str);
  const tokyo = { paused: true, timezone: "Asia/Tokyo" };
  assertEquals(
    new Cron("2030-01-01T09:00:00.500", tokyo).getOnce()?.toISOString(),
    new Cron(date, tokyo).getOnce()?.toISOString(),
  );

  // References
  const job = new Cron("* * * * * *", { paused: true });
  assertEquals(job.msToNext(str), job.msToNext(date));
  assertEquals(job.msToNext(str), 500);
  assertEquals(job.nextRun(str)?.toISOString(), "2030-01-01T00:00:01.000Z");
  assertEquals(
    job.previousRuns(1, str).map((d) => d.toISOString()),
    job.previousRuns(1, date).map((d) => d.toISOString()),
  );
  const utc = new Cron("* * * * * *", { paused: true, utcOffset: 0 });
  assertEquals(utc.msToNext("2030-01-01T00:00:00.500"), 500);
});

test("A one-off date in the same second as startAt runs unless it is before startAt", function () {
  const reference = new Date("2026-06-10T00:00:00Z");
  for (const tz of [{}, { utcOffset: 60 }]) {
    for (const startAt of ["2026-06-10T12:00:00.300Z", new Date("2026-06-10T12:00:00.300Z")]) {
      const label = `${JSON.stringify(tz)} ${String(startAt)}`;
      const after = new Cron("2026-06-10T12:00:00.700Z", { ...tz, paused: true, startAt });
      assertEquals(after.nextRun(reference)?.toISOString(), "2026-06-10T12:00:00.700Z", label);
      const at = new Cron("2026-06-10T12:00:00.300Z", { ...tz, paused: true, startAt });
      assertEquals(at.nextRun(reference)?.toISOString(), "2026-06-10T12:00:00.300Z", label);
      const before = new Cron("2026-06-10T12:00:00.299Z", { ...tz, paused: true, startAt });
      assertEquals(before.nextRun(reference), null, label);
    }
  }
});

test(
  "A job with startAt between two seconds does not run before startAt",
  //@ts-ignore
  timeout(4000, (resolve: () => void, reject: (e: Error) => void) => {
    const startAt = new Date(Math.floor(Date.now() / 1000) * 1000 + 1500);
    let runs = 0;
    const job = new Cron("* * * * * *", { startAt }, () => {
      runs++;
      if (Date.now() < startAt.getTime()) reject(new Error("Ran before startAt"));
    });
    setTimeout(() => {
      job.stop();
      assertEquals(runs <= 2, true, `${runs} runs`);
      resolve();
    }, 2700);
  }),
);

test("Strings are read at the UTC offset of the job", function () {
  // 00:00 at +09:00, the next 03:00 at +09:00 is 3 hours later
  const tokyo = new Cron("0 0 3 * * *", { utcOffset: 540 });
  assertEquals(tokyo.msToNext("2026-01-01T00:00:00"), 3 * 3600 * 1000);
  assertEquals(tokyo.nextRun("2026-01-01T03:30:00")?.toISOString(), "2026-01-01T18:00:00.000Z");
  assertEquals(tokyo.match("2026-01-01T03:00:00"), true);
  assertEquals(tokyo.match("2026-01-01T04:00:00"), false);

  // A string with Z or an offset is an exact instant: 00:00Z is 09:00 at +09:00
  assertEquals(tokyo.msToNext("2026-01-01T00:00:00Z"), 18 * 3600 * 1000);
  assertEquals(tokyo.msToNext("2026-01-01T09:00:00+09:00"), 18 * 3600 * 1000);

  const once = new Cron("2026-01-01T03:00:00", { paused: true, utcOffset: 540 });
  assertEquals(once.getOnce()?.toISOString(), "2025-12-31T18:00:00.000Z");

  const bounded = new Cron("0 0 * * * *", {
    utcOffset: 60,
    startAt: "2026-01-01T03:00:00",
    stopAt: "2026-01-01T05:00:00",
  });
  assertEquals(
    bounded.nextRuns(5, new Date("2025-12-31T00:00:00Z")).map((d) => d.toISOString()),
    ["2026-01-01T02:00:00.000Z", "2026-01-01T03:00:00.000Z"],
  );
});

test("An empty timezone is the same as no timezone", function () {
  const job = new Cron("0 0 12 * * *", { timezone: "", utcOffset: 0 });
  assertEquals(
    job.nextRun(new Date("2026-01-01T00:00:00Z"))?.toISOString(),
    "2026-01-01T12:00:00.000Z",
  );
});
