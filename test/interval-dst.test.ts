/**
 * The interval option is a minimum number of seconds between runs. It counts elapsed time, so a
 * DST change in between neither shortens nor stretches it.
 */
import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

const iso = (dates: Date[]) => dates.map((d) => d.toISOString());

test("a run after a spring forward comes at least interval seconds after the last", () => {
  // Europe/London, 2026-03-29: 01:00 GMT jumps to 02:00 BST (01:00Z)
  const job = new Cron("0 */20 * * * *", { timezone: "Europe/London", interval: 3600 });
  // The last run was at 00:40 GMT, so the next is at 01:40Z (02:40 BST), not 02:00 BST
  assertEquals(iso(job.nextRuns(3, new Date("2026-03-29T00:40:00Z"))), [
    "2026-03-29T01:40:00.000Z",
    "2026-03-29T02:40:00.000Z",
    "2026-03-29T03:40:00.000Z",
  ]);
});

test("a run in a repeated hour comes at least interval seconds after the last", () => {
  // Europe/London, 2025-10-26: 02:00 BST goes back to 01:00 GMT (01:00Z), 01:00-01:59 occurs twice
  const job = new Cron("0 */20 * * * *", { timezone: "Europe/London", interval: 3600 });
  // The last run was at 01:40 BST (00:40Z), so the next is 01:40 GMT, not the start of the repeat
  assertEquals(iso(job.nextRuns(3, new Date("2025-10-26T00:40:00Z"))), [
    "2025-10-26T01:40:00.000Z",
    "2025-10-26T02:40:00.000Z",
    "2025-10-26T03:40:00.000Z",
  ]);
});

test("the second pass of a repeated hour is not skipped when the interval ends in it", () => {
  const job = new Cron("0 30 * * * *", { timezone: "Europe/London", interval: 7200 });
  // 00:30 BST (23:30Z) plus two hours is 01:30Z, which is 01:30 GMT
  assertEquals(iso(job.nextRuns(2, new Date("2025-10-25T23:30:00Z"))), [
    "2025-10-26T01:30:00.000Z",
    "2025-10-26T03:30:00.000Z",
  ]);
});

test("an interval of a day is 24 hours across a spring forward and a fall back", () => {
  const job = new Cron("0 0 * * * *", { timezone: "Europe/Paris", interval: 86400 });
  // 2026-03-29: 02:00 CET jumps to 03:00 CEST. 10:00 CET is 09:00Z, 24 hours later is 11:00 CEST
  assertEquals(iso(job.nextRuns(2, new Date("2026-03-28T09:00:00Z"))), [
    "2026-03-29T09:00:00.000Z",
    "2026-03-30T09:00:00.000Z",
  ]);
  // 2026-10-25: 03:00 CEST goes back to 02:00 CET. 11:00 CEST is 09:00Z, 24 hours on is 10:00 CET
  assertEquals(iso(job.nextRuns(2, new Date("2026-10-24T09:00:00Z"))), [
    "2026-10-25T09:00:00.000Z",
    "2026-10-26T09:00:00.000Z",
  ]);
});

test("previousRuns counts the interval in elapsed time too", () => {
  // Europe/London, 2027-03-28: 01:00 GMT jumps to 02:00 BST (01:00Z)
  const job = new Cron("* * * * * *", { timezone: "Europe/London", interval: 7200 });
  assertEquals(iso(job.previousRuns(2, new Date("2027-03-28T01:31:23Z"))), [
    "2027-03-27T23:31:23.000Z",
    "2027-03-27T21:31:23.000Z",
  ]);
  // Europe/Paris, 2025-10-26: 03:00 CEST goes back to 02:00 CET (01:00Z)
  const paris = new Cron("* * * * * *", { timezone: "Europe/Paris", interval: 7200 });
  assertEquals(iso(paris.previousRuns(2, new Date("2025-10-26T02:00:00Z"))), [
    "2025-10-26T00:00:00.000Z",
    "2025-10-25T22:00:00.000Z",
  ]);
});

test("an interval that reaches past the supported years leaves no runs", () => {
  const job = new Cron("0 0 * * * *", { timezone: "Europe/Paris", interval: 1e12 });
  const reference = new Date("2026-06-10T12:00:00Z");
  assertEquals(job.nextRuns(2, reference), []);
  assertEquals(job.previousRuns(2, reference), []);
});

/**
 * Runs a scheduled job on a fake clock, and returns when each run fired
 */
async function runOnFakeClock(job: Cron, startMs: number, untilMs: number): Promise<string[]> {
  const RealDate = Date;
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  let now = startMs;
  let pending: { callback: () => void; delay: number } | undefined;
  const fired: string[] = [];
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
      fired.push(new RealDate(now).toISOString());
    });
    while (now < untilMs && pending) {
      const timer = pending;
      pending = undefined;
      now += timer.delay;
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

test("a scheduled job waits the full interval in a repeated hour", async () => {
  // Europe/London, 2025-10-26: 02:00 BST goes back to 01:00 GMT (01:00Z), 01:00-01:59 occurs twice
  const job = new Cron("0 */20 * * * *", { timezone: "Europe/London", interval: 3600 });
  const fired = await runOnFakeClock(
    job,
    Date.parse("2025-10-26T00:10:00Z"),
    Date.parse("2025-10-26T03:30:00Z"),
  );
  assertEquals(fired, [
    "2025-10-26T00:20:00.000Z",
    "2025-10-26T01:20:00.000Z",
    "2025-10-26T02:20:00.000Z",
    "2025-10-26T03:20:00.000Z",
  ]);
});
