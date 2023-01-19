import { expect, test } from "bun:test";
import { Cron } from "../../../src/croner.js";

test("getTime should return expected difference with different timezones (next 1st november)", function () {
	const timeStockholm = Cron("0 0 12 1 11 *", { timezone: "Europe/Stockholm" }).next().getTime(),
		timeNewYork = Cron("0 0 12 1 11 *", { timezone: "America/New_York" }).next().getTime(),
		diff = (timeNewYork - timeStockholm) / 1000 / 3600;

	// The time when next sunday 1st november occur should be with 6 hours difference (seen from utc)
	expect(diff).toBe(5);
});
