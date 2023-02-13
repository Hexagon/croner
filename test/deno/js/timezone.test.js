import { assertEquals } from "https://deno.land/std@0.128.0/testing/asserts.ts";
import { Cron } from "../../../src/croner.js";

Deno.test("getTime should always return now with '* * * * * *', regardless of utcOffset", function () {
  const startAt = new Date(),
    timeNow = Cron("* * * * * *", { utcOffset: -60, startAt }).next(),
    diff = (startAt - timeNow) / 1000 / 3600;

  assertEquals(Math.abs(diff) < 5000, true);
});

Deno.test("getTime should always return increment in steps of 1 second with '* * * * * *', regardless of utcOffset (negative)", function () {
  const timeNow = Cron("* * * * * *", { utcOffset: -60 }).enumerate(3);

  assertEquals(timeNow[0].getTime(), timeNow[1].getTime() - 1000);
  assertEquals(timeNow[1].getTime(), timeNow[2].getTime() - 1000);
});

Deno.test("getTime should always return increment in steps of 1 second with '* * * * * *', regardless of utcOffset (positive)", function () {
  const timeNow = Cron("* * * * * *", { utcOffset: 60 }).enumerate(3);

  assertEquals(timeNow[0].getTime(), timeNow[1].getTime() - 1000);
  assertEquals(timeNow[1].getTime(), timeNow[2].getTime() - 1000);
});

Deno.test("getTime should always return increment in steps of 1 second with '* * * * * *', regardless of utcOffset (zero)", function () {
  const timeNow = Cron("* * * * * *", { utcOffset: 0 }).enumerate(3);

  assertEquals(timeNow[0].getTime(), timeNow[1].getTime() - 1000);
  assertEquals(timeNow[1].getTime(), timeNow[2].getTime() - 1000);
});

Deno.test("getTime should return expected difference with different timezones (next 1st november)", function () {
  const timeStockholm = Cron("0 0 12 1 11 *", { timezone: "Europe/Stockholm" }).next().getTime(),
    timeNewYork = Cron("0 0 12 1 11 *", { timezone: "America/New_York" }).next().getTime(),
    diff = (timeNewYork - timeStockholm) / 1000 / 3600;

  // The time when next sunday 1st november occur should be with 6 hours difference (seen from utc)
  assertEquals(diff, 5);
});

Deno.test("getTime should return expected difference with different utcOffset", function () {
  const timeStockholm = Cron("0 0 12 1 11 *", { utcOffset: 60 }).next().getTime(),
    timeNewYork = Cron("0 0 12 1 11 *", { utcOffset: -180 }).next().getTime(),
    diff = (timeNewYork - timeStockholm) / 1000 / 3600;

  assertEquals(diff, 4);
});

Deno.test("getTime should return expected difference with different utcOffset 2", function () {
  const timeStockholm = Cron("0 0 12 1 11 *", { utcOffset: 0 }).next().getTime(),
    timeNewYork = Cron("0 0 12 1 11 *", { utcOffset: -240 }).next().getTime(),
    diff = (timeNewYork - timeStockholm) / 1000 / 3600;

  assertEquals(diff, 4);
});

Deno.test("getTime should return expected difference with different utcOffset 3", function () {
  const timeStockholm = Cron("0 0 12 1 11 *", { utcOffset: 240 }).next().getTime(),
    timeNewYork = Cron("0 0 12 1 11 *", { utcOffset: 0 }).next().getTime(),
    diff = (timeNewYork - timeStockholm) / 1000 / 3600;

  assertEquals(diff, 4);
});
