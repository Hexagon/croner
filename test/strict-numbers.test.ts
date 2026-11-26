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

test("LW can be an item in a day-of-month list", function () {
  const next = (pattern: string, n: number, from: string) =>
    new Cron(pattern, { timezone: "UTC" }).nextRuns(n, new Date(from))
      .map((d) => d.toISOString().slice(0, 10));
  const previous = (pattern: string, n: number, from: string) =>
    new Cron(pattern, { timezone: "UTC" }).previousRuns(n, new Date(from))
      .map((d) => d.toISOString().slice(0, 10));

  // May 2025 ends on a Saturday: the last weekday is the 30th, the last day the 31st
  assertEquals(next("0 0 L,LW * *", 2, "2025-05-01T00:00:00Z"), ["2025-05-30", "2025-05-31"]);
  assertEquals(next("0 0 LW,L * *", 2, "2025-05-01T00:00:00Z"), ["2025-05-30", "2025-05-31"]);
  assertEquals(next("0 0 l,lw 5 *", 2, "2025-01-01T00:00:00Z"), ["2025-05-30", "2025-05-31"]);
  assertEquals(previous("0 0 L,LW * *", 2, "2025-06-01T00:00:00Z"), ["2025-05-31", "2025-05-30"]);
  // A month that ends on a weekday has one run, as the last day is the last weekday
  assertEquals(next("0 0 L,LW * *", 2, "2025-06-01T00:00:00Z"), ["2025-06-30", "2025-07-31"]);

  // January 2025: 1st (Wed), 15th (Wed), 31st (Fri). February 2025: 1st is a Saturday, so 1W
  // is Monday the 3rd, 15th is a Saturday, so 15W is Friday the 14th, and the 28th is a Friday.
  const expected = [
    "2025-01-01",
    "2025-01-15",
    "2025-01-31",
    "2025-02-03",
    "2025-02-14",
    "2025-02-28",
  ];
  assertEquals(next("0 0 1W,15W,LW * *", 6, "2024-12-31T12:00:00Z"), expected);
  assertEquals(next("0 0 1w,15w,lw * *", 6, "2024-12-31T12:00:00Z"), expected);
  assertEquals(
    previous("0 0 1W,15W,LW * *", 6, "2025-03-01T00:00:00Z"),
    [...expected].reverse(),
  );

  // LW together with plain days, and with both L and W values
  assertEquals(next("0 0 10,LW * *", 3, "2025-05-01T00:00:00Z"), [
    "2025-05-10",
    "2025-05-30",
    "2025-06-10",
  ]);
  assertEquals(
    next("0 0 15W,L,LW * *", 3, "2025-05-01T00:00:00Z"),
    ["2025-05-15", "2025-05-30", "2025-05-31"],
  );

  // A static match of a date
  const cron = new Cron("0 0 L,LW * *", { timezone: "UTC" });
  assertEquals(cron.match(new Date("2025-05-30T00:00:00Z")), true);
  assertEquals(cron.match(new Date("2025-05-31T00:00:00Z")), true);
  assertEquals(cron.match(new Date("2025-05-29T00:00:00Z")), false);
});

test("L and LW still have to be values of their own in day-of-month", function () {
  for (
    const pattern of [
      "0 0 5L * *",
      "0 0 LW-5 * *",
      "0 0 L-5 * *",
      "0 0 1,5L * *",
      "0 0 15,LW-5 * *",
      "0 0 LW5 * *",
      "0 0 L/2 * *",
      "0 0 L,,LW * *",
      "0 0 LW, * *",
      "0 0 WL * *",
    ]
  ) {
    assertThrows(
      () => new Cron(pattern, { timezone: "UTC" }),
      TypeError,
      "have to be values of their own",
    );
  }
});
