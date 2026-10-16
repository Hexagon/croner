import { assert, assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron, CronDate } from "../src/croner.ts";

const overlaps = [
  { timezone: "Europe/Stockholm", first: "2026-10-25T00:00:00Z", width: 60 },
  { timezone: "America/New_York", first: "2026-11-01T05:00:00Z", width: 60 },
  { timezone: "Australia/Lord_Howe", first: "2026-04-04T14:30:00Z", width: 30 },
];

for (const { timezone, first, width } of overlaps) {
  const firstMs = Date.parse(first);

  test(`CronDate keeps the DST occurrence with fractional seconds in ${timezone}`, () => {
    for (const occurrence of [0, width * 60_000]) {
      for (const ms of [0, 1, 10, 999]) {
        const date = new CronDate(new Date(firstMs + occurrence + ms), timezone);
        assertEquals(date.getTime(), firstMs + occurrence);
        assertEquals(date.ms, ms);
        assertEquals(new CronDate(date, timezone).getTime(), firstMs + occurrence);
      }
    }
  });

  for (
    const [pattern, stepMs] of [
      ["* * * * * *", 1000],
      ["0 * * * * *", 60_000],
      ["0 */15 * * * *", 15 * 60_000],
      ...(width === 60
        ? [
          ["0 */20 * * * *", 20 * 60_000],
          ["0 */30 * * * *", 30 * 60_000],
          ["0 0 * * * *", 60 * 60_000],
          ["0 30 * * * *", 60 * 60_000],
        ] as const
        : []),
    ] as const
  ) {
    test(`DST traversal stays increasing for ${pattern} in ${timezone}`, () => {
      const job = new Cron(pattern, { timezone });
      const start = new Date(
        stepMs === 1000 ? firstMs + width * 60_000 - 5000 : firstMs - 1000,
      );
      const count = stepMs === 1000 ? 12 : Math.ceil((width * 2 * 60_000) / stepMs) + 2;
      const runs = job.nextRuns(count, start);
      const iterator = job.enumerate(start);
      assertEquals(runs.length, count);
      let previous = start;
      for (const run of runs) {
        assert(run.getTime() > previous.getTime());
        if (previous !== start) {
          assertEquals(run.getTime() - previous.getTime(), stepMs);
        }
        assertEquals(iterator.next().value, run);
        assertEquals(job.nextRun(previous), run);
        previous = run;
      }
    });
  }

  test(`DST iterator reaches a date-based break in ${timezone}`, () => {
    const job = new Cron("0 */15 * * * *", { timezone });
    const end = firstMs + width * 2 * 60_000;
    let count = 0;
    for (const date of job.enumerate(new Date(firstMs - 1000))) {
      if (date.getTime() > end) break;
      assert(++count <= width * 2 / 15 + 1, "iterator must advance past the overlap");
    }
    assertEquals(count, width * 2 / 15 + 1);
  });

  test(`DST next run is independent of reference milliseconds in ${timezone}`, () => {
    const job = new Cron("0 */15 * * * *", { timezone });
    for (let minute = 0; minute < width * 2; minute += 15) {
      const referenceMs = firstMs + minute * 60_000;
      const expected = new Date(referenceMs + 15 * 60_000);
      for (const ms of [0, 1, 10, 999]) {
        const reference = new Date(referenceMs + ms);
        assertEquals(job.nextRun(reference), expected);
        assertEquals(job.msToNext(reference), 15 * 60_000 - ms);
      }
    }
  });

  test(`live timer keeps quarter-hour runs through DST overlap in ${timezone}`, async () => {
    const RealDate = Date;
    const realSetTimeout = globalThis.setTimeout;
    const realClearTimeout = globalThis.clearTimeout;
    let now = firstMs - 1000;
    let pending: { callback: () => void; delay: number } | undefined;
    const fired: number[] = [];
    const job = new Cron("0 */15 * * * *", { timezone });
    globalThis.Date = new Proxy(RealDate, {
      construct(target, args, newTarget) {
        return Reflect.construct(target, args.length === 0 ? [now] : args, newTarget);
      },
      get(target, property, receiver) {
        return property === "now" ? () => now : Reflect.get(target, property, receiver);
      },
    });
    globalThis.setTimeout = ((callback: () => void, delay: number) => {
      pending = { callback, delay };
      return 1;
    }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = (() => {}) as typeof clearTimeout;

    try {
      job.schedule(() => {
        fired.push(now);
      });
      const count = width * 2 / 15 + 1;
      for (let i = 0; i < count; i++) {
        const expectedMs = firstMs + i * 15 * 60_000;
        let polls = 0;
        while (fired.length <= i) {
          assert(++polls <= 40, "timer must reach the next quarter-hour");
          assert(pending);
          const timer = pending;
          pending = undefined;
          assert(now + timer.delay <= expectedMs, "timer must not skip the next run");
          now += timer.delay + 10;
          timer.callback();
          await Promise.resolve();
        }
        assertEquals(fired[i], firstMs + i * 15 * 60_000 + 10);
      }
      assertEquals(fired.length, count);
    } finally {
      job.stop();
      globalThis.Date = RealDate;
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
    }
  });
}

test("fixed-hour jobs still skip the second occurrence after running in the first", () => {
  const job = new Cron("0 30 2 * * *", { timezone: "Europe/Stockholm" });
  assertEquals(
    job.nextRun(new Date("2026-10-25T00:30:00.010Z"))?.toISOString(),
    "2026-10-26T01:30:00.000Z",
  );
});

test("once jobs without a named timezone retain millisecond precision", () => {
  const once = new Date("2026-10-25T00:30:00.123Z");
  for (const options of [{}, { utcOffset: 0 }]) {
    const job = new Cron(once, options);
    assertEquals(job.nextRun(new Date(once.getTime() - 1)), once);
    assertEquals(job.nextRun(once), null);
  }
});
