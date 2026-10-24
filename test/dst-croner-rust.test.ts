/**
 * DST behavior shared with croner-rust (tests/dst_overlap.rs), which deviates from OCPS 1.4 §4.3.1:
 * - Fixed-time jobs (single second, minute and hour) run once in a repeated hour, at the first
 *   occurrence, and run at the end of a DST gap.
 * - Interval jobs (wildcard, step, range or list in second, minute or hour) run on both
 *   occurrences in a repeated hour, and skip times in a DST gap.
 * - Searches move in real time, so they never answer with a time they have passed.
 */
import { assert, assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// A wall clock time that occurs twice, as [first pass, second pass]
const overlaps = [
  // 2024-10-27 02:30 in Europe/Paris
  { timezone: "Europe/Paris", first: "2024-10-27T00:30:00Z", second: "2024-10-27T01:30:00Z" },
  // 2024-04-07 01:40 in Australia/Lord_Howe, a 30-minute overlap
  {
    timezone: "Australia/Lord_Howe",
    first: "2024-04-06T14:40:00Z",
    second: "2024-04-06T15:10:00Z",
  },
  // 2024-04-07 03:20 in Pacific/Chatham, a 45-minute offset
  { timezone: "Pacific/Chatham", first: "2024-04-06T13:35:00Z", second: "2024-04-06T14:35:00Z" },
];

const iso = (dates: Date[]) => dates.map((d) => d.toISOString());

for (const { timezone, first, second } of overlaps) {
  test(`search never answers with a time it has passed in ${timezone}`, () => {
    const job = new Cron("* * * * *", { timezone });
    const next = job.nextRun(new Date(second));
    assert(next && next.getTime() > Date.parse(second));
    const previous = job.previousRuns(1, new Date(first))[0];
    assert(previous && previous.getTime() < Date.parse(first));
  });

  test(`iterators run one way and cover every instant once in ${timezone}`, () => {
    const job = new Cron("* * * * *", { timezone });
    const forward = job.nextRuns(200, new Date(first));
    for (let i = 1; i < forward.length; i++) {
      assertEquals(forward[i].getTime() - forward[i - 1].getTime(), 60_000);
    }
    const backward = job.previousRuns(199, forward[199]);
    assertEquals(iso(backward.reverse()), iso(forward.slice(0, 199)));
  });

  test(`a duplicated minute comes round exactly twice in ${timezone}`, () => {
    const job = new Cron("* * * * *", { timezone });
    const runs = job.nextRuns(201, new Date(Date.parse(first) - 1));
    const local = (d: Date) => d.toLocaleString("en-US", { timeZone: timezone });
    const wanted = local(new Date(first));
    assertEquals(runs.filter((d) => local(d) === wanted).length, 2);
  });
}

test("a match in a later overlap takes its own real order", () => {
  const job = new Cron("*/30 2 26-27 10 *", { timezone: "Europe/Paris" });
  // From 2024-10-27 02:45, second pass, to 2025-10-26 02:00, first pass
  assertEquals(
    job.nextRun(new Date("2024-10-27T01:45:00Z"))?.toISOString(),
    "2025-10-26T00:00:00.000Z",
  );
});

test("a fixed-time job runs once in a repeated hour, an interval job twice", () => {
  const from = new Date("2025-11-02T04:00:00Z"); // America/New_York, 1 AM repeats from 06:00Z
  const timezone = "America/New_York";
  assertEquals(iso(new Cron("0 30 1 * * *", { timezone }).nextRuns(2, from)), [
    "2025-11-02T05:30:00.000Z",
    "2025-11-03T06:30:00.000Z",
  ]);
  // More than one hour makes it an interval job, as in croner-rust
  assertEquals(iso(new Cron("0 30 1,2 * * *", { timezone }).nextRuns(3, from)), [
    "2025-11-02T05:30:00.000Z",
    "2025-11-02T06:30:00.000Z",
    "2025-11-02T07:30:00.000Z",
  ]);
  assertEquals(
    iso(new Cron("0 */20 * * * *", { timezone }).nextRuns(6, new Date("2025-11-02T05:30:00Z"))),
    [
      "2025-11-02T05:40:00.000Z",
      "2025-11-02T06:00:00.000Z",
      "2025-11-02T06:20:00.000Z",
      "2025-11-02T06:40:00.000Z",
      "2025-11-02T07:00:00.000Z",
      "2025-11-02T07:20:00.000Z",
    ],
  );
});

test("a search from inside the repeated hour stays on its pass", () => {
  const job = new Cron("0 */20 * * * *", { timezone: "America/New_York" });
  // 06:10Z is 1:10 AM EST, the second pass
  assertEquals(
    job.nextRun(new Date("2025-11-02T06:10:00Z"))?.toISOString(),
    "2025-11-02T06:20:00.000Z",
  );
  assertEquals(iso(job.previousRuns(3, new Date("2025-11-02T06:10:00Z"))), [
    "2025-11-02T06:00:00.000Z",
    "2025-11-02T05:40:00.000Z",
    "2025-11-02T05:20:00.000Z",
  ]);
  // A string reference is the same instant as a Date
  assertEquals(
    job.msToNext("2025-11-02T06:10:00Z"),
    job.msToNext(new Date("2025-11-02T06:10:00Z")),
  );
});

test("a fixed-time job in a DST gap runs at the end of the gap, in both directions", () => {
  const job = new Cron("0 30 2 * * *", { timezone: "America/New_York" });
  // 2025-03-09: 2 AM EST jumps to 3 AM EDT (07:00Z)
  assertEquals(iso(job.nextRuns(2, new Date("2025-03-09T05:00:00Z"))), [
    "2025-03-09T07:00:00.000Z",
    "2025-03-10T06:30:00.000Z",
  ]);
  assertEquals(iso(job.previousRuns(2, new Date("2025-03-10T00:00:00Z"))), [
    "2025-03-09T07:00:00.000Z",
    "2025-03-08T07:30:00.000Z",
  ]);
});

test("an interval job skips times in a DST gap, without repeating or going back", () => {
  const timezone = "America/New_York";
  const from = new Date("2025-03-09T06:30:00Z");
  assertEquals(iso(new Cron("0 */20 * * * *", { timezone }).nextRuns(4, from)), [
    "2025-03-09T06:40:00.000Z", // 1:40 AM EST
    "2025-03-09T07:00:00.000Z", // 3:00 AM EDT
    "2025-03-09T07:20:00.000Z",
    "2025-03-09T07:40:00.000Z",
  ]);
  assertEquals(iso(new Cron("0 30 * * * *", { timezone }).nextRuns(3, from)), [
    "2025-03-09T07:30:00.000Z", // 2:30 AM doesn't exist, 3:30 AM EDT
    "2025-03-09T08:30:00.000Z",
    "2025-03-09T09:30:00.000Z",
  ]);
});

/**
 * Runs a scheduled job on a fake clock, and returns when each run fired
 */
async function runOnFakeClock(
  job: Cron,
  startMs: number,
  untilMs: number,
  onTimer: (delay: number, now: number) => void = () => {},
): Promise<number[]> {
  const RealDate = Date;
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  let now = startMs;
  let pending: { callback: () => void; delay: number } | undefined;
  const fired: number[] = [];
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
    while (now < untilMs && pending) {
      const timer = pending;
      pending = undefined;
      onTimer(timer.delay, now);
      now += timer.delay + 10;
      timer.callback();
      await Promise.resolve();
      await Promise.resolve();
    }
  } finally {
    job.stop();
    globalThis.Date = RealDate;
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  }
  return fired;
}

test("timers are never re-armed with a zero or negative delay in the repeated hour (#399)", async () => {
  // Europe/London: 2026-10-25, 1 AM repeats from 01:00Z, and 1:30 AM BST (00:30Z) has passed
  const job = new Cron("30 1 * * *", { timezone: "Europe/London" });
  let timers = 0;
  const fired = await runOnFakeClock(
    job,
    Date.parse("2026-10-25T01:00:00Z"),
    Date.parse("2026-10-25T02:00:00Z"),
    (delay) => {
      timers++;
      assert(delay > 0, `timer re-armed with delay ${delay}`);
    },
  );
  assertEquals(fired.length, 0);
  assert(timers <= 125, `${timers} timers in an hour`);
});

test("a per-second job keeps running through the repeated hour (#343)", async () => {
  // Europe/Vienna: 2025-10-26 3 AM CEST goes back to 2 AM CET at 01:00Z
  const job = new Cron("* * * * * *", { timezone: "Europe/Vienna", protect: true });
  const fired = await runOnFakeClock(
    job,
    Date.parse("2025-10-26T00:59:55Z"),
    Date.parse("2025-10-26T01:00:03Z"),
  );
  const seconds = fired.map((ms) => new Date(ms - (ms % 1000)).toISOString());
  assertEquals(seconds, [
    "2025-10-26T00:59:56.000Z",
    "2025-10-26T00:59:57.000Z",
    "2025-10-26T00:59:58.000Z",
    "2025-10-26T00:59:59.000Z",
    "2025-10-26T01:00:00.000Z", // 2:00:00 AM CET, second pass
    "2025-10-26T01:00:01.000Z",
    "2025-10-26T01:00:02.000Z",
    "2025-10-26T01:00:03.000Z",
  ]);
});

test("DST overlap search finds cadence matches throughout Lord Howe's repeated window", () => {
  const job = new Cron("0 */20 * * * *", { timezone: "Australia/Lord_Howe" });
  assertEquals(
    job.nextRun(new Date("2026-04-04T14:40:00Z"))?.toISOString(),
    "2026-04-04T15:10:00.000Z",
  );
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

test("a previous run in the repeated hour leads to the next run in the same pass", () => {
  const job = new Cron("0 * * * * *", { timezone: "America/New_York" });
  // 06:29:50Z is 1:29:50 AM EST, the second pass through 1 AM
  const previous = job.previousRuns(1, new Date("2026-11-01T06:29:50Z"))[0];
  assertEquals(previous?.toISOString(), "2026-11-01T06:29:00.000Z");
  assertEquals(job.nextRun(previous)?.toISOString(), "2026-11-01T06:30:00.000Z");
});
