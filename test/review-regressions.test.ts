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

test("DST overlap search finds cadence matches throughout Lord Howe's repeated window", () => {
  const job = new Cron("0 */20 * * * *", { timezone: "Australia/Lord_Howe" });
  assertEquals(
    job.nextRun(new Date("2026-04-04T14:40:00Z"))?.toISOString(),
    "2026-04-04T15:10:00.000Z",
  );
});

test("iterator without startAt keeps its captured reference through peek and reset", () => {
  const RealDate = Date;
  let now = RealDate.parse("2026-01-01T12:00:30.000Z");
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
    now += 60_000;
    assertEquals(iterator.next().value?.toISOString(), peeked?.toISOString());

    now = RealDate.parse("2026-01-01T12:03:30.000Z");
    iterator.reset();
    const resetPeek = iterator.peek();
    now += 60_000;
    assertEquals(iterator.next().value?.toISOString(), resetPeek?.toISOString());
  } finally {
    globalThis.Date = RealDate;
  }
});

for (
  const [timezone, references] of [
    [
      "America/New_York",
      [
        ["2026-11-01T05:30:00Z", "2026-11-01T05:29:59.000Z"],
        ["2026-11-01T06:30:00Z", "2026-11-01T06:29:59.000Z"],
      ],
    ],
    [
      "Europe/Stockholm",
      [
        ["2026-10-25T00:30:00Z", "2026-10-25T00:29:59.000Z"],
        ["2026-10-25T01:30:00Z", "2026-10-25T01:29:59.000Z"],
      ],
    ],
  ] as const
) {
  for (const [reference, expected] of references) {
    test(`previousRuns resolves the correct repeated-hour occurrence in ${timezone}`, () => {
      const job = new Cron("* * * * * *", { timezone });
      const previous = job.previousRuns(1, new Date(reference))[0];
      assert(previous);
      assertEquals(previous.toISOString(), expected);
    });
  }
}
