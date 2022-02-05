let 
	assert = require("uvu/assert"),
	timeout = require("../util/timeout.cjs");

module.exports = function (Cron, test) {

	test("Valid startAt with DateTime string should not throw", function () {
		assert.not.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { startAt: "2016-12-01 00:00:00" });
			scheduler.next();
		});
	});

	test("startAt with Date string should throw", function () {
		assert.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { startAt: "2016-12-01" });
			scheduler.next();
		});
	});

	test("Invalid startat should throw", function () {
		assert.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { startAt: "hellu throw" });
			scheduler.next();
		});
	});

	test("startAt with time only should throw", function () {
		assert.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { startAt: "00:35:00" });
			scheduler.next();
		});
	});

	test("Valid stopAt with Date should not throw", function () {
		assert.not.throws(() => {
			let 
				dayBefore = new Date(new Date().getTime()-24*60*60*1000), // Subtract one day
				scheduler = new Cron("0 0 12 * * *", { stopAt: dayBefore });
			scheduler.next();
		});
	});

	test("Valid stopAt with DateTime string should not throw", function () {
		assert.not.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "2016-12-01 00:00:00" });
			scheduler.next();
		});
	});

	test("Valid stopAt with Date string should throw", function () {
		assert.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "2016-12-01" });
			scheduler.next();
		});
	});

	test("Invalid stopAt should throw", function () {
		assert.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "hellu throw" });
			scheduler.next();
		});
	});

	test("stopAt with time only should throw", function () {
		assert.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "00:35:00" });
			scheduler.next();
		});
	});


	test("0 0 0 * * * with startdate yesterday should return tomorrow, at 12:00:00", function () {
		let 
			dayBefore = new Date(new Date().getTime()-24*60*60*1000), // Subtract one day
			nextDay = new Date(new Date().getTime()+24*60*60*1000),// Add two days
			scheduler,
			nextRun;

		// Set a fixed hour later than startAt, to be sure that the days doesn't overlap
		dayBefore =  new Date(dayBefore.setHours(0));
		nextDay = new Date(nextDay.setHours(0));

		scheduler = new Cron("0 0 0 * * *", { startAt: dayBefore });
		nextRun = scheduler.next();

		// Set seconds, minutes and hours to 00:00:00
		nextDay.setMilliseconds(0);
		nextDay.setSeconds(0);
		nextDay.setMinutes(0);
		nextDay.setHours(0);

		// Do comparison
		assert.equal(nextRun.getTime(),nextDay.getTime());
		
	});

	test("0 0 12 * * * with stopdate yesterday should return null", function () {
		let 
			dayBefore = new Date(new Date().getTime()-24*60*60*1000), // Subtract one day
			scheduler = new Cron("0 0 12 * * *", { timezone: "Etc/UTC", stopAt: dayBefore.toISOString() }),
			nextRun = scheduler.next();

		// Do comparison
		assert.equal(nextRun, null);

	});

	test("* * * * * * with maxRuns: 1 should return null after 1.5 seconds",  timeout(2000, (resolve, reject) => {
		let 
			scheduler = new Cron("* * * * * *", { maxRuns: 1 });
		scheduler.schedule(function () {});
		setTimeout(function () {
			let nextRun = scheduler.next();
			// Do comparison
			try {
				assert.equal(nextRun, null);
				resolve();
			} catch (e) {
				reject (e);
			}
		},1500);
	}));

}