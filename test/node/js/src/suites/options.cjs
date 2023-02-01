let 
	assert = require("uvu/assert"),
	timeout = require("../util/timeout.cjs");

module.exports = function (Cron, test) {

	test("name should be undefined if it's not specified", function () {
		const scheduler = new Cron("* * * * * *");
		assert.is(scheduler.name, undefined);
	});

	test("name should be defined if it's specified", function () {
		const scheduler = new Cron("* * * * * *", { name: "my job" });
		assert.is(scheduler.name, "my job");
	});

	test("Valid startAt with DateTime string should not throw", function () {
		assert.not.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { startAt: "2016-12-01 00:00:00" });
			scheduler.next();
		});
	});

	test("startAt with Date string should not throw (treated like local 00:00:00)", function () {
		assert.not.throws(() => {
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

	test("Valid stopAt with Date string should not throw", function () {
		assert.not.throws(() => {
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

	test("* * * * * * with maxRuns: 1 should return null after 1.5 seconds (legacyMode)",  timeout(2000, (resolve, reject) => {
		let 
			scheduler = new Cron("* * * * * *", { maxRuns: 1, legacyMode: true });
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

	test("* * * * * * with maxRuns: 1 should return null after 1.5 seconds (swapped argument order)",  timeout(2000, (resolve, reject) => {
		let hasRun = false,
			scheduler = new Cron(
				"* * * * * *", 
				function () { hasRun = true; },
				{ maxRuns: 1 }
			);
		setTimeout(function () {
			let nextRun = scheduler.next();
			// Do comparison
			try {
				assert.equal(nextRun, null);
				assert.equal(hasRun, true);
				resolve();
			} catch (e) {
				reject (e);
			}
		},1500);
	}));


	test("Invalid interval should throw", function () {
		assert.throws(() => {
			Cron("* * * * * *", { interval: "a" }).enumerate(3, "2022-02-17T00:00:00");
		});
	});

	test("Negative interval should throw", function () {
		assert.throws(() => {
			Cron("* * * * * *", { interval: "-1" }).enumerate(3, "2022-02-17T00:00:00");
		});
	});

	test("Positive string interval should not throw", function () {
		assert.not.throws(() => {
			Cron("* * * * * *", { interval: "102" }).enumerate(3, "2022-02-17T00:00:00");
		});
	});


	test("Valid interval should give correct run times", function () {
		let nextRuns = Cron("0,30 * * * * *", { interval: 90 }).enumerate(3, "2022-02-16T00:00:00");
		
		assert.equal(nextRuns[0].getFullYear(),2022);
		assert.equal(nextRuns[0].getMonth(),1);
		assert.equal(nextRuns[0].getDate(),16);
		assert.equal(nextRuns[0].getHours(),0);
		assert.equal(nextRuns[0].getMinutes(),1);
		assert.equal(nextRuns[0].getSeconds(),30);
		assert.equal(nextRuns[1].getHours(),0);
		assert.equal(nextRuns[1].getMinutes(),3);
		assert.equal(nextRuns[1].getSeconds(),0);
	});

	test("The number of run times returned by enumerate() should not be more than maxRuns", function () {
		let nextRuns = Cron("* * * * * *", { maxRuns: 5 }).enumerate(10);
		
		assert.equal(nextRuns.length,5);
	});

};