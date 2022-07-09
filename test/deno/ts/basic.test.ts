import { assertEquals } from "https://deno.land/std@0.128.0/testing/asserts.ts";
import Cron from "../../../src/croner.js";

Deno.test("Next 10 run times is returned by enumeration(), and contain a reasonable time span", () => {
  const now = new Date(),
    nextRuns = new Cron("*/30 * * * * *").enumerate(10);

  // Check number of times returned
  assertEquals(nextRuns.length, 10);

  // Check that time span of first entry is within a minute
  assertEquals(nextRuns[0].getTime() >= now.getTime() - 1000, true);
  assertEquals(nextRuns[0].getTime() <= now.getTime() + 61 * 1000, true);

  // Check that time span of last entry is about 5 minutes from now
  assertEquals(nextRuns[9].getTime() > now.getTime() + 4 * 60 * 1000, true);
  assertEquals(nextRuns[9].getTime() < now.getTime() + 6 * 60 * 1000, true);
});

Deno.test("Weekday pattern should return correct alone (legacy mode)", function () {
  const nextRuns = new Cron("15 9 * * mon", { legacyMode: true }).enumerate(
    3,
    "2022-02-28T23:59:00",
  );
  assertEquals(nextRuns[0].getFullYear(), 2022);
  assertEquals(nextRuns[0].getMonth(), 2);
  assertEquals(nextRuns[0].getDate(), 7);
  assertEquals(nextRuns[0].getHours(), 9);
  assertEquals(nextRuns[0].getMinutes(), 15);

  assertEquals(nextRuns[1].getDate(), 14);
  assertEquals(nextRuns[1].getHours(), 9);
  assertEquals(nextRuns[1].getMinutes(), 15);

  assertEquals(nextRuns[2].getDate(), 21);
  assertEquals(nextRuns[2].getHours(), 9);
  assertEquals(nextRuns[2].getMinutes(), 15);
});
