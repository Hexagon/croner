/**
 * A month or day name in a pattern has to stand alone. It used to be replaced by its number
 * wherever it was, so "SUN6" was read as 6, "JANFEB" as 12 and "JAN1" as 11.
 */
import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

const malformed = [
  // A day name next to a digit or another name
  "0 12 * * SUN6",
  "0 12 * * 0SUN",
  "0 12 * * 6SUN",
  "0 0 * * 0MON-FRI",
  "0 0 * * MON-0FRI",
  "0 0 * * MON-FRI3",
  "0 0 * * SUNMON",
  "0 0 * * MONSUN",
  "0 0 * * SUNSUN",
  "0 0 * * SUN,MON6",
  // A day name as a step or as the occurrence
  "0 0 * * */FRI",
  "0 0 * * MON/FRI",
  "0 0 * * FRI#MON",
  "0 0 * * 5#FRI",
  // A month name next to a digit or another name
  "0 0 1 JAN2,JUL *",
  "0 0 1 0JAN,JUL *",
  "0 0 1 JAN,0JUL *",
  "0 0 1 JAN-1FEB *",
  "0 0 1 JAN-FEB3 *",
  "0 0 1 JAN1 *",
  "0 0 1 JANFEB *",
  "0 0 1 JANJAN *",
  // A month name as a step
  "0 0 1 */JAN *",
  "0 0 1 JAN/JUL *",
  // Only an L can follow a day name
  "0 0 * * FRILFRI",
  "0 0 * * LFRI",
];

for (const pattern of malformed) {
  for (const alternativeWeekdays of [false, true]) {
    test(`${pattern} is rejected${alternativeWeekdays ? " with alternativeWeekdays" : ""}`, () => {
      assertThrows(
        () => new Cron(pattern, { timezone: "UTC", alternativeWeekdays }),
        TypeError,
        "has to stand alone",
      );
    });
  }
}

const runs = (pattern: string, alternativeWeekdays = false) =>
  new Cron(pattern, { timezone: "UTC", alternativeWeekdays })
    .nextRuns(8, new Date("2026-11-01T00:00:00Z"))
    .map((d) => d.toISOString());

// A name and its number are the same pattern
const same: [string, string][] = [
  ["0 0 * * SUN", "0 0 * * 0"],
  ["0 0 * * sun", "0 0 * * 0"],
  ["0 0 * * Mon", "0 0 * * 1"],
  ["0 0 * * MON-FRI", "0 0 * * 1-5"],
  ["0 0 * * mon-fri/2", "0 0 * * 1-5/2"],
  ["0 0 * * MON-SUN", "0 0 * * 1-7"],
  ["0 0 * * SAT-SUN", "0 0 * * 6-7"],
  ["0 0 * * SUN-TUE,FRI", "0 0 * * 0-2,5"],
  ["0 0 * * MON,WED,FRI", "0 0 * * 1,3,5"],
  ["0 0 * * FRI#2", "0 0 * * 5#2"],
  ["0 0 * * FRIL", "0 0 * * 5L"],
  ["0 0 * * fril", "0 0 * * 5L"],
  ["0 0 * * SUNL", "0 0 * * 0L"],
  ["0 0 * * FRI#L", "0 0 * * 5#L"],
  ["0 0 * * MON-FRIL", "0 0 * * 1-5L"],
  ["0 0 * * MON-FRI#2", "0 0 * * 1-5#2"],
  ["0 0 1-15 * +MON-FRI", "0 0 1-15 * +1-5"],
  ["0 0 1 JAN *", "0 0 1 1 *"],
  ["0 0 1 dec *", "0 0 1 12 *"],
  ["0 0 1 JAN-MAR,DEC *", "0 0 1 1-3,12 *"],
  ["0 0 1 jan-jun/2 *", "0 0 1 1-6/2 *"],
  ["0 0 1 FEB,OCT-DEC *", "0 0 1 2,10-12 *"],
  ["0 0 1 OCT,NOV *", "0 0 1 10,11 *"],
];

for (const [named, numbers] of same) {
  test(`${named} is the same as ${numbers}`, () => {
    assertEquals(runs(named), runs(numbers));
  });
}

test("day names with alternativeWeekdays", () => {
  assertEquals(runs("0 0 * * SUN", true), runs("0 0 * * 1", true));
  assertEquals(runs("0 0 * * MON-FRI", true), runs("0 0 * * 2-6", true));
  assertEquals(runs("0 0 * * FRIL", true), runs("0 0 * * 6L", true));
  assertEquals(runs("0 0 * * SAT#2", true), runs("0 0 * * 7#2", true));
});

test("names give the days and months they stand for", () => {
  // 2026-11-01 is a Sunday, and the runs are after it
  const sundays = ["2026-11-08T00:00:00.000Z", "2026-11-15T00:00:00.000Z"];
  assertEquals(runs("0 0 * * SUN").slice(0, 2), sundays);
  const januaries = ["2027-01-01T00:00:00.000Z", "2028-01-01T00:00:00.000Z"];
  assertEquals(runs("0 0 1 JAN *").slice(0, 2), januaries);
});
