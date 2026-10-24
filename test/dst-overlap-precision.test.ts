import { assert, assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// OCPS 1.4 §4.3.1: a time that occurs twice in a DST overlap runs once, at its first occurrence.
// `first` is the start of the first pass through the repeated window, `width` its length in minutes.
// The repeated wall-clock window ends at first + 2 * width.
const overlaps = [
  { timezone: "Europe/Stockholm", first: "2026-10-25T00:00:00Z", width: 60 },
  { timezone: "America/New_York", first: "2026-11-01T05:00:00Z", width: 60 },
  { timezone: "Australia/Lord_Howe", first: "2026-04-04T14:30:00Z", width: 30 },
];

for (const { timezone, first, width } of overlaps) {
  const firstMs = Date.parse(first);
  const widthMs = width * 60_000;
  const windowEndMs = firstMs + 2 * widthMs;

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
    test(`DST overlap runs each time once for ${pattern} in ${timezone}`, () => {
      const job = new Cron(pattern, { timezone });
      const start = new Date(firstMs + widthMs - 2 * stepMs - 1000);
      const runs = job.nextRuns(4, start);
      const iterator = job.enumerate(start);
      assertEquals(runs.length, 4);
      let previous = start;
      let skips = 0;
      for (const run of runs) {
        // Never inside the second pass, and never going backwards
        assert(run.getTime() > previous.getTime());
        assert(run.getTime() < firstMs + widthMs || run.getTime() >= windowEndMs);
        assertEquals(iterator.next().value, run);
        assertEquals(job.nextRun(previous), run);
        if (previous !== start) {
          const diff = run.getTime() - previous.getTime();
          // Normal step, or a step that also passes over the second pass
          assert(diff === stepMs || diff === stepMs + widthMs, `unexpected step ${diff}`);
          if (diff !== stepMs) skips++;
        }
        previous = run;
      }
      assertEquals(skips, 1);
    });
  }

  test(`DST next run from inside the repeated window is in the future in ${timezone}`, () => {
    const job = new Cron("0 */15 * * * *", { timezone });
    for (let minute = 0; minute < width * 2; minute += 15) {
      const referenceMs = firstMs + minute * 60_000;
      const expectedMs = minute + 15 < width ? referenceMs + 15 * 60_000 : windowEndMs;
      for (const ms of [0, 1, 10, 999]) {
        const reference = new Date(referenceMs + ms);
        assertEquals(job.nextRun(reference)?.getTime(), expectedMs);
        assertEquals(job.msToNext(reference), expectedMs - referenceMs - ms);
      }
    }
  });

  test(`live timer runs quarter-hours once through DST overlap in ${timezone}`, async () => {
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
      const expected: number[] = [];
      for (let ms = firstMs; ms < firstMs + widthMs; ms += 15 * 60_000) expected.push(ms);
      expected.push(windowEndMs);
      for (let i = 0; i < expected.length; i++) {
        let polls = 0;
        while (fired.length <= i) {
          assert(++polls <= 400, "timer must reach the next run");
          assert(pending);
          const timer = pending;
          pending = undefined;
          assert(timer.delay >= 0, "timer delay must not be negative");
          assert(now + timer.delay <= expected[i], "timer must not skip the next run");
          now += timer.delay + 10;
          timer.callback();
          await Promise.resolve();
        }
        assertEquals(fired[i], expected[i] + 10);
      }
      assertEquals(fired.length, expected.length);
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

test("fixed times in several hours run once during DST overlap", () => {
  const job = new Cron("0 30 0-2 * * *", { timezone: "America/New_York" });
  assertEquals(job.nextRuns(4, new Date("2025-11-02T03:00:00Z")).map((d) => d.toISOString()), [
    "2025-11-02T04:30:00.000Z", // 00:30 EDT
    "2025-11-02T05:30:00.000Z", // 01:30 EDT, first occurrence
    "2025-11-02T07:30:00.000Z", // 02:30 EST
    "2025-11-03T05:30:00.000Z", // 00:30 EST next day
  ]);
});

test("previousRuns mirrors nextRuns across DST overlap", () => {
  const job = new Cron("0 */20 * * * *", { timezone: "America/New_York" });
  const forward = job.nextRuns(6, new Date("2025-11-02T04:50:00Z"));
  const backward = job.previousRuns(6, new Date(forward[5].getTime() + 1000));
  assertEquals(backward.reverse(), forward);
});

test("once jobs without a named timezone retain millisecond precision", () => {
  const once = new Date("2026-10-25T00:30:00.123Z");
  for (const options of [{}, { utcOffset: 0 }]) {
    const job = new Cron(once, options);
    assertEquals(job.nextRun(new Date(once.getTime() - 1)), once);
    assertEquals(job.nextRun(once), null);
  }
});
