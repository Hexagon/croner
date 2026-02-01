import { assert, assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

// Test alternativeWeekdays option (Quartz mode)
// Standard mode: Sunday=0, Monday=1, ..., Saturday=6
// Quartz mode: Sunday=1, Monday=2, ..., Saturday=7

test("alternativeWeekdays: false (default) should use standard weekday numbering (0-6)", function () {
  // Sunday = 0 in standard mode
  const job = new Cron("0 0 0 * * 0");
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 0); // Sunday
});

test("alternativeWeekdays: true should use Quartz weekday numbering (1-7)", function () {
  // Sunday = 1 in Quartz mode
  const job = new Cron("0 0 0 * * 1", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 0); // Sunday (internal representation)
});

test("alternativeWeekdays: true - Monday should be 2", function () {
  // Monday = 2 in Quartz mode
  const job = new Cron("0 0 0 * * 2", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 1); // Monday
});

test("alternativeWeekdays: true - Tuesday should be 3", function () {
  // Tuesday = 3 in Quartz mode
  const job = new Cron("0 0 0 * * 3", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 2); // Tuesday
});

test("alternativeWeekdays: true - Wednesday should be 4", function () {
  // Wednesday = 4 in Quartz mode
  const job = new Cron("0 0 0 * * 4", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 3); // Wednesday
});

test("alternativeWeekdays: true - Thursday should be 5", function () {
  // Thursday = 5 in Quartz mode
  const job = new Cron("0 0 0 * * 5", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 4); // Thursday
});

test("alternativeWeekdays: true - Friday should be 6", function () {
  // Friday = 6 in Quartz mode
  const job = new Cron("0 0 0 * * 6", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 5); // Friday
});

test("alternativeWeekdays: true - Saturday should be 7", function () {
  // Saturday = 7 in Quartz mode
  const job = new Cron("0 0 0 * * 7", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 6); // Saturday
});

test("alternativeWeekdays: true - SUN (name) should map to 1 and match Sunday", function () {
  const job = new Cron("0 0 0 * * SUN", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 0); // Sunday
});

test("alternativeWeekdays: true - MON (name) should map to 2 and match Monday", function () {
  const job = new Cron("0 0 0 * * MON", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 1); // Monday
});

test("alternativeWeekdays: true - TUE (name) should map to 3 and match Tuesday", function () {
  const job = new Cron("0 0 0 * * TUE", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 2); // Tuesday
});

test("alternativeWeekdays: true - WED (name) should map to 4 and match Wednesday", function () {
  const job = new Cron("0 0 0 * * WED", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 3); // Wednesday
});

test("alternativeWeekdays: true - THU (name) should map to 5 and match Thursday", function () {
  const job = new Cron("0 0 0 * * THU", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 4); // Thursday
});

test("alternativeWeekdays: true - FRI (name) should map to 6 and match Friday", function () {
  const job = new Cron("0 0 0 * * FRI", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 5); // Friday
});

test("alternativeWeekdays: true - SAT (name) should map to 7 and match Saturday", function () {
  const job = new Cron("0 0 0 * * SAT", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 6); // Saturday
});

test("alternativeWeekdays: true - range 2-6 (Mon-Fri) should work", function () {
  const job = new Cron("0 0 0 * * 2-6", { alternativeWeekdays: true });
  // Should match Monday through Friday
  const dates = job.nextRuns(10);

  // All returned dates should be weekdays (Mon-Fri)
  for (const date of dates) {
    const day = date.getDay();
    assert(day >= 1 && day <= 5, `Expected weekday, got ${day}`);
  }
});

test("alternativeWeekdays: true - comma-separated 1,7 (Sun,Sat) should work", function () {
  const job = new Cron("0 0 0 * * 1,7", { alternativeWeekdays: true });
  // Should match Sunday and Saturday
  const dates = job.nextRuns(10);

  // All returned dates should be weekend days
  for (const date of dates) {
    const day = date.getDay();
    assert(day === 0 || day === 6, `Expected weekend day, got ${day}`);
  }
});

test("alternativeWeekdays: true - MON,WED,FRI (names) should work", function () {
  const job = new Cron("0 0 0 * * MON,WED,FRI", { alternativeWeekdays: true });
  const dates = job.nextRuns(10);

  // All returned dates should be Mon, Wed, or Fri
  for (const date of dates) {
    const day = date.getDay();
    assert(day === 1 || day === 3 || day === 5, `Expected Mon/Wed/Fri, got ${day}`);
  }
});

test("alternativeWeekdays: true - stepping 1-7/2 should work", function () {
  const job = new Cron("0 0 0 * * 1-7/2", { alternativeWeekdays: true });
  const dates = job.nextRuns(10);

  // Should match Sun (1), Tue (3), Thu (5), Sat (7) in Quartz numbering
  // Which is Sun (0), Tue (2), Thu (4), Sat (6) in JS
  for (const date of dates) {
    const day = date.getDay();
    assert(
      day === 0 || day === 2 || day === 4 || day === 6,
      `Expected Sun/Tue/Thu/Sat, got ${day}`,
    );
  }
});

test("alternativeWeekdays: false (standard) - 0 should be Sunday", function () {
  const job = new Cron("0 0 0 * * 0", { alternativeWeekdays: false });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 0); // Sunday
});

test("alternativeWeekdays: false (standard) - 7 should also be Sunday", function () {
  const job = new Cron("0 0 0 * * 7", { alternativeWeekdays: false });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 0); // Sunday
});

test("alternativeWeekdays: false (standard) - SUN should map to 0 (Sunday)", function () {
  const job = new Cron("0 0 0 * * SUN", { alternativeWeekdays: false });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 0); // Sunday
});

test("alternativeWeekdays: true with # (nth occurrence) - 6#2 should work", function () {
  // Second Friday of the month in Quartz mode (Friday = 6)
  const job = new Cron("0 0 0 * * 6#2", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 5); // Friday

  // Check it's actually the second Friday
  const date = next.getDate();
  assert(date >= 8 && date <= 14, `Expected 2nd occurrence (8-14), got ${date}`);
});

test("alternativeWeekdays: true with L (last) - 6L should work", function () {
  // Last Friday of the month in Quartz mode (Friday = 6)
  const job = new Cron("0 0 0 * * 6L", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getDay(), 5); // Friday

  // Verify it's the last Friday by checking the next Friday is in a different month
  const nextDate = new Date(next.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  assert(
    nextDate.getMonth() !== next.getMonth(),
    "Expected last Friday of month",
  );
});

test("alternativeWeekdays: true with case insensitivity - sun, Sun, SUN all work", function () {
  const job1 = new Cron("0 0 0 * * sun", { alternativeWeekdays: true });
  const job2 = new Cron("0 0 0 * * Sun", { alternativeWeekdays: true });
  const job3 = new Cron("0 0 0 * * SUN", { alternativeWeekdays: true });

  const next1 = job1.nextRun();
  const next2 = job2.nextRun();
  const next3 = job3.nextRun();

  assert(next1 !== null && next2 !== null && next3 !== null);
  assertEquals(next1.getDay(), 0); // All should be Sunday
  assertEquals(next2.getDay(), 0);
  assertEquals(next3.getDay(), 0);
});

test("alternativeWeekdays option should not affect other fields", function () {
  // Ensure the option only affects weekdays, not months or other fields
  // Using just day-of-week to avoid OR logic complications
  const job = new Cron("0 0 12 * * 1", { alternativeWeekdays: true });
  const next = job.nextRun();
  assert(next !== null);
  assertEquals(next.getHours(), 12);
  assertEquals(next.getMinutes(), 0);
  assertEquals(next.getSeconds(), 0);
  assertEquals(next.getDay(), 0); // Sunday (1 in Quartz mode)
});

test("alternativeWeekdays: standard mode 1 vs Quartz mode 1 should give different days", function () {
  const standardJob = new Cron("0 0 0 * * 1", { alternativeWeekdays: false });
  const quartzJob = new Cron("0 0 0 * * 1", { alternativeWeekdays: true });

  const standardNext = standardJob.nextRun();
  const quartzNext = quartzJob.nextRun();

  assert(standardNext !== null && quartzNext !== null);

  // Standard: 1 = Monday (day 1)
  assertEquals(standardNext.getDay(), 1);

  // Quartz: 1 = Sunday (day 0)
  assertEquals(quartzNext.getDay(), 0);
});
