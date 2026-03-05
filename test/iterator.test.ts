import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron, CronIterator } from "../src/croner.ts";

// enumerate() factory

test("enumerate() returns a CronIterator instance", function () {
  const job = new Cron("* * * * * *");
  assertEquals(job.enumerate() instanceof CronIterator, true);
});

test("enumerate() does not mutate the parent Cron instance", function () {
  const job = new Cron("0 0 0 * * *");
  const before = job.nextRun();
  job.enumerate();
  assertEquals(job.nextRun()?.getTime(), before?.getTime());
});

// Iterator protocol — next()

test("enumerate() next() returns dates in ascending order", function () {
  const start = new Date("2024-01-01T00:00:00.000Z");
  const iter = new Cron("0 * * * * *").enumerate(start);
  const a = iter.next();
  const b = iter.next();
  assertEquals(a.done, false);
  assertEquals(b.done, false);
  assertEquals(a.value!.toISOString(), "2024-01-01T00:01:00.000Z");
  assertEquals(b.value!.toISOString(), "2024-01-01T00:02:00.000Z");
});

test("enumerate() next() advances cursor by exactly one minute for minute pattern", function () {
  const start = new Date("2024-01-01T00:00:00.000Z");
  const iter = new Cron("0 * * * * *").enumerate(start);
  const a = iter.next();
  const b = iter.next();
  assertEquals(b.value!.getTime() - a.value!.getTime(), 60 * 1000);
});

test("enumerate() next() returns done:true after schedule is exhausted via stopAt", function () {
  const start = new Date("2024-01-01T00:00:00.000Z");
  const stop = new Date("2024-01-01T00:02:30.000Z"); // allows :01 and :02 only
  const iter = new Cron("0 * * * * *", { stopAt: stop }).enumerate(start);
  const a = iter.next();
  const b = iter.next();
  const c = iter.next();
  assertEquals(a.done, false);
  assertEquals(a.value!.toISOString(), "2024-01-01T00:01:00.000Z");
  assertEquals(b.done, false);
  assertEquals(b.value!.toISOString(), "2024-01-01T00:02:00.000Z");
  assertEquals(c.done, true);
  assertEquals(c.value, undefined);
});

test("enumerate() next() after done always returns done:true", function () {
  const start = new Date("2024-01-01T00:00:00.000Z");
  const stop = new Date("2024-01-01T00:00:30.000Z");
  const iter = new Cron("0 * * * * *", { stopAt: stop }).enumerate(start);
  let result = iter.next();
  while (!result.done) result = iter.next();
  assertEquals(iter.next().done, true);
  assertEquals(iter.next().done, true);
});

// Iterable protocol — [Symbol.iterator]

test("enumerate() [Symbol.iterator]() returns the iterator itself", function () {
  const iter = new Cron("* * * * * *").enumerate();
  assertEquals(iter[Symbol.iterator](), iter);
});

test("enumerate() for...of collects exactly the expected dates", function () {
  const start = new Date("2024-01-01T00:00:00.000Z");
  const stop = new Date("2024-01-01T00:03:00.000Z"); // :01 and :02 pass; :03 == stopAt is excluded
  const collected: string[] = [];
  for (const date of new Cron("0 * * * * *", { stopAt: stop }).enumerate(start)) {
    collected.push(date.toISOString());
  }
  assertEquals(collected.length, 2);
  assertEquals(collected[0], "2024-01-01T00:01:00.000Z");
  assertEquals(collected[1], "2024-01-01T00:02:00.000Z");
});

test("enumerate() destructuring captures first two occurrences", function () {
  const start = new Date("2024-01-01T00:00:00.000Z");
  const [a, b] = new Cron("0 * * * * *").enumerate(start);
  assertEquals(a.toISOString(), "2024-01-01T00:01:00.000Z");
  assertEquals(b.toISOString(), "2024-01-01T00:02:00.000Z");
});

// peek()

test("enumerate() peek() returns the next date without advancing the cursor", function () {
  const start = new Date("2024-01-01T00:00:00.000Z");
  const iter = new Cron("0 * * * * *").enumerate(start);
  const peeked = iter.peek();
  const nexted = iter.next();
  assertEquals(peeked?.toISOString(), nexted.value?.toISOString());
  assertEquals(peeked?.toISOString(), "2024-01-01T00:01:00.000Z");
});

test("enumerate() peek() called twice returns the same value", function () {
  const start = new Date("2024-01-01T00:00:00.000Z");
  const iter = new Cron("0 * * * * *").enumerate(start);
  assertEquals(iter.peek()?.toISOString(), iter.peek()?.toISOString());
});

test("enumerate() peek() returns null when iterator is done", function () {
  const start = new Date("2024-01-01T00:00:00.000Z");
  const stop = new Date("2024-01-01T00:00:30.000Z");
  const iter = new Cron("0 * * * * *", { stopAt: stop }).enumerate(start);
  let result = iter.next();
  while (!result.done) result = iter.next();
  assertEquals(iter.peek(), null);
});

// reset()

test("enumerate() reset() allows re-iteration from the same start", function () {
  const start = new Date("2024-01-01T00:00:00.000Z");
  const iter = new Cron("0 * * * * *").enumerate(start);
  assertEquals(iter.next().value!.toISOString(), "2024-01-01T00:01:00.000Z");
  assertEquals(iter.next().value!.toISOString(), "2024-01-01T00:02:00.000Z");
  iter.reset(start);
  assertEquals(iter.next().value!.toISOString(), "2024-01-01T00:01:00.000Z");
  assertEquals(iter.next().value!.toISOString(), "2024-01-01T00:02:00.000Z");
});

test("enumerate() reset() clears the done flag", function () {
  const fireAt = new Date("2024-06-01T12:00:00.000Z");
  const before = new Date("2024-01-01T00:00:00.000Z");
  const iter = new Cron(fireAt).enumerate(before);
  // First call returns the one-off date, second is done
  const a = iter.next();
  const b = iter.next();
  assertEquals(a.done, false);
  assertEquals(b.done, true);
  // Reset before the fire date — done flag must be cleared
  iter.reset(before);
  const c = iter.next();
  assertEquals(c.done, false);
  assertEquals(c.value!.toISOString(), fireAt.toISOString());
});

test("enumerate() reset(newDate) moves iteration to new start point", function () {
  const start1 = new Date("2024-01-01T00:00:00.000Z");
  const start2 = new Date("2024-01-01T01:00:00.000Z");
  const iter = new Cron("0 0 * * * *").enumerate(start1);
  assertEquals(iter.next().value!.toISOString(), "2024-01-01T01:00:00.000Z");
  iter.reset(start2);
  assertEquals(iter.next().value!.toISOString(), "2024-01-01T02:00:00.000Z");
});

// Consistency with nextRuns()

test("enumerate() produces the same dates as nextRuns()", function () {
  const start = new Date("2024-01-01T00:00:00.000Z");
  const job = new Cron("0 0 * * * *");
  const n = 5;
  const expected = job.nextRuns(n, start);
  const iter = job.enumerate(start);
  const actual: string[] = [];
  for (let i = 0; i < n; i++) {
    const { value, done } = iter.next();
    if (done) break;
    actual.push(value.toISOString());
  }
  assertEquals(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++) {
    assertEquals(actual[i], expected[i].toISOString());
  }
});

// startAt as ISO 8601 string

test("enumerate() accepts an ISO 8601 string as startAt", function () {
  const iter = new Cron("0 0 * * * *").enumerate("2024-06-01T00:00:00");
  const result = iter.next();
  assertEquals(result.done, false);
  assertEquals(result.value instanceof Date, true);
});

// Once-only job

test("enumerate() on a once-only job returns one date then done", function () {
  const fireAt = new Date(Date.now() + 86400 * 1000); // tomorrow
  const iter = new Cron(fireAt).enumerate();
  const a = iter.next();
  const b = iter.next();
  assertEquals(a.done, false);
  assertEquals(a.value instanceof Date, true);
  assertEquals(b.done, true);
});
