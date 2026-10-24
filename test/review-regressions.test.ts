import { assert, assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

test("one-off allowPast catches up within the current second in a named timezone", () => {
  const RealDate = Date;
  let now = RealDate.parse("2026-01-01T00:00:00.500Z");
  const fireAt = new RealDate("2026-01-01T00:00:00.100Z");
  globalThis.Date = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      return Reflect.construct(target, args.length === 0 ? [now] : args, newTarget);
    },
    get(target, property, receiver) {
      return property === "now" ? () => now : Reflect.get(target, property, receiver);
    },
  });

  try {
    const job = new Cron(fireAt, { timezone: "UTC", allowPast: true });
    assertEquals(job.nextRun()?.toISOString(), "2026-01-01T00:00:00.000Z");
  } finally {
    globalThis.Date = RealDate;
  }
});

test("DST overlap keeps the first pass of Lord Howe's 30-minute repeated window", () => {
  const job = new Cron("0 */20 * * * *", { timezone: "Australia/Lord_Howe" });
  // 14:40Z is 01:40 LHDT (first pass), the second pass 15:00Z-15:30Z is skipped
  assertEquals(
    job.nextRuns(2, new Date("2026-04-04T14:30:00Z")).map((d) => d.toISOString()),
    ["2026-04-04T14:40:00.000Z", "2026-04-04T15:30:00.000Z"],
  );
});

test("iterator without startAt keeps its captured reference through peek and reset", () => {
  const RealDate = Date;
  let now = RealDate.parse("2026-01-01T12:00:25.000Z");
  globalThis.Date = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      return Reflect.construct(target, args.length === 0 ? [now] : args, newTarget);
    },
    get(target, property, receiver) {
      return property === "now" ? () => now : Reflect.get(target, property, receiver);
    },
  });

  try {
    const iterator = new Cron("0 * * * * *", { timezone: "UTC" }).enumerate();
    const peeked = iterator.peek();
    const intervalIterator = new Cron("* * * * * *", {
      timezone: "UTC",
      startAt: new RealDate("2026-01-01T12:00:00.000Z"),
      interval: 10,
    }).enumerate();
    assertEquals(intervalIterator.peek()?.toISOString(), "2026-01-01T12:00:30.000Z");
    const intervalWithoutStart = new Cron("* * * * * *", {
      timezone: "UTC",
      interval: 10,
    }).enumerate();
    assertEquals(intervalWithoutStart.peek()?.toISOString(), "2026-01-01T12:00:26.000Z");
    now += 60_000;
    assertEquals(iterator.next().value?.toISOString(), peeked?.toISOString());

    now = RealDate.parse("2026-01-01T12:03:25.000Z");
    iterator.reset();
    const resetPeek = iterator.peek();
    intervalIterator.reset();
    assertEquals(intervalIterator.peek()?.toISOString(), "2026-01-01T12:03:30.000Z");
    intervalWithoutStart.reset();
    assertEquals(intervalWithoutStart.peek()?.toISOString(), "2026-01-01T12:03:26.000Z");
    now += 60_000;
    assertEquals(iterator.next().value?.toISOString(), resetPeek?.toISOString());
  } finally {
    globalThis.Date = RealDate;
  }
});

for (
  const [timezone, reference, expected] of [
    ["America/New_York", "2026-11-01T05:30:00Z", "2026-11-01T05:29:59.000Z"],
    ["Europe/Stockholm", "2026-10-25T00:30:00Z", "2026-10-25T00:29:59.000Z"],
  ] as const
) {
  test(`previousRuns resolves the first repeated-hour occurrence in ${timezone}`, () => {
    const job = new Cron("* * * * * *", { timezone });
    const previous = job.previousRuns(1, new Date(reference))[0];
    assert(previous);
    assertEquals(previous.toISOString(), expected);
  });
}

test("isRunning agrees with the scheduler when dayOffset moves the last run past the pattern", () => {
  const RealDate = Date;
  const now = RealDate.parse("2027-01-01T00:00:00.000Z");
  globalThis.Date = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      return Reflect.construct(target, args.length === 0 ? [now] : args, newTarget);
    },
    get(target, property, receiver) {
      return property === "now" ? () => now : Reflect.get(target, property, receiver);
    },
  });

  // Last pattern match is 2026-12-31 12:00, which dayOffset moves to 2027-01-01 12:00
  const job = new Cron("0 0 12 31 12 * 2026", { timezone: "UTC", dayOffset: 1 }, () => {});
  try {
    assertEquals(job.isRunning(), true);
  } finally {
    job.stop();
    globalThis.Date = RealDate;
  }
});

test("isRunning agrees with the scheduler when dayOffset moves the last run past the pattern", () => {
  const RealDate = Date;
  const now = RealDate.parse("2027-01-01T00:00:00.000Z");
  globalThis.Date = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      return Reflect.construct(target, args.length === 0 ? [now] : args, newTarget);
    },
    get(target, property, receiver) {
      return property === "now" ? () => now : Reflect.get(target, property, receiver);
    },
  });

  // Last pattern match is 2026-12-31 12:00, which dayOffset moves to 2027-01-01 12:00
  const job = new Cron("0 0 12 31 12 * 2026", { timezone: "UTC", dayOffset: 1 }, () => {});
  try {
    assertEquals(job.isRunning(), true);
  } finally {
    job.stop();
    globalThis.Date = RealDate;
  }
});
