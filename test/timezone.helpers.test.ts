import { assert, assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { createTimePoint, fromTimezone, fromTZ, fromTZISO, toTZ } from "../src/helpers/timezone.ts";

// Note: These tests target the timezone helper functions directly, independent of Cron

test("toTZ converts Date to components in target tz (EST)", () => {
  const d = new Date("2025-01-15T12:34:56Z"); // UTC
  const tp = toTZ(d, "America/New_York"); // EST (UTC-5)

  assertEquals(tp.tz, "America/New_York");
  assertEquals(tp.y, 2025);
  assertEquals(tp.m, 1);
  assertEquals(tp.d, 15);
  assertEquals(tp.h, 7);
  assertEquals(tp.i, 34);
  assertEquals(tp.s, 56);
});

test("toTZ respects DST (EDT)", () => {
  const d = new Date("2025-07-01T12:00:00Z"); // UTC
  const tp = toTZ(d, "America/New_York"); // EDT (UTC-4)

  assertEquals(tp.y, 2025);
  assertEquals(tp.m, 7);
  assertEquals(tp.d, 1);
  assertEquals(tp.h, 8); // 12:00Z -> 08:00 local
  assertEquals(tp.i, 0);
  assertEquals(tp.s, 0);
});

test("fromTZ converts local time in tz to UTC Date (EST)", () => {
  // 2025-01-15 07:34:56 in New York (EST) = 2025-01-15T12:34:56Z
  const tp = createTimePoint(2025, 1, 15, 7, 34, 56, "America/New_York");
  const d = fromTZ(tp);

  assertEquals(d.toISOString(), "2025-01-15T12:34:56.000Z");
});

test("fromTZ handles DST overlap (fall back) by choosing first occurrence", () => {
  // America/New_York: 2025-11-02 01:30 happens twice; first occurrence is EDT = 2025-11-02T05:30:00Z
  const tp = createTimePoint(2025, 11, 2, 1, 30, 0, "America/New_York");
  const d = fromTZ(tp);

  assertEquals(d.toISOString(), "2025-11-02T05:30:00.000Z");
});

test("fromTZ handles DST gap (spring forward) by moving to after gap unless throwOnInvalid", () => {
  // America/New_York: 2025-03-09 02:30 does not exist; should move to 03:30 EDT
  const tp = createTimePoint(2025, 3, 9, 2, 30, 0, "America/New_York");
  const adjusted = fromTZ(tp);
  assertEquals(adjusted.toISOString(), "2025-03-09T07:30:00.000Z");

  // With throwOnInvalid = true, it should throw
  assertThrows(() => fromTZ(tp, true));
});

test("fromTZISO parses non-UTC ISO string with provided tz", () => {
  // Local ISO without Z/offset, interpret as local for the provided tz
  const d = fromTZISO("2025-01-15T07:34:56", "America/New_York");
  assertEquals(d.toISOString(), "2025-01-15T12:34:56.000Z");
});

test("fromTZISO treats Z/offset ISO strings as absolute UTC", () => {
  // Z-designator: stays as UTC
  const d1 = fromTZISO("2025-01-15T12:34:56Z");
  assertEquals(d1.toISOString(), "2025-01-15T12:34:56.000Z");

  // With explicit positive offset, should convert to UTC
  const d2 = fromTZISO("2025-01-15T12:34:56+02:00");
  assertEquals(d2.toISOString(), "2025-01-15T10:34:56.000Z");

  // With explicit negative offset, should convert to UTC
  const d3 = fromTZISO("2025-01-15T12:34:56-03:00");
  assertEquals(d3.toISOString(), "2025-01-15T15:34:56.000Z");
});

test("fromTimezone wrapper produces same result as fromTZ", () => {
  const a = fromTimezone(2025, 1, 15, 7, 34, 56, "America/New_York");
  const b = fromTZ(createTimePoint(2025, 1, 15, 7, 34, 56, "America/New_York"));
  assertEquals(a.toISOString(), b.toISOString());
});

test("createTimePoint returns expected structure", () => {
  const tp = createTimePoint(2025, 2, 3, 4, 5, 6, "Etc/UTC");
  assertEquals(tp, { y: 2025, m: 2, d: 3, h: 4, i: 5, s: 6, tz: "Etc/UTC" });
});

test("toTZ reuses one Intl.DateTimeFormat per timezone", () => {
  const Original = Intl.DateTimeFormat;
  let constructed = 0;
  const Counting = function (...args: ConstructorParameters<typeof Intl.DateTimeFormat>) {
    constructed++;
    return new Original(...args);
  } as unknown as typeof Intl.DateTimeFormat;
  Intl.DateTimeFormat = Counting;
  try {
    const d = new Date("2025-01-15T12:34:56Z");
    for (let n = 0; n < 50; n++) {
      toTZ(new Date(d.getTime() + n * 60000), "Pacific/Chatham");
    }
  } finally {
    Intl.DateTimeFormat = Original;
  }
  assert(constructed <= 1, `expected at most 1 formatter, got ${constructed}`);
});

test("toTZ keeps zones apart when alternating between them", () => {
  const d = new Date("2025-07-01T12:00:00Z");
  for (let n = 0; n < 3; n++) {
    assertEquals(toTZ(d, "America/New_York").h, 8);
    assertEquals(toTZ(d, "Europe/Stockholm").h, 14);
    assertEquals(toTZ(d, "Asia/Kolkata").i, 30);
  }
});

test("toTZ matches a fresh formatter across many zones (cache eviction)", () => {
  // Intl.supportedValuesOf is missing in older runtimes; fall back to the Etc/GMT zones.
  const supportedValuesOf = (Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  }).supportedValuesOf;
  const zones = supportedValuesOf ? supportedValuesOf("timeZone") : Array.from(
    { length: 25 },
    (_, n) => n === 12 ? "Etc/GMT" : `Etc/GMT${n < 12 ? "+" : "-"}${Math.abs(n - 12)}`,
  );
  const d = new Date("2025-03-30T01:30:00Z");
  // Two passes, so zones evicted during the first pass are rebuilt in the second.
  for (let pass = 0; pass < 2; pass++) {
    for (const tz of zones) {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }).formatToParts(d);
      const hour = parseInt(parts.find((p) => p.type === "hour")!.value, 10) % 24;
      const minute = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
      const tp = toTZ(d, tz);
      assertEquals([tp.h, tp.i], [hour, minute], tz);
    }
  }
});

test("toTZ still throws for an invalid timezone on repeated calls", () => {
  const d = new Date("2025-01-15T12:34:56Z");
  assertThrows(() => toTZ(d, "Invalid/Zone"), RangeError);
  assertThrows(() => toTZ(d, "Invalid/Zone"), RangeError);
});
