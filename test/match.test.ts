import { assert, assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

test("match() - Basic pattern matching", function () {
  const job = new Cron("0 0 12 * * *"); // Every day at 12:00:00

  // Should match
  assert(job.match(new Date("2024-01-15T12:00:00")));
  assert(job.match("2024-01-15T12:00:00"));

  // Should not match (wrong hour)
  assert(!job.match(new Date("2024-01-15T11:00:00")));
  assert(!job.match(new Date("2024-01-15T13:00:00")));

  // Should not match (wrong minute)
  assert(!job.match(new Date("2024-01-15T12:01:00")));

  // Should not match (wrong second)
  assert(!job.match(new Date("2024-01-15T12:00:01")));
});

test("match() - Pattern with specific days", function () {
  const job = new Cron("0 0 0 15 * *"); // 15th of each month at midnight

  // Should match
  assert(job.match(new Date("2024-01-15T00:00:00")));
  assert(job.match(new Date("2024-02-15T00:00:00")));
  assert(job.match(new Date("2024-12-15T00:00:00")));

  // Should not match (wrong day)
  assert(!job.match(new Date("2024-01-14T00:00:00")));
  assert(!job.match(new Date("2024-01-16T00:00:00")));
});

test("match() - Pattern with specific weekday", function () {
  const job = new Cron("0 0 0 * * MON"); // Every Monday at midnight

  // Should match (these are Mondays)
  assert(job.match(new Date("2024-01-01T00:00:00"))); // Monday
  assert(job.match(new Date("2024-01-08T00:00:00"))); // Monday
  assert(job.match(new Date("2024-01-15T00:00:00"))); // Monday

  // Should not match (not Mondays)
  assert(!job.match(new Date("2024-01-02T00:00:00"))); // Tuesday
  assert(!job.match(new Date("2024-01-07T00:00:00"))); // Sunday
});

test("match() - Pattern with ranges", function () {
  const job = new Cron("0 0 9-17 * * *"); // Every hour from 9 AM to 5 PM

  // Should match
  assert(job.match(new Date("2024-01-15T09:00:00")));
  assert(job.match(new Date("2024-01-15T12:00:00")));
  assert(job.match(new Date("2024-01-15T17:00:00")));

  // Should not match
  assert(!job.match(new Date("2024-01-15T08:00:00")));
  assert(!job.match(new Date("2024-01-15T18:00:00")));
  assert(!job.match(new Date("2024-01-15T23:00:00")));
});

test("match() - Pattern with step values", function () {
  const job = new Cron("0 */15 * * * *"); // Every 15 minutes

  // Should match
  assert(job.match(new Date("2024-01-15T12:00:00")));
  assert(job.match(new Date("2024-01-15T12:15:00")));
  assert(job.match(new Date("2024-01-15T12:30:00")));
  assert(job.match(new Date("2024-01-15T12:45:00")));

  // Should not match
  assert(!job.match(new Date("2024-01-15T12:05:00")));
  assert(!job.match(new Date("2024-01-15T12:10:00")));
  assert(!job.match(new Date("2024-01-15T12:20:00")));
});

test("match() - Pattern with seconds (6-part)", function () {
  const job = new Cron("30 0 12 * * *"); // Every day at 12:00:30

  // Should match
  assert(job.match(new Date("2024-01-15T12:00:30")));

  // Should not match
  assert(!job.match(new Date("2024-01-15T12:00:00")));
  assert(!job.match(new Date("2024-01-15T12:00:31")));
  assert(!job.match(new Date("2024-01-15T12:00:29")));
});

test("match() - Pattern with wildcard seconds", function () {
  const job = new Cron("* 30 12 * * *"); // Every second at 12:30:XX

  // Should match any second at 12:30
  assert(job.match(new Date("2024-01-15T12:30:00")));
  assert(job.match(new Date("2024-01-15T12:30:15")));
  assert(job.match(new Date("2024-01-15T12:30:30")));
  assert(job.match(new Date("2024-01-15T12:30:59")));

  // Should not match (wrong minute)
  assert(!job.match(new Date("2024-01-15T12:29:30")));
  assert(!job.match(new Date("2024-01-15T12:31:30")));
});

test("match() - Pattern with comma-separated values", function () {
  const job = new Cron("0 0 8,12,18 * * *"); // At 8 AM, 12 PM, and 6 PM

  // Should match
  assert(job.match(new Date("2024-01-15T08:00:00")));
  assert(job.match(new Date("2024-01-15T12:00:00")));
  assert(job.match(new Date("2024-01-15T18:00:00")));

  // Should not match
  assert(!job.match(new Date("2024-01-15T09:00:00")));
  assert(!job.match(new Date("2024-01-15T11:00:00")));
  assert(!job.match(new Date("2024-01-15T17:00:00")));
});

test("match() - Pattern with months", function () {
  const job = new Cron("0 0 0 1 1,6,12 *"); // First day of January, June, and December

  // Should match
  assert(job.match(new Date("2024-01-01T00:00:00")));
  assert(job.match(new Date("2024-06-01T00:00:00")));
  assert(job.match(new Date("2024-12-01T00:00:00")));

  // Should not match
  assert(!job.match(new Date("2024-02-01T00:00:00")));
  assert(!job.match(new Date("2024-01-02T00:00:00")));
});

test("match() - Last day of month (L modifier)", function () {
  const job = new Cron("0 0 0 L * *"); // Last day of every month

  // Should match
  assert(job.match(new Date("2024-01-31T00:00:00"))); // January has 31 days
  assert(job.match(new Date("2024-02-29T00:00:00"))); // 2024 is a leap year
  assert(job.match(new Date("2024-04-30T00:00:00"))); // April has 30 days
  assert(job.match(new Date("2025-02-28T00:00:00"))); // 2025 is not a leap year

  // Should not match
  assert(!job.match(new Date("2024-01-30T00:00:00")));
  assert(!job.match(new Date("2024-02-28T00:00:00"))); // Not last day in leap year
  assert(!job.match(new Date("2024-04-29T00:00:00")));
});

test("match() - Weekday modifier (W)", function () {
  const job = new Cron("0 0 0 15W * *"); // Nearest weekday to the 15th

  // 15th is a Monday in Jan 2024, should match exactly
  assert(job.match(new Date("2024-01-15T00:00:00")));

  // 15th is a Saturday in June 2024, should match Friday the 14th
  assert(job.match(new Date("2024-06-14T00:00:00")));
  assert(!job.match(new Date("2024-06-15T00:00:00")));

  // 15th is a Sunday in September 2024, should match Monday the 16th
  assert(job.match(new Date("2024-09-16T00:00:00")));
  assert(!job.match(new Date("2024-09-15T00:00:00")));
});

test("match() - Nth weekday of month (# modifier)", function () {
  const job = new Cron("0 0 0 * * MON#2"); // Second Monday of every month

  // Should match (second Mondays)
  assert(job.match(new Date("2024-01-08T00:00:00"))); // 2nd Monday of Jan 2024
  assert(job.match(new Date("2024-02-12T00:00:00"))); // 2nd Monday of Feb 2024

  // Should not match (first Mondays)
  assert(!job.match(new Date("2024-01-01T00:00:00")));
  assert(!job.match(new Date("2024-02-05T00:00:00")));

  // Should not match (third Mondays)
  assert(!job.match(new Date("2024-01-15T00:00:00")));
  assert(!job.match(new Date("2024-02-19T00:00:00")));
});

test("match() - Last occurrence of weekday (L modifier with weekday)", function () {
  const job = new Cron("0 0 0 * * FRI#L"); // Last Friday of every month

  // Should match (last Fridays)
  assert(job.match(new Date("2024-01-26T00:00:00"))); // Last Friday of Jan 2024
  assert(job.match(new Date("2024-02-23T00:00:00"))); // Last Friday of Feb 2024

  // Should not match (not last Fridays)
  assert(!job.match(new Date("2024-01-19T00:00:00"))); // 3rd Friday
  assert(!job.match(new Date("2024-02-16T00:00:00"))); // 3rd Friday
});

test("match() - Year field (7-part pattern)", function () {
  const job = new Cron("0 0 0 1 1 * 2024"); // January 1st, 2024 at midnight

  // Should match
  assert(job.match(new Date("2024-01-01T00:00:00")));

  // Should not match (wrong year)
  assert(!job.match(new Date("2023-01-01T00:00:00")));
  assert(!job.match(new Date("2025-01-01T00:00:00")));

  // Should not match (wrong date in correct year)
  assert(!job.match(new Date("2024-01-02T00:00:00")));
  assert(!job.match(new Date("2024-02-01T00:00:00")));
});

test("match() - Year field with range", function () {
  const job = new Cron("0 0 0 1 1 * 2024-2026"); // January 1st, 2024-2026

  // Should match
  assert(job.match(new Date("2024-01-01T00:00:00")));
  assert(job.match(new Date("2025-01-01T00:00:00")));
  assert(job.match(new Date("2026-01-01T00:00:00")));

  // Should not match
  assert(!job.match(new Date("2023-01-01T00:00:00")));
  assert(!job.match(new Date("2027-01-01T00:00:00")));
});

test("match() - One-off job with specific date", function () {
  const job = new Cron(new Date("2024-06-15T14:30:00"));

  // Should match
  assert(job.match(new Date("2024-06-15T14:30:00")));

  // Should not match
  assert(!job.match(new Date("2024-06-15T14:30:01")));
  assert(!job.match(new Date("2024-06-15T14:29:59")));
  assert(!job.match(new Date("2024-06-15T14:31:00")));
  assert(!job.match(new Date("2024-06-16T14:30:00")));
});

test("match() - One-off job with ISO 8601 string", function () {
  const job = new Cron("2024-12-25T09:00:00");

  // Should match
  assert(job.match(new Date("2024-12-25T09:00:00")));
  assert(job.match("2024-12-25T09:00:00"));

  // Should not match
  assert(!job.match(new Date("2024-12-25T09:00:01")));
  assert(!job.match(new Date("2024-12-25T10:00:00")));
  assert(!job.match(new Date("2024-12-26T09:00:00")));
});

test("match() - Complex pattern with multiple features", function () {
  const job = new Cron("30 15,45 9-17 * * MON-FRI"); // Every 15 and 45 minutes past the hour, 9 AM - 5 PM, Monday - Friday

  // Should match
  assert(job.match(new Date("2024-01-15T09:15:30"))); // Monday
  assert(job.match(new Date("2024-01-16T12:45:30"))); // Tuesday
  assert(job.match(new Date("2024-01-19T17:15:30"))); // Friday

  // Should not match (weekend)
  assert(!job.match(new Date("2024-01-20T09:15:30"))); // Saturday
  assert(!job.match(new Date("2024-01-21T09:15:30"))); // Sunday

  // Should not match (wrong time)
  assert(!job.match(new Date("2024-01-15T08:15:30"))); // Before 9 AM
  assert(!job.match(new Date("2024-01-15T18:15:30"))); // After 5 PM
  assert(!job.match(new Date("2024-01-15T09:00:30"))); // Wrong minute
  assert(!job.match(new Date("2024-01-15T09:15:00"))); // Wrong second
});

test("match() - Timezone handling", function () {
  const job = new Cron("0 0 12 * * *", { timezone: "America/New_York" });

  // Create a date that is noon in New York time
  // Jan 15, 2024 12:00:00 in America/New_York is 17:00:00 UTC
  const noonInNY = new Date("2024-01-15T17:00:00Z");

  // Should match when checking the UTC time that corresponds to noon in NY
  assert(job.match(noonInNY));

  // Should not match other times
  assert(!job.match(new Date("2024-01-15T16:00:00Z")));
  assert(!job.match(new Date("2024-01-15T18:00:00Z")));
});

test("match() - Question mark wildcard (?)", function () {
  const job = new Cron("0 0 12 ? * *"); // Every day at noon (? is wildcard for day)

  // Should match any day at noon
  assert(job.match(new Date("2024-01-01T12:00:00")));
  assert(job.match(new Date("2024-02-15T12:00:00")));
  assert(job.match(new Date("2024-12-31T12:00:00")));

  // Should not match wrong time
  assert(!job.match(new Date("2024-01-01T11:00:00")));
});

test("match() - AND logic with + modifier (OCPS 1.4)", function () {
  // This pattern uses + to enforce AND logic: must be 15th AND a Monday
  const job = new Cron("0 0 0 15 * +MON");

  // Jan 15, 2024 is a Monday - should match
  assert(job.match(new Date("2024-01-15T00:00:00")));

  // Jul 15, 2024 is also a Monday - should match
  assert(job.match(new Date("2024-07-15T00:00:00")));

  // May 15, 2024 is a Wednesday - should NOT match (not a Monday)
  assert(!job.match(new Date("2024-05-15T00:00:00")));

  // Jan 8, 2024 is a Monday but not the 15th - should NOT match
  assert(!job.match(new Date("2024-01-08T00:00:00")));
});

test("match() - Milliseconds are automatically stripped", function () {
  const job = new Cron("0 0 12 * * *");

  // Dates with milliseconds should match after automatic stripping
  // (Croner operates at second precision, so milliseconds are ignored)
  const dateWithMs = new Date("2024-01-15T12:00:00.500");
  assert(job.match(dateWithMs));

  // Date without milliseconds should also match
  const dateWithoutMs = new Date("2024-01-15T12:00:00.000");
  assert(job.match(dateWithoutMs));

  // But if the second is different, it should not match
  const differentSecond = new Date("2024-01-15T12:00:01.000");
  assert(!job.match(differentSecond));
});

test("match() - Edge case: February 29 in leap year", function () {
  const job = new Cron("0 0 0 29 2 *"); // Feb 29

  // Should match in leap year
  assert(job.match(new Date("2024-02-29T00:00:00")));

  // Should not match in non-leap year (Feb 29 doesn't exist)
  // This is a pattern that would never match in non-leap years
  assert(!job.match(new Date("2023-02-28T00:00:00")));
});

test("match() - Consistent with nextRun()", function () {
  const job = new Cron("0 30 14 * * MON");

  // Get the next run
  const next = job.nextRun();
  assert(next !== null);

  // The next run should match the pattern
  assert(job.match(next));

  // Get multiple next runs and verify they all match
  const nextRuns = job.nextRuns(10);
  for (const run of nextRuns) {
    assert(job.match(run), `Date ${run.toISOString()} from nextRuns() should match the pattern`);
  }
});
