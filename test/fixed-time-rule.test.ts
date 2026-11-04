/**
 * The fixedTimeRule option selects which jobs count as fixed-time jobs in DST handling (#438).
 * - "single-value" (default): one value each in seconds, minutes and hours, as in croner-rust.
 * - "no-wildcard": no wildcard and no step in seconds, minutes and hours, so lists and ranges
 *   count too, close to Vixie cron.
 */
import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

const iso = (dates: Date[]) => dates.map((d) => d.toISOString());
const timezone = "Europe/Luxembourg";
// 2026-03-29: 02:00 CET jumps to 03:00 CEST (01:00Z)
const spring = new Date("2026-03-28T23:00:00Z");
// 2026-10-25: 03:00 CEST goes back to 02:00 CET (01:00Z), 02:00-02:59 occurs twice
const autumn = new Date("2026-10-24T22:00:00Z");

const noWildcard = (pattern: string) =>
  new Cron(pattern, { timezone, paused: true, fixedTimeRule: "no-wildcard" });

test("fixedTimeRule defaults to single-value, lists and ranges are interval jobs", () => {
  const job = new Cron("30 2,14 * * *", { timezone, paused: true });
  assertEquals(job.options.fixedTimeRule, "single-value");
  // 02:30 is skipped in the gap, and runs twice in the overlap
  assertEquals(iso(job.nextRuns(1, spring)), ["2026-03-29T12:30:00.000Z"]);
  assertEquals(iso(job.nextRuns(3, autumn)), [
    "2026-10-25T00:30:00.000Z", // 02:30 CEST
    "2026-10-25T01:30:00.000Z", // 02:30 CET
    "2026-10-25T13:30:00.000Z", // 14:30 CET
  ]);
});

test("fixedTimeRule rejects unknown values", () => {
  assertThrows(() => {
    // @ts-ignore invalid value on purpose
    new Cron("30 2 * * *", { fixedTimeRule: "vixie" });
  });
});

test("no-wildcard: a list of hours is a fixed-time job", () => {
  const job = noWildcard("30 2,14 * * *");
  assertEquals(iso(job.nextRuns(2, spring)), [
    "2026-03-29T01:00:00.000Z", // 03:00 CEST, the end of the gap
    "2026-03-29T12:30:00.000Z", // 14:30 CEST
  ]);
  assertEquals(iso(job.nextRuns(3, autumn)), [
    "2026-10-25T00:30:00.000Z", // 02:30 CEST, once
    "2026-10-25T13:30:00.000Z", // 14:30 CET
    "2026-10-26T01:30:00.000Z", // 02:30 CET
  ]);
  // The same runs, backwards
  assertEquals(iso(job.previousRuns(2, new Date("2026-03-29T13:00:00Z"))), [
    "2026-03-29T12:30:00.000Z",
    "2026-03-29T01:00:00.000Z",
  ]);
  assertEquals(iso(job.previousRuns(2, new Date("2026-10-25T13:00:00Z"))), [
    "2026-10-25T00:30:00.000Z",
    "2026-10-24T12:30:00.000Z",
  ]);
});

test("no-wildcard: a list of minutes is a fixed-time job", () => {
  const job = noWildcard("0,30 2 * * *");
  // Both times in the gap run at its end, once
  assertEquals(iso(job.nextRuns(2, spring)), [
    "2026-03-29T01:00:00.000Z",
    "2026-03-30T00:00:00.000Z", // 02:00 CEST the next day
  ]);
  assertEquals(iso(job.nextRuns(3, autumn)), [
    "2026-10-25T00:00:00.000Z", // 02:00 CEST
    "2026-10-25T00:30:00.000Z", // 02:30 CEST
    "2026-10-26T01:00:00.000Z", // 02:00 CET the next day
  ]);
});

test("no-wildcard: a range of hours is a fixed-time job", () => {
  const job = noWildcard("30 2-3 * * *");
  assertEquals(iso(job.nextRuns(2, spring)), [
    "2026-03-29T01:00:00.000Z", // 03:00 CEST, the end of the gap
    "2026-03-29T01:30:00.000Z", // 03:30 CEST
  ]);
  assertEquals(iso(job.nextRuns(3, autumn)), [
    "2026-10-25T00:30:00.000Z", // 02:30 CEST, once
    "2026-10-25T02:30:00.000Z", // 03:30 CET
    "2026-10-26T01:30:00.000Z", // 02:30 CET the next day
  ]);
});

test("no-wildcard: times in a gap that meet at its end run once", () => {
  const job = noWildcard("0 2,3 * * *");
  // 02:00 does not exist and 03:00 is the end of the gap, so both are 03:00 CEST
  assertEquals(iso(job.nextRuns(2, spring)), [
    "2026-03-29T01:00:00.000Z",
    "2026-03-30T00:00:00.000Z",
  ]);
});

test("no-wildcard: wildcards and steps are still interval jobs", () => {
  for (const pattern of ["*/30 2 * * *", "0 0-23/2 * * *", "30 * * * *", "* 30 2 * * *"]) {
    const defaultRule = new Cron(pattern, { timezone, paused: true });
    assertEquals(
      iso(noWildcard(pattern).nextRuns(6, autumn)),
      iso(defaultRule.nextRuns(6, autumn)),
    );
    assertEquals(
      iso(noWildcard(pattern).nextRuns(6, spring)),
      iso(defaultRule.nextRuns(6, spring)),
    );
  }
  // An interval job runs on both occurrences of 02:00
  assertEquals(iso(noWildcard("0 0-23/2 * * *").nextRuns(2, autumn)), [
    "2026-10-25T00:00:00.000Z",
    "2026-10-25T01:00:00.000Z",
  ]);
});

test("no-wildcard: ? is a wildcard", () => {
  const job = noWildcard("0 ? 2 * * *");
  // Every minute of the repeated hour runs on both passes, as with *
  const runs = job.nextRuns(120, autumn);
  assertEquals(runs[60].toISOString(), "2026-10-25T01:00:00.000Z");
});

test("no-wildcard: a single value is a fixed-time job, as with the default", () => {
  for (const pattern of ["30 2 * * *", "0 30 2 * * *"]) {
    const defaultRule = new Cron(pattern, { timezone, paused: true });
    assertEquals(
      iso(noWildcard(pattern).nextRuns(3, spring)),
      iso(defaultRule.nextRuns(3, spring)),
    );
    assertEquals(
      iso(noWildcard(pattern).nextRuns(3, autumn)),
      iso(defaultRule.nextRuns(3, autumn)),
    );
  }
});

test("no-wildcard: a 6-field list of seconds is a fixed-time job", () => {
  const job = noWildcard("0,30 30 2 * * *");
  assertEquals(iso(job.nextRuns(3, autumn)), [
    "2026-10-25T00:30:00.000Z",
    "2026-10-25T00:30:30.000Z",
    "2026-10-26T01:30:00.000Z",
  ]);
});
