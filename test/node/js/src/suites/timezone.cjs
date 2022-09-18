let 
	assert = require("uvu/assert");

// Actual tests
module.exports = function (Cron, test) {

	test("DST/Timezone", function () {
		let 
			dayOne = new Date("2021-10-31T20:00:00"), // Last day of DST
			scheduler = new Cron("0 0 12 * * *", {timezone: "Etc/UTC", startAt: dayOne }),
			nextRun = scheduler.next(); // Next run in local time

		// Do comparison
		assert.equal(nextRun.getUTCHours(), 12);

	});

	test("getTime should return expected difference with different timezones (now)", function () {
		let timeStockholm = Cron("* * * * * *", {timezone: "Europe/Stockholm"}).next().getTime(),
			timeNewYork = Cron("* * * * * *", {timezone: "America/New_York"}).next().getTime();

		// The time right now should be the same in utc wether in new york or stockholm
		assert.ok(timeStockholm>=timeNewYork-4000);
		assert.ok(timeStockholm<=timeNewYork+4000);
	});
	test("getTime should return expected difference with different timezones (next 31st october)", function () {

		let refTime = new Date();
		refTime.setFullYear(2021);
		refTime.setMonth(8);

		let
			timeStockholm = Cron("0 0 12 30 10 *", {timezone: "Europe/Stockholm"}).next(refTime).getTime(),
			timeNewYork = Cron("0 0 12 30 10 *", {timezone: "America/New_York"}).next(refTime).getTime(),
			diff = (timeNewYork-timeStockholm)/1000/3600;

		// The time when next sunday 1st november occur should be with 6 hours difference (seen from utc)
		assert.equal(diff,6);
	});

	test("Should return expected time, date and weekday different timezones", function () {

		let refTime = new Date();
		refTime.setFullYear(2022);
		refTime.setDate(8);
		refTime.setMonth(1);
		refTime.setHours(12);

		let
			timeStockholm = Cron("0 0 23 8 2 2", {timezone: "Europe/Stockholm"}).next(refTime),
			timeNewYork = Cron("0 0 23 8 2 2", {timezone: "America/New_York"}).next(refTime);

		assert.equal(timeStockholm.getUTCMonth(), 1);
		assert.equal(timeStockholm.getUTCDate(), 8);
		assert.equal(timeStockholm.getUTCHours(), 22);
		assert.equal(timeStockholm.getUTCFullYear(), 2022);

		assert.equal(timeNewYork.getUTCMonth(), 1);
		assert.equal(timeNewYork.getUTCDate(), 9);
		assert.equal(timeNewYork.getUTCHours(), 4);
		assert.equal(timeNewYork.getUTCFullYear(), 2022);
	});

	test("getTime should return expected difference with different timezones (next 1st november)", function () {
		let timeStockholm = Cron("0 0 12 1 11 *", {timezone: "Europe/Stockholm"}).next().getTime(),
			timeNewYork = Cron("0 0 12 1 11 *", {timezone: "America/New_York"}).next().getTime(),
			diff = (timeNewYork-timeStockholm)/1000/3600;

		// The time when next sunday 1st november occur should be with 6 hours difference (seen from utc)
		assert.equal(diff,5);
	});

	test("0 0 0 * * * with 365 iterations should return 365 days from now in America/New_York", function () {
		let scheduler = new Cron("0 0 0 * * *", { timezone: "America/New_York" }),
			prevRun = new Date(),
			nextRun,
			iterations = 365,
			compareDay = new Date();
			
		compareDay.setDate(compareDay.getDate() + iterations);
		
		while(iterations-->0) {
			nextRun = scheduler.next(prevRun),
			prevRun = nextRun;
		}

		// Set seconds, minutes and hours to 00:00:00
		compareDay.setMilliseconds(0);
		compareDay.setSeconds(0);
		compareDay.setMinutes(0);
		compareDay.setHours(0);

		// Do comparison
		assert.equal(Math.abs(nextRun.getTime()-compareDay.getTime())<13*60*60*1000, true);

	});

	test("0 2 30 * * * with 365 iterations should return 366 days from now in America/New_York", function () {
		let scheduler = new Cron("0 0 0 * * *", { timezone: "America/New_York" }),
			prevRun = new Date(),
			nextRun,
			iterations = 365,
			compareDay = new Date();
			
		compareDay.setDate(compareDay.getDate() + iterations );
		
		while(iterations-->0) {
			nextRun = scheduler.next(prevRun),
			prevRun = nextRun;
		}

		// Set seconds, minutes and hours to 00:00:00
		compareDay.setMilliseconds(0);
		compareDay.setSeconds(0);
		compareDay.setMinutes(0);
		compareDay.setHours(0);

		// Do comparison
		assert.equal(Math.abs(nextRun.getTime()-compareDay.getTime())<13*60*60*1000, true);

	});
};