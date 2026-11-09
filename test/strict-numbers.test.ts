/**
 * A number in a pattern is its digits and nothing else. What followed a number used to be ignored,
 * so "15W5" was read as 15W, "5##2" as 5 and "5L" in day-of-month as the 5th and the last day.
 */
import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { Cron } from "../src/croner.ts";

const malformed = [
  // A number followed by something else, ? is read as *
  "0 0 12* * *",
  "0 0 * 3* *",
  "0 0 * * 6*",
  "*/5* * * * *",
  "0 0 1-5* * *",
  "0 0 */2? * *",
  "0 0 5? * *",
  "0 0 0 * * * 20*",
  // Day-of-month, L and W
  "0 0 15WW * *",
  "0 0 15W5 * *",
  "0 0 5L * *",
  "0 0 L5 * *",
  "0 0 LL * *",
  "0 0 *L * *",
  "0 0 1-5L * *",
  "0 0 */5L * *",
  "0 0 L, * *",
  "0 0 ,L * *",
  "0 0 15,,L * *",
  // Day-of-week, # and L
  "0 0 * * 5#",
  "0 0 * * 5##2",
  "0 0 * * 5#2#3",
  "0 0 * * 5L#2",
  "0 0 * * 5LL",
  "0 0 * * FRIL#2",
  "0 0 * * FRI#",
  "0 0 * * 1-5#2#3",
];

for (const pattern of malformed) {
  test(`${pattern} is rejected`, () => {
    assertThrows(() => new Cron(pattern, { timezone: "UTC" }));
  });
}

test("L, W, # and L after a weekday still work", () => {
  const runs = (pattern: string, n = 2) =>
    new Cron(pattern, { timezone: "UTC" }).nextRuns(n, new Date("2026-11-01T00:00:00Z"))
      .map((d) => d.toISOString().slice(0, 10));

  // 2026-11-01 and 2026-11-15 are Sundays, so 1W is Monday the 2nd and 15W Monday the 16th
  assertEquals(runs("0 0 15W * *"), ["2026-11-16", "2026-12-15"]);
  assertEquals(runs("0 0 15w * *"), ["2026-11-16", "2026-12-15"]);
  assertEquals(runs("0 0 L * *"), ["2026-11-30", "2026-12-31"]);
  assertEquals(runs("0 0 l * *"), ["2026-11-30", "2026-12-31"]);
  assertEquals(runs("0 0 15,L * *"), ["2026-11-15", "2026-11-30"]);
  assertEquals(runs("0 0 L,15 * *"), ["2026-11-15", "2026-11-30"]);
  assertEquals(runs("0 0 LW * *"), ["2026-11-30", "2026-12-31"]);
  assertEquals(runs("0 0 1W,15W * *"), ["2026-11-02", "2026-11-16"]);
  assertEquals(runs("0 0 * * 5#2", 1), ["2026-11-13"]);
  assertEquals(runs("0 0 * * FRI#2", 1), ["2026-11-13"]);
  assertEquals(runs("0 0 * * 5L", 1), ["2026-11-27"]);
  assertEquals(runs("0 0 * * FRIL", 1), ["2026-11-27"]);
  assertEquals(runs("0 0 * * 5#L", 1), ["2026-11-27"]);
  assertEquals(runs("0 0 * * 1-5#2", 1), ["2026-11-09"]);
  assertEquals(runs("0 0 * * */2#2", 2), ["2026-11-08", "2026-11-10"]);
  assertEquals(runs("0 0 ? * MON", 1), ["2026-11-02"]);
  assertEquals(runs("0 0 1,15 * ?", 2), ["2026-11-15", "2026-12-01"]);
  assertEquals(runs("0 0 0 1 JAN * 2027-2028", 2), ["2027-01-01", "2028-01-01"]);
});
