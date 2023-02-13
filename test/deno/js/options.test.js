import { assertThrows } from "https://deno.land/std@0.128.0/testing/asserts.ts";
import { Cron } from "../../../src/croner.js";

Deno.test("Cannot combine utcOffset with timezone", function () {
  assertThrows(
    () => {
      Cron("* * * 31 2 *", { utcOffset: 0, timezone: "Europe/Stockholm" });
    },
    undefined,
    "Combining",
  );
});

Deno.test("utcOffset cannot be out of bounds (upper)", function () {
  assertThrows(
    () => {
      Cron("* * * 31 2 *", { utcOffset: 1800 });
    },
    undefined,
    "bounds",
  );
});

Deno.test("utcOffset cannot be out of bounds (lower)", function () {
  assertThrows(
    () => {
      Cron("* * * 31 2 *", { utcOffset: -1800 });
    },
    undefined,
    "bounds",
  );
});
