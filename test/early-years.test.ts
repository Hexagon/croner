import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

for (const year of [1, 4, 96, 99, 100, 2000]) {
  test(`Weekday searches keep the requested year ${year}`, () => {
    const cron = new Cron("0 0 0 * * MON", { timezone: "Etc/UTC" });
    const start = utcDate(year, 1, 1);
    const expected = utcDate(year, 1, 2);
    while (expected.getUTCDay() !== 1) expected.setUTCDate(expected.getUTCDate() + 1);

    assertEquals(cron.nextRun(start), expected);
    assertEquals(cron.nextRuns(2, start), [expected, new Date(expected.getTime() + 7 * 86400000)]);
    assertEquals(cron.previousRuns(1, new Date(expected.getTime() + 1000)), [expected]);
    assertEquals(cron.match(expected), true);
    assertEquals(cron.match(new Date(expected.getTime() + 86400000)), false);
  });
}

test("Leap day remains in the first century with an explicit year field", () => {
  const cron = new Cron("0 0 0 29 FEB * 4", { timezone: "Etc/UTC" });
  assertEquals(cron.nextRun(utcDate(4, 2, 28)), utcDate(4, 2, 29));
  assertEquals(cron.previousRuns(1, utcDate(4, 3, 1)), [utcDate(4, 2, 29)]);
});

test("Last February day uses the actual early year's leap status", () => {
  const cron = new Cron("0 0 0 L FEB *", { timezone: "Etc/UTC" });
  assertEquals(cron.nextRun(utcDate(4, 2, 1)), utcDate(4, 2, 29));
  assertEquals(cron.nextRun(utcDate(99, 2, 1)), utcDate(99, 2, 28));
});

test("Weekday modifiers use the actual early-year calendar", () => {
  const cases: Array<[string, number]> = [
    ["0 0 0 1W JAN *", 2],
    ["0 0 0 LW JAN *", 31],
    ["0 0 0 * JAN MON#1", 2],
    ["0 0 0 * JAN FRI#L", 27],
  ];
  for (const [pattern, day] of cases) {
    const cron = new Cron(pattern, { timezone: "Etc/UTC" });
    const expected = utcDate(96, 1, day);
    assertEquals(cron.nextRun(utcDate(96, 1, 1)), expected, pattern);
    assertEquals(cron.previousRuns(1, utcDate(96, 2, 1)), [expected], pattern);
    assertEquals(cron.match(expected), true, pattern);
  }
});

for (const utcOffset of [0, 90, -90]) {
  test(`Fixed offset ${utcOffset} preserves first-century wall dates`, () => {
    const cron = new Cron("0 0 0 2 JAN *", { utcOffset });
    const expected = new Date(utcDate(96, 1, 2).getTime() - utcOffset * 60000);
    assertEquals(cron.nextRun(utcDate(96, 1, 1)), expected);
    assertEquals(cron.previousRuns(1, utcDate(96, 1, 3)), [expected]);
    assertEquals(cron.match(expected), true);
  });
}

test("Local dates retain an early year after their fields advance", () => {
  const start = new Date(0);
  start.setFullYear(96, 0, 1);
  start.setHours(0, 0, 0, 0);
  const expected = new Date(start);
  expected.setDate(2);
  const cron = new Cron("0 0 0 2 JAN *");
  assertEquals(cron.nextRun(start), expected);
  assertEquals(cron.match(expected), true);
});

test("Traversal crosses the first-century boundary in both directions", () => {
  const cron = new Cron("0 0 0 * * *", { timezone: "Etc/UTC" });
  assertEquals(cron.nextRuns(2, utcDate(99, 12, 30)), [
    utcDate(99, 12, 31),
    utcDate(100, 1, 1),
  ]);
  assertEquals(cron.previousRuns(2, utcDate(100, 1, 2)), [
    utcDate(100, 1, 1),
    utcDate(99, 12, 31),
  ]);
});

test("IANA timezone conversion preserves an early-year wall date", () => {
  const timeZone = "Europe/Stockholm";
  const cron = new Cron("0 0 0 2 JAN *", { timezone: timeZone });
  const next = cron.nextRun(utcDate(96, 1, 1))!;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  const fields = Object.fromEntries(formatter.formatToParts(next).map((p) => [p.type, p.value]));
  assertEquals([fields.year, fields.month, fields.day].map(Number), [96, 1, 2]);
  assertEquals([fields.hour, fields.minute, fields.second].map(Number), [0, 0, 0]);
  assertEquals(cron.match(next), true);
});
