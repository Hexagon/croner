import { expect, test } from "bun:test";
import { Cron } from "../../../src/croner.js";

test("31st february should not be found", function () {
	const scheduler = new Cron("* * * 31 2 *");
	expect(scheduler.nextRun()).toBe(null);
});

test("Next 10 run times is returned by enumeration(), and contain a reasonable time span", () => {
	const now = new Date(),
		nextRuns = Cron("*/30 * * * * *").nextRuns(10);

	// Check number of times returned
	expect(nextRuns.length).toBe(10);

	// Check that time span of first entry is within a minute
	expect(nextRuns[0].getTime() >= now.getTime() - 1000).toBe(true);
	expect(nextRuns[0].getTime() <= now.getTime() + 61 * 1000).toBe(true);

	// Check that time span of last entry is about 5 minutes from now
	expect(nextRuns[9].getTime() > now.getTime() + 4 * 60 * 1000).toBe(true);
	expect(nextRuns[9].getTime() < now.getTime() + 6 * 60 * 1000).toBe(true);
});

test("Weekday pattern should return correct alone (legacy mode)", function () {
	const nextRuns = new Cron("15 9 * * mon", { legacyMode: true }).nextRuns(
		3,
		"2022-02-28T23:59:00"
	);
	expect(nextRuns[0].getFullYear()).toBe(2022);
	expect(nextRuns[0].getMonth()).toBe(2);
	expect(nextRuns[0].getDate()).toBe(7);
	expect(nextRuns[0].getHours()).toBe(9);
	expect(nextRuns[0].getMinutes()).toBe(15);

	expect(nextRuns[1].getDate()).toBe(14);
	expect(nextRuns[1].getHours()).toBe(9);
	expect(nextRuns[1].getMinutes()).toBe(15);

	expect(nextRuns[2].getDate()).toBe(21);
	expect(nextRuns[2].getHours()).toBe(9);
	expect(nextRuns[2].getMinutes()).toBe(15);
});
