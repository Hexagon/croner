import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

function useClock(initialTime: number) {
  const RealDate = Date;
  const realSetTimeout = globalThis.setTimeout;
  let now = initialTime;
  const delays: number[] = [];
  const timeouts: { callback: () => void; delay: number }[] = [];
  const PatchedDate = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      return Reflect.construct(target, args.length === 0 ? [now] : args, newTarget);
    },
    get(target, property, receiver) {
      if (property === "now") {
        return () => now;
      }
      return Reflect.get(target, property, receiver);
    },
  });

  globalThis.Date = PatchedDate;
  globalThis.setTimeout = ((...args: unknown[]) => {
    const delay = Number(args[1] ?? 0);
    delays.push(delay);
    timeouts.push({ callback: args[0] as () => void, delay });
    return 0;
  }) as unknown as typeof setTimeout;

  return {
    delays,
    timeouts,
    setNow(time: number) {
      now = time;
    },
    restore() {
      globalThis.Date = RealDate;
      globalThis.setTimeout = realSetTimeout;
    },
  };
}

test("a forward clock step while arming must not skip the scheduled occurrence", async () => {
  const RealDate = Date;
  const target = new RealDate();
  target.setSeconds(target.getSeconds() + 2, 0);
  const targetMs = target.getTime();

  let clockReads = 0;
  let offsetMs = 0;
  const PatchedDate = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      if (args.length === 0) {
        clockReads++;
        if (clockReads === 2) {
          const now = RealDate.now() + offsetMs;
          offsetMs += Math.max(targetMs - now, 0) + 5_000;
        }
        return Reflect.construct(target, [RealDate.now() + offsetMs], newTarget);
      }
      return Reflect.construct(target, args, newTarget);
    },
  });

  let fired = 0;
  const job = new Cron(`${target.getSeconds()} * * * * *`);
  globalThis.Date = PatchedDate;
  try {
    job.schedule(() => {
      fired++;
    });

    const deadline = targetMs + 1_200;
    while (RealDate.now() < deadline && fired === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
    assertEquals(fired, 1, "the stepped-over occurrence should fire once");
  } finally {
    globalThis.Date = RealDate;
    job.stop();
  }
});

test("rearming uses a fresh clock after a synchronous callback", () => {
  const target = new Date();
  target.setSeconds(target.getSeconds() + 2, 0);
  const targetMs = target.getTime();
  const clock = useClock(targetMs - 1000);
  const job = new Cron("* * * * * *");

  try {
    job.schedule(() => {
      clock.setNow(targetMs + 2500);
    });
    clock.setNow(targetMs);
    (job as unknown as { _checkTrigger: (target: Date) => void })._checkTrigger(target);

    assertEquals(clock.delays.at(-1), 500);
  } finally {
    clock.restore();
    job.stop();
  }
});

test("rearming selects the interval cursor using the fresh clock", () => {
  const startAt = new Date();
  startAt.setSeconds(startAt.getSeconds() + 2, 0);
  const startAtMs = startAt.getTime();
  const clock = useClock(startAtMs - 1000);
  const job = new Cron("* * * * * *", {
    interval: 5,
    startAt,
  });

  try {
    job.schedule(() => {
      clock.setNow(startAtMs + 12_000);
    });
    clock.setNow(startAtMs);
    (job as unknown as { _checkTrigger: (target: Date) => void })._checkTrigger(startAt);

    assertEquals(clock.delays.at(-1), 3000);
  } finally {
    clock.restore();
    job.stop();
  }
});

for (
  const { dayOffset, initialTime, occurrenceTime } of [
    {
      dayOffset: -1,
      initialTime: Date.UTC(2025, 0, 13),
      occurrenceTime: Date.UTC(2025, 0, 19, 12),
    },
    { dayOffset: 1, initialTime: Date.UTC(2025, 0, 14), occurrenceTime: Date.UTC(2025, 0, 14, 12) },
  ]
) {
  test(`dayOffset ${dayOffset} schedules the next shifted occurrence`, () => {
    const clock = useClock(initialTime);
    const job = new Cron("0 0 12 * * 1", { dayOffset, timezone: "UTC" });
    let fired = 0;

    try {
      job.schedule(() => {
        fired++;
      });

      clock.setNow(initialTime + clock.timeouts[0].delay);
      clock.timeouts[0].callback();
      assertEquals(fired, 0);

      clock.setNow(occurrenceTime);
      clock.timeouts.at(-1)!.callback();
      assertEquals(fired, 1);
    } finally {
      clock.restore();
      job.stop();
    }
  });
}

test("dayOffset keeps scheduled targets within the execution window", () => {
  const startAt = Date.UTC(2025, 0, 15, 12);
  const negativeOffsetJob = new Cron("0 0 12 * * *", {
    dayOffset: -2,
    startAt: new Date(startAt),
    timezone: "UTC",
  });

  const getNextTarget = (job: Cron) =>
    (job as unknown as { _nextTarget: (previousRun: undefined, now: Date) => Date | null })
      ._nextTarget(undefined, new Date(Date.UTC(2025, 0, 10, 12)));
  assertEquals(getNextTarget(negativeOffsetJob)?.getTime(), startAt);
  negativeOffsetJob.stop();

  const stopAt = Date.UTC(2025, 0, 16, 12);
  const positiveOffsetJob = new Cron("0 0 12 * * *", {
    dayOffset: 1,
    stopAt: new Date(stopAt),
    timezone: "UTC",
  });

  assertEquals(
    (positiveOffsetJob as unknown as {
      _nextTarget: (previousRun: undefined, now: Date) => Date | null;
    })
      ._nextTarget(undefined, new Date(Date.UTC(2025, 0, 15, 12))),
    null,
  );
  positiveOffsetJob.stop();
});

test("a protected job re-arms from the current clock after a backward step", async () => {
  const initialTime = Date.UTC(2025, 0, 1);
  const clock = useClock(initialTime);
  let finishRun!: () => void;
  const runDone = new Promise<void>((resolve) => {
    finishRun = resolve;
  });
  let protectCalls = 0;
  const job = new Cron("* * * * * *", { protect: () => protectCalls++ });

  try {
    job.schedule(async () => await runDone);
    clock.setNow(initialTime + 1000);
    clock.timeouts[0].callback();

    clock.setNow(initialTime);
    clock.timeouts.at(-1)!.callback();
    clock.setNow(initialTime + 1000);
    clock.timeouts.at(-1)!.callback();
    clock.timeouts.findLast((timeout) => timeout.delay === 0)?.callback();

    assertEquals(protectCalls, 1);
  } finally {
    finishRun();
    await runDone;
    clock.restore();
    job.stop();
  }
});
