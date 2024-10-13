import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron, scheduledJobs } from "../src/croner.ts";
import { sleep, timeout } from "./utils.ts";

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
test(
  "Context is passed",
  //@ts-ignore
  timeout(2000, (resolve, reject) => {
    const c = { a: "b" };
    new Cron("* * * * * *", { context: c }, (self: Cron, context: { a: string }) => {
      self.stop();
      if (!context || (context && context.a && context.a !== "b")) {
        reject(new Error("Failure"));
      } else {
        resolve();
      }
    });
  }),
);

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

test("@monthly should be replaced", function () {
  let nextRuns = new Cron("@monthly").nextRuns(3, "2022-02-17T00:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 2);
  assertEquals(nextRuns[0].getDate(), 1);
  assertEquals(nextRuns[1].getMonth(), 3);
  assertEquals(nextRuns[1].getDate(), 1);
  assertEquals(nextRuns[2].getMonth(), 4);
  assertEquals(nextRuns[2].getDate(), 1);
});

test("@weekly should be replaced", function () {
  let nextRuns = new Cron("@weekly").nextRuns(3, "2022-02-17T00:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 1);
  assertEquals(nextRuns[0].getDate(), 20);
  assertEquals(nextRuns[1].getMonth(), 1);
  assertEquals(nextRuns[1].getDate(), 27);
  assertEquals(nextRuns[2].getMonth(), 2);
  assertEquals(nextRuns[2].getDate(), 6);
});

test("@weekly should be replaced", function () {
  let nextRuns = new Cron("@daily").nextRuns(3, "2022-02-17T12:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 1);
  assertEquals(nextRuns[0].getDate(), 18);
  assertEquals(nextRuns[1].getMonth(), 1);
  assertEquals(nextRuns[1].getDate(), 19);
  assertEquals(nextRuns[2].getMonth(), 1);
  assertEquals(nextRuns[2].getDate(), 20);
});

test("@wekly should throw", function () {
  assertThrows(() => {
    new Cron("@wekly").nextRuns(3, "2022-02-17T12:00:00");
  });
});

test("@hourly should be replaced (UTC)", function () {
  let nextRuns = new Cron("@hourly").nextRuns(3, "2022-02-16T23:59:00Z");
  assertEquals(nextRuns[0].getUTCFullYear(), 2022);
  assertEquals(nextRuns[0].getUTCMonth(), 1);
  assertEquals(nextRuns[0].getUTCDate(), 17);
  assertEquals(nextRuns[0].getUTCHours(), 0);
  assertEquals(nextRuns[1].getUTCMonth(), 1);
  assertEquals(nextRuns[1].getUTCDate(), 17);
  assertEquals(nextRuns[1].getUTCHours(), 1);
  assertEquals(nextRuns[2].getUTCHours(), 2);
});

test("@hourly should be replaced (Local)", function () {
  let nextRuns = new Cron("@hourly").nextRuns(3, "2022-02-16T23:59:00");
  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 1);
  assertEquals(nextRuns[0].getDate(), 17);
  assertEquals(nextRuns[0].getHours(), 0);
  assertEquals(nextRuns[1].getMonth(), 1);
  assertEquals(nextRuns[1].getDate(), 17);
  assertEquals(nextRuns[1].getHours(), 1);
  assertEquals(nextRuns[2].getHours(), 2);
});

test("Croner should increment seconds", function () {
  let runs = new Cron("* * * * * *").nextRuns(4);
  assertEquals(runs[0] < runs[1], true);
  assertEquals(runs[1] < runs[2], true);
  assertEquals(runs[2] < runs[3], true);
});

test("Croner should increment minutes", function () {
  let runs = new Cron("0 * * * * *").nextRuns(4);
  assertEquals(runs[0] < runs[1], true);
  assertEquals(runs[1] < runs[2], true);
  assertEquals(runs[2] < runs[3], true);
});

test("Croner should increment hours", function () {
  let runs = new Cron("0 0 * * * *").nextRuns(4);
  assertEquals(runs[0] < runs[1], true);
  assertEquals(runs[1] < runs[2], true);
  assertEquals(runs[2] < runs[3], true);
});

test("Croner should increment days", function () {
  let runs = new Cron("0 0 0 * * *").nextRuns(4);
  assertEquals(true, runs[0] < runs[1]);
  assertEquals(true, runs[1] < runs[2]);
  assertEquals(true, runs[2] < runs[3]);
});
test("Croner should increment months", function () {
  let runs = new Cron("0 0 0 1 * *").nextRuns(4);
  assertEquals(true, runs[0] < runs[1]);
  assertEquals(true, runs[1] < runs[2]);
  assertEquals(true, runs[2] < runs[3]);
});

test("Croner should increment years", function () {
  let runs = new Cron("0 0 0 1 12 *").nextRuns(4);
  assertEquals(true, runs[0] < runs[1]);
  assertEquals(true, runs[1] < runs[2]);
  assertEquals(true, runs[2] < runs[3]);
});

test("Croner should increment weeks", function () {
  let runs = new Cron("0 0 0 * * 1").nextRuns(4);
  assertEquals(true, runs[0] < runs[1]);
  assertEquals(true, runs[1] < runs[2]);
  assertEquals(true, runs[2] < runs[3]);
});

test("Croner should increment last day of month", function () {
  let runs = new Cron("0 0 0 L * *").nextRuns(4);
  assertEquals(true, runs[0] < runs[1]);
  assertEquals(true, runs[1] < runs[2]);
  assertEquals(true, runs[2] < runs[3]);
});

test("Croner should give correct last day of months", function () {
  let runs = new Cron("0 0 0 L * *").nextRuns(4, "2022-01-01T00:00:00");

  assertEquals(runs[0].getFullYear(), 2022);
  assertEquals(runs[0].getMonth(), 0);
  assertEquals(runs[0].getDate(), 31);
  assertEquals(runs[0].getHours(), 0);

  assertEquals(runs[1].getFullYear(), 2022);
  assertEquals(runs[1].getMonth(), 1);
  assertEquals(runs[1].getDate(), 28);
  assertEquals(runs[1].getHours(), 0);

  assertEquals(runs[2].getFullYear(), 2022);
  assertEquals(runs[2].getMonth(), 2);
  assertEquals(runs[2].getDate(), 31);
  assertEquals(runs[2].getHours(), 0);
});

test("Croner should give correct last day of months when combined with other dates", function () {
  let runs = new Cron("0 0 0 15,L * *").nextRuns(4, "2022-01-01T00:00:00");

  assertEquals(runs[0].getFullYear(), 2022);
  assertEquals(runs[0].getMonth(), 0);
  assertEquals(runs[0].getDate(), 15);
  assertEquals(runs[0].getHours(), 0);

  assertEquals(runs[1].getFullYear(), 2022);
  assertEquals(runs[1].getMonth(), 0);
  assertEquals(runs[1].getDate(), 31);
  assertEquals(runs[1].getHours(), 0);

  assertEquals(runs[2].getFullYear(), 2022);
  assertEquals(runs[2].getMonth(), 1);
  assertEquals(runs[2].getDate(), 15);
  assertEquals(runs[2].getHours(), 0);

  assertEquals(runs[3].getFullYear(), 2022);
  assertEquals(runs[3].getMonth(), 1);
  assertEquals(runs[3].getDate(), 28);
  assertEquals(runs[3].getHours(), 0);
});

test("Impossible combination should result in null (non legacy mode)", function () {
  let impossible = new Cron("0 0 0 30 2 6", { legacyMode: false }).nextRun(new Date(1634076000000));
  assertEquals(null, impossible);
});
test(
  "currentRun() and previousRun() should be set at correct points in time",
  //@ts-ignore
  timeout(4000, (resolve: () => void) => {
    let job = new Cron("* * * * * *", () => {
      assertEquals(true, job.currentRun() !== null);
      assertEquals(job.previousRun(), null);
      job.stop();
    });
    assertEquals(job.currentRun(), null);
    setTimeout(() => {
      assertEquals(true, job.previousRun() !== null);
      resolve();
    }, 2000);
  }),
);
test(
  "scheduled job should not stop on unhandled error with option catch: true",
  //@ts-ignore
  timeout(4000, (resolve) => {
    let first = true;
    let job = new Cron("* * * * * *", { catch: true }, () => {
      if (first) {
        first = false;
        throw new Error("E");
      }
      job.stop();
      resolve();
    });
  }),
);
test(
  "scheduled job should execute callback on unhandled error with option catch: callback()",
  //@ts-ignore
  timeout(4000, (resolve) => {
    let job = new Cron("* * * * * *", {
      catch: (e) => {
        assertEquals(e instanceof Error, true);
        resolve();
      },
    }, () => {
      job.stop();
      throw new Error("E");
    });
  }),
);
test(
  "scheduled job should execute callback on unhandled error with option catch: callback()",
  //@ts-ignore
  timeout(4000, (resolve) => {
    let job = new Cron("* * * * * *", {
      catch: async (e) => {
        assertEquals(e instanceof Error, true);
        resolve();
      },
    }, async () => {
      job.stop();
      throw new Error("E");
    });
  }),
);
test("Initializing two jobs with the same name should throw", () => {
  const uniqueName = "TestJob1" + new Date().getTime().toString();
  new Cron("* * * * * *", { name: uniqueName, paused: true });
  assertThrows(() => {
    new Cron("* * * * * *", { name: uniqueName, paused: true });
  }, "already taken");
});

test("Created jobs should appear in the 'scheduledJobs' array", function () {
  const uniqueName = "TestJob3" + new Date().getTime().toString();
  const job = new Cron("* * * * * *", { name: uniqueName });
  assertEquals(scheduledJobs.find((j) => j === job), job);
});

test(
  "named job should be found in other scope",
  //@ts-ignore
  timeout(4000, (resolve) => {
    const uniqueName = "TestJob2" + new Date().getTime().toString();
    (() => {
      new Cron("* * * * * *", { name: uniqueName });
    })();
    setTimeout(() => {
      const foundJob = scheduledJobs.find((j) => j.name === uniqueName);
      if (foundJob && foundJob.name === uniqueName) {
        foundJob.stop();
        resolve();
      }
    }, 1500);
  }),
);

test("named job should not be found after .stop()", () => {
  const uniqueName = "TestJob4" + new Date().getTime().toString();
  const job = new Cron("* * * * * *", { name: uniqueName });
  const foundJob = scheduledJobs.find((j) => j === job);
  assertEquals(foundJob && foundJob.name === uniqueName, true);
  job.stop();
  const notFoundJob = scheduledJobs.find((j) => j === job);
  assertEquals(!!notFoundJob, false);
});

test(
  "unnamed job should not be found in other scope",
  //@ts-ignore
  timeout(4000, (resolve) => {
    let ref: undefined | Cron;
    (() => {
      ref = new Cron("* * * * * *", { paused: true });
    })();
    setTimeout(() => {
      const found = scheduledJobs.find((job) => job === ref);
      if (!found) {
        resolve();
      }
      ref!.stop();
    }, 500);
  }),
);

test(
  "shorthand schedule without options should not throw, and execute",
  //@ts-ignore
  timeout(2000, (resolve, reject) => {
    try {
      let job = new Cron("* * * * * *", () => {
        job.stop();
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  }),
);
test("sanity check start stop resume", function () {
  let job = new Cron("* * * 1 11 4", () => {});
  assertEquals(job.isRunning(), true);
  assertEquals(job.isStopped(), false);
  job.pause();
  assertEquals(job.isRunning(), false);
  assertEquals(job.isStopped(), false);
  job.resume();
  assertEquals(job.isRunning(), true);
  assertEquals(job.isStopped(), false);
  job.stop();
  assertEquals(job.isRunning(), false);
  assertEquals(job.isStopped(), true);
});

test(
  "trigger should run a paused job",
  //@ts-ignore
  timeout(4000, (resolve) => {
    let job = new Cron("* * * * * *", { paused: true }, () => {
      job.stop();
      resolve();
    });
    job.trigger();
  }),
);
test(
  "trigger should run a stopped job",
  //@ts-ignore
  timeout(4000, (resolve) => {
    let job = new Cron("* * * * * *", { paused: true }, () => {
      job.stop();
      resolve();
    });
    job.stop();
    job.trigger();
  }),
);
test("previous run time should be null if not yet executed", function () {
  let job = new Cron("* * * 1 11 4", () => {});
  let result = job.previousRun();
  assertEquals(result, null);
  job.stop();
});
test(
  "previous run time should be set if executed",
  //@ts-ignore
  timeout(2000, (resolve, reject) => {
    let scheduler = new Cron("* * * * * *", { maxRuns: 1 });
    scheduler.schedule(function () {});
    setTimeout(function () {
      let previous = scheduler.previousRun()!;
      // Do comparison
      try {
        assertEquals(true, previous?.getTime() >= new Date().getTime() - 3000);
        assertEquals(true, previous?.getTime() <= new Date().getTime() + 3000);
        scheduler.stop();
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 1500);
  }),
);

test("Isrunning should not throw, and return correct value after control functions is used", function () {
  let scheduler0 = new Cron("0 0 0 * * 0");
  assertEquals(scheduler0.isRunning(), false);
  scheduler0.schedule(() => {});
  assertEquals(scheduler0.isRunning(), true);
  scheduler0.pause();
  assertEquals(scheduler0.isRunning(), false);
  scheduler0.resume();
  assertEquals(scheduler0.isRunning(), true);
  scheduler0.stop();
  assertEquals(scheduler0.isRunning(), false);
});

test("maxRuns should be inherited from scheduler to job", function () {
  let scheduler = new Cron("* * * 1 11 4", { maxRuns: 14 }),
    job = scheduler.schedule(() => {});
  assertEquals(job.runsLeft(), 14);
  job.stop();
});

test("Test milliseconds to 01:01:01 XXXX-01-01 (most often next year), 1000s steps", function () {
  let prevRun = new Date(new Date().setMilliseconds(0)),
    target = new Date(new Date((prevRun.getFullYear() + 1) + "-01-01 01:01:01").getTime()),
    scheduler = new Cron("1 1 1 1 1 *"),
    left,
    diff;

  assertEquals(target.getTime(), scheduler.nextRun()?.getTime());
  if (target.getTime() === scheduler.nextRun()?.getTime()) {
    while (prevRun < target) {
      left = scheduler.msToNext(prevRun)!;
      diff = Math.abs((target.getTime() - prevRun.getTime()) - left);
      assertEquals(true, diff <= 1000);
      assertEquals(true, diff >= 0);

      // Advance 1000s
      prevRun.setMilliseconds(1000000);
    }
  }
});

test("Test milliseconds to 23:59:59 XXXX-01-01 (most often next year), 1000s steps", function () {
  let prevRun = new Date(new Date().setMilliseconds(0)),
    target = new Date(new Date((prevRun.getFullYear() + 1) + "-01-01 23:59:59").getTime()),
    scheduler = new Cron("59 59 23 1 1 *"),
    left,
    diff;

  assertEquals(target.getTime(), scheduler.nextRun()?.getTime());

  if (target.getTime() === scheduler.nextRun()?.getTime()) {
    while (prevRun < target) {
      left = scheduler.msToNext(prevRun);
      diff = Math.abs((target.getTime() - prevRun.getTime()) - left!);
      assertEquals(true, diff <= 1000);
      assertEquals(true, diff >= 0);

      // Advance 1000s
      prevRun.setMilliseconds(1000000);
    }
  }
});

test("Test when next thursday 1st november occurr, starting from 2021-10-13 00:00:00 (croner mode)", function () {
  assertEquals(
    new Cron("0 0 0 1 11 4", { legacyMode: false }).nextRun(new Date(1634076000000))?.getFullYear(),
    2029,
  );
});

test("Test when next thursday 1st november occurr, starting from 2021-10-13 00:00:00 (legacy/default mode)", function () {
  assertEquals(new Cron("0 0 0 1 11 4").nextRun(new Date(1634076000000))?.getFullYear(), 2021);
});

test("Next saturday at 29th of february should occur 2048. Also test weekday an month names and case insensitivity (croner mode)", function () {
  let nextSaturday29feb = new Cron("0 0 0 29 feb SAT", { legacyMode: false }).nextRun(
    new Date(1634076000000),
  );
  assertEquals(nextSaturday29feb?.getFullYear(), 2048);
});

test(
  "scheduler should be passed as first argument to triggered function",
  //@ts-ignore
  timeout(2000, (resolve) => {
    let scheduler = new Cron("* * * * * *", { maxRuns: 1 });
    scheduler.schedule(function (self: Cron) {
      assertEquals(typeof self.pause, "function");
      resolve();
    });
  }),
);

test("0 0 0 * * * with 365 iterations should return 365 days from now", function () {
  let scheduler = new Cron("0 0 0 * * *"),
    prevRun: Date | null = new Date(),
    nextRun: Date | undefined | null,
    iterations = 365,
    compareDay = new Date();

  compareDay.setDate(compareDay.getDate() + iterations);

  while (iterations-- > 0) {
    nextRun = scheduler.nextRun(prevRun), prevRun = nextRun;
  }

  // Set seconds, minutes and hours to 00:00:00
  compareDay.setMilliseconds(0);
  compareDay.setSeconds(0);
  compareDay.setMinutes(0);
  compareDay.setHours(0);

  // Do comparison
  assertEquals(nextRun?.getTime(), compareDay.getTime());
});

test("0 * * * * * with 40 iterations should return 45 minutes from now", function () {
  let scheduler = new Cron("0 * * * * *"),
    prevRun: Date | null = new Date(),
    nextRun,
    iterations = 45,
    compareDay = new Date(new Date().getTime() + 45 * 60 * 1000);

  while (iterations-- > 0) {
    nextRun = scheduler.nextRun(prevRun), prevRun = nextRun;
  }

  // Set seconds, minutes and hours to 00:00:00
  compareDay.setMilliseconds(0);
  compareDay.setSeconds(0);

  // Do comparison
  assertEquals(nextRun?.getTime(), compareDay.getTime());
});

test("0 * * * * * with 40 iterations should return 45 minutes from now (legacy mode)", function () {
  let scheduler = new Cron("0 * * * * *", { legacyMode: true }),
    prevRun: Date | null = new Date(),
    nextRun,
    iterations = 45,
    compareDay = new Date(new Date().getTime() + 45 * 60 * 1000);

  while (iterations-- > 0) {
    nextRun = scheduler.nextRun(prevRun), prevRun = nextRun;
  }

  // Set seconds, minutes and hours to 00:00:00
  compareDay.setMilliseconds(0);
  compareDay.setSeconds(0);

  // Do comparison
  assertEquals(nextRun?.getTime(), compareDay.getTime());
});

test("Invalid ISO 8601 local string should throw", function () {
  assertThrows(() => {
    let scheduler0 = new Cron("2020-13-01T00:00:00");
    assertEquals(scheduler0.nextRun(), null);
  });
});

test("Invalid ISO 8601 UTC string should throw", function () {
  assertThrows(() => {
    let scheduler0 = new Cron("2020-13-01T00:00:00Z");
    assertEquals(scheduler0.nextRun(), null);
  });
});

test("Weekday pattern should return correct weekdays", function () {
  let nextRuns = new Cron("0 0 0 * * 5,6").nextRuns(10, "2022-02-17T00:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 1);
  assertEquals(nextRuns[0].getDate(), 18);
  assertEquals(nextRuns[1].getDate(), 19);
  assertEquals(nextRuns[2].getDate(), 25);
  assertEquals(nextRuns[3].getDate(), 26);
  assertEquals(nextRuns[4].getMonth(), 2);
  assertEquals(nextRuns[4].getDate(), 4);
  assertEquals(nextRuns[5].getDate(), 5);
});

test("Weekday pattern should return correct weekdays (legacy mode)", function () {
  let nextRuns = new Cron("0 0 0 * * 5,6").nextRuns(10, "2022-02-17T00:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 1);
  assertEquals(nextRuns[0].getDate(), 18);
  assertEquals(nextRuns[1].getDate(), 19);
  assertEquals(nextRuns[2].getDate(), 25);
  assertEquals(nextRuns[3].getDate(), 26);
  assertEquals(nextRuns[4].getMonth(), 2);
  assertEquals(nextRuns[4].getDate(), 4);
  assertEquals(nextRuns[5].getDate(), 5);
});

test("Weekday pattern should return correct combined with day of month (croner mode)", function () {
  let nextRuns = new Cron("59 59 23 2 * 6", { legacyMode: false }).nextRuns(
    2,
    "2022-02-17T00:00:00",
  );
  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 3);
  assertEquals(nextRuns[0].getDate(), 2);
  assertEquals(nextRuns[1].getFullYear(), 2022);
  assertEquals(nextRuns[1].getMonth(), 6);
  assertEquals(nextRuns[1].getDate(), 2);
});

test("Weekday pattern should return correct weekdays (legacy mode)", function () {
  let nextRuns = new Cron("0 0 0 * * 5,6").nextRuns(10, "2022-02-17T00:00:00");
  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 1);
  assertEquals(nextRuns[0].getDate(), 18);
  assertEquals(nextRuns[1].getDate(), 19);
  assertEquals(nextRuns[2].getDate(), 25);
  assertEquals(nextRuns[3].getDate(), 26);
  assertEquals(nextRuns[4].getMonth(), 2);
  assertEquals(nextRuns[4].getDate(), 4);
  assertEquals(nextRuns[5].getDate(), 5);
});

test("Weekday pattern should return correct combined with day of month (legacy mode)", function () {
  const nextRuns = new Cron("59 59 23 2 * 6", { legacyMode: true }).nextRuns(
    6,
    "2022-01-31T00:00:00",
  );
  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 1);
  assertEquals(nextRuns[0].getDate(), 2);
  assertEquals(nextRuns[1].getMonth(), 1);
  assertEquals(nextRuns[1].getDate(), 5);
  assertEquals(nextRuns[2].getMonth(), 1);
  assertEquals(nextRuns[2].getDate(), 12);
  assertEquals(nextRuns[3].getMonth(), 1);
  assertEquals(nextRuns[3].getDate(), 19);
  assertEquals(nextRuns[4].getMonth(), 1);
  assertEquals(nextRuns[4].getDate(), 26);
  assertEquals(nextRuns[5].getMonth(), 2);
  assertEquals(nextRuns[5].getDate(), 2);
});

test("Weekday pattern should return correct alone (legacy mode)", function () {
  const nextRuns = new Cron("15 9 * * mon", { legacyMode: true }).nextRuns(
    3,
    "2022-02-28T23:59:00",
  );
  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 2);
  assertEquals(nextRuns[0].getDate(), 7);
  assertEquals(nextRuns[0].getHours(), 9);
  assertEquals(nextRuns[0].getMinutes(), 15);

  assertEquals(nextRuns[1].getDate(), 14);
  assertEquals(nextRuns[1].getHours(), 9);
  assertEquals(nextRuns[1].getMinutes(), 15);

  assertEquals(nextRuns[2].getDate(), 21);
  assertEquals(nextRuns[2].getHours(), 9);
  assertEquals(nextRuns[2].getMinutes(), 15);
});

test("Invalid date should throw", function () {
  assertThrows(() => {
    new Cron("15 9 * * mon", { legacyMode: true }).nextRun(new Date("pizza"));
  });
});

test("Specific date should not create infinite loop (legacy mode)", function () {
  const cron = new Cron("0 * * * mon,tue,wed,fri,sat,sun", {
      legacyMode: true,
    }),
    next = cron.nextRun(new Date("2022-03-31T11:40:34"));
  assertEquals(next?.getFullYear(), 2022);
  assertEquals(next?.getMonth(), 3);
  assertEquals(next?.getDate(), 1);
  assertEquals(next?.getHours(), 0);
});

test(
  "Value of next, previous and current during trigger (legacy mode)",
  //@ts-ignore
  timeout(4000, (resolve, reject) => {
    let run = 1;
    const cron = new Cron("* * * * * *", {
      legacyMode: true,
    }, () => {
      const now = new Date(),
        nextParsed = new Date(cron.nextRun()!),
        nowParsed = new Date(now.toLocaleString());
      if (run === 1) {
        try {
          assertEquals(nowParsed.getTime(), nextParsed.getTime() - 1000);
          assertEquals(cron.previousRun(), null);
        } catch (e) {
          reject(e);
        }
      } else {
        const prevParsed = new Date(cron.previousRun()!.toLocaleString());
        try {
          assertEquals(nowParsed.getTime(), nextParsed.getTime() - 1000);
          assertEquals(nowParsed.getTime(), prevParsed.getTime() + 1000);
          resolve();
        } catch (e) {
          reject(e);
        }
        cron.stop();
      }
      run++;
    });
  }),
);

test(
  "pause by options work",
  //@ts-ignore
  timeout(2000, (resolve, reject) => {
    try {
      let job = new Cron("* * * * * *", { paused: true }, () => {
        throw new Error("This should not happen");
      });
      setTimeout(function () {
        job.stop();
        resolve();
      }, 1500);
    } catch (e) {
      reject(e);
    }
  }),
);

test(
  "Job should execute once with overrun protection",
  (_context, done) => {
    let executions = 0;
    let sleepPromise;
    const job = new Cron("* * * * * *", { protect: true }, async () => {
      executions++;
      sleepPromise = sleep(2500);
      await sleepPromise;
    });
    setTimeout(async () => {
      if (executions === 1) {
        job.stop();
        await sleepPromise!;
        done();
      } else {
        job.stop();
      }
    }, 2100);
  },
  { waitForCallback: true, timeout: 3000 },
);

test(
  "Job should execute twice (or thrice) with overrun protection",
  (_context, done) => {
    let executions = 0;
    let sleepPromise;
    const job = new Cron("* * * * * *", { protect: false }, async () => {
      executions++;
      sleepPromise = sleep(2500);
      await sleepPromise;
    });
    setTimeout(async () => {
      if (executions === 2 || executions === 3) {
        job.stop();
        await sleepPromise!;
        done();
      } else {
        job.stop();
      }
    }, 2100);
  },
  { waitForCallback: true, timeout: 5000 },
);
test(
  "Job should be working after 1500 ms",
  (context, done) => {
    let sleepPromise;
    const job = new Cron("* * * * * *", async () => {
      job.stop();
      sleepPromise = sleep(2000);
      await sleepPromise;
    });
    setTimeout(async () => {
      if (job.isBusy()) {
        await sleepPromise!;
        done();
      } else {
        /* Let it time out */
      }
    }, 1500);
  },
  { waitForCallback: true, timeout: 4000 },
);
test(
  "Job should not be working after 1500 ms",
  (context, done) => {
    let sleepPromise;
    const job = new Cron("* * * * * *", async () => {
      job.stop();
      sleepPromise = sleep(2000);
      await sleepPromise;
    });
    setTimeout(async () => {
      if (job.isBusy()) {
        /* Let it time out */
      } else {
        await sleepPromise!;
        done();
      }
    }, 3500);
  },
  { waitForCallback: true, timeout: 4000 },
);
test("Fire-once should be supported by ISO 8601 string, past and .nextRun() should return null", function () {
  let scheduler0 = new Cron("2020-01-01T00:00:00");
  assertEquals(scheduler0.nextRun(), null);
});

test("Fire-once should be supported by ISO 8601 string, past and .nextRun() should return null (legacy mode)", function () {
  let scheduler0 = new Cron("2020-01-01T00:00:00", { legacyMode: true });
  assertEquals(scheduler0.nextRun(), null);
});

test("Fire-once should be supported by ISO 8601 string, future and .nextRun() should handle ISO 8601 UTC correctly", function () {
  let scheduler0 = new Cron("2200-01-01T00:00:00Z", { timezone: "America/New_York" });
  assertEquals(scheduler0.nextRun()?.getTime(), new Date(Date.UTC(2200, 0, 1, 0, 0, 0)).getTime());
});

test("Fire-once should be supported by ISO 8601 string, past and .nextRuns() should return zero items", function () {
  let scheduler0 = new Cron("2018-01-01T00:00:00"),
    nextRun = scheduler0.nextRuns(10);
  assertEquals(nextRun.length, 0);
});

test("Fire-once should be supported by ISO 8601 local string, future and .nextRun() should return correct date", function () {
  let scheduler0 = new Cron("2200-01-01T00:00:00"),
    nextRun = scheduler0.nextRun();
  assertEquals(nextRun?.getFullYear(), 2200);
  assertEquals(nextRun?.getMonth(), 0);
  assertEquals(nextRun?.getDate(), 1);
  assertEquals(nextRun?.getHours(), 0);
});

test("Fire-once should be supported by ISO 8601 UTC string, future and .nextRun() should return correct date", function () {
  let scheduler0 = new Cron("2200-01-01T00:00:00Z"),
    nextRun = scheduler0.nextRun();
  assertEquals(nextRun?.getUTCFullYear(), 2200);
  assertEquals(nextRun?.getUTCMonth(), 0);
  assertEquals(nextRun?.getUTCDate(), 1);
  assertEquals(nextRun?.getUTCHours(), 0);
});

test("Fire-once should be supported by ISO 8601 string, future and .nextRuns() should return exactly one item", function () {
  let scheduler0 = new Cron("2200-01-01T00:00:00"),
    nextRun = scheduler0.nextRuns(10);
  assertEquals(nextRun.length, 1);
});

test("Fire-once should be supported by date, past and .nextRun() should return null", function () {
  let refTime = new Date(),
    twoSecsBeforeNow = new Date(refTime.getTime() - 2000),
    scheduler0 = new Cron(twoSecsBeforeNow),
    nextRun = scheduler0.nextRun();
  assertEquals(nextRun, null);
});

test("Fire-once should be supported by date, future and .nextRun() should return correct date", function () {
  let refTime = new Date(),
    twoSecsFromNow = new Date(refTime.getTime() + 2000),
    scheduler0 = new Cron(twoSecsFromNow),
    nextRun = scheduler0.nextRun();
  assertEquals(nextRun && nextRun?.getTime() > refTime.getTime(), true);
  assertEquals(nextRun && nextRun?.getTime() < refTime.getTime() + 4000, true);
});
