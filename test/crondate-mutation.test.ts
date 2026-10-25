import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron, CronDate } from "../src/croner.ts";

// The fields of a CronDate are public, changing them must change the instant it represents

test("CronDate with timezone reflects field changes in getDate and getTime", () => {
  const date = new CronDate(new Date("2026-03-10T10:00:00Z"), "Europe/Stockholm");
  date.day = 20;
  assertEquals(date.getDate().toISOString(), "2026-03-20T10:00:00.000Z");
  date.hour = 3;
  assertEquals(date.getTime(), Date.parse("2026-03-20T02:00:00Z"));
  date.month = 5;
  assertEquals(date.getDate().toISOString(), "2026-06-20T01:00:00.000Z");
});

test("CronDate without timezone reflects field changes in getDate and getTime", () => {
  const date = new CronDate(new Date(2026, 2, 10, 10, 0, 0));
  date.hour = 3;
  assertEquals(date.getTime(), new Date(2026, 2, 10, 3, 0, 0).getTime());
  date.day = 20;
  date.minute = 15;
  date.second = 30;
  assertEquals(date.getDate().getTime(), new Date(2026, 2, 20, 3, 15, 30).getTime());
  date.year = 2027;
  assertEquals(date.getTime(), new Date(2027, 2, 20, 3, 15, 30).getTime());
});

test("CronDate reflects a changed timezone", () => {
  const date = new CronDate(new Date("2026-03-10T10:00:00Z"), "Europe/Stockholm");
  date.tz = "America/New_York";
  assertEquals(date.getDate().toISOString(), "2026-03-10T15:00:00.000Z");
});

test("CronDate copied after a field change keeps the change", () => {
  const date = new CronDate(new Date("2026-03-10T10:00:00Z"), "Europe/Stockholm");
  date.day = 20;
  const copy = new CronDate(date, "Europe/Stockholm");
  assertEquals(copy.getDate().toISOString(), "2026-03-20T10:00:00.000Z");
});

test("CronDate keeps the second DST occurrence when fields are changed back", () => {
  // 02:30 occurs twice in Europe/Stockholm on 2026-10-25, this is the second pass
  const date = new CronDate(new Date("2026-10-25T01:30:00Z"), "Europe/Stockholm");
  date.minute = 45;
  assertEquals(date.getDate().toISOString(), "2026-10-25T00:45:00.000Z");
  date.minute = 30;
  assertEquals(date.getDate().toISOString(), "2026-10-25T01:30:00.000Z");
});

test("nextRun and msToNext use a changed CronDate with timezone", () => {
  const job = new Cron("0 0 12 * * *", { paused: true, timezone: "Europe/Stockholm" });
  const date = new CronDate(new Date("2026-03-10T10:00:00Z"), "Europe/Stockholm");
  date.day = 20;
  assertEquals(job.nextRun(date)?.toISOString(), "2026-03-20T11:00:00.000Z");
  assertEquals(job.msToNext(date), 60 * 60 * 1000);
  assertEquals(job.nextRuns(1, date.getDate())[0].toISOString(), "2026-03-20T11:00:00.000Z");
});

test("nextRun and msToNext use a changed CronDate without timezone", () => {
  const job = new Cron("0 0 12 * * *", { paused: true });
  const date = new CronDate(new Date(2026, 2, 10, 10, 0, 0));
  date.day = 20;
  assertEquals(job.nextRun(date)?.getTime(), new Date(2026, 2, 20, 12, 0, 0).getTime());
  assertEquals(job.msToNext(date), 2 * 60 * 60 * 1000);
});

test("startAt uses a changed CronDate", () => {
  const startAt = new CronDate(new Date("2026-03-10T10:00:00Z"), "Europe/Stockholm");
  startAt.day = 20;
  const job = new Cron("0 0 12 * * *", { paused: true, timezone: "Europe/Stockholm", startAt });
  const next = job.nextRun(new Date("2026-03-01T00:00:00Z"));
  assertEquals(next?.toISOString(), "2026-03-20T11:00:00.000Z");
});
