import { assertThrows } from "https://deno.land/std@0.128.0/testing/asserts.ts";
import { Cron } from "../../../src/croner.js";

Deno.test("Cannot combine utcOffset with timezone", function () {
  assertThrows(() => {
    Cron("* * * 31 2 *", { utcOffset: 0, timezone: "Europe/Stockholm" });
  }, "cannot combine");
});

Deno.test("utcOffset cannot be out of bounds (upper)", function () {
  assertThrows(() => {
    Cron("* * * 31 2 *", { utcOffset: 1800 });
  }, "cannot combine");
});

Deno.test("utcOffset cannot be out of bounds (lower)", function () {
  assertThrows(() => {
    Cron("* * * 31 2 *", { utcOffset: -1800 });
  }, "cannot combine");
});
