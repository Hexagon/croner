let 
	assert = require("uvu/assert"),
	timeout = require("../util/timeout.cjs");

module.exports = function (Cron, test) {

	test("name should be undefined if it's not specified", function () {
		const scheduler = new Cron("* * * * * *");
		assert.is(scheduler.name, undefined);
	});

	test("name should be defined if it's specified", function () {
		const uniqueName = "TestJob5" + new Date().getTime().toString();
		const scheduler = new Cron("* * * * * *", { name: uniqueName });
		assert.is(scheduler.name, uniqueName);
	});

	test("Valid startAt with DateTime string should not throw", function () {
		assert.not.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { startAt: "2016-12-01 00:00:00" });
			scheduler.nextRun();
		});
	});

	test("startAt with Date string should not throw (treated like local 00:00:00)", function () {
		assert.not.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { startAt: "2016-12-01" });
			scheduler.nextRun();
		});
	});

	test("Invalid startat should throw", function () {
		assert.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { startAt: "hellu throw" });
			scheduler.nextRun();
		});
	});

	test("startAt with time only should throw", function () {
		assert.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { startAt: "00:35:00" });
			scheduler.nextRun();
		});
	});

	test("Valid stopAt with Date should not throw", function () {
		assert.not.throws(() => {
			let 
				dayBefore = new Date(new Date().getTime()-24*60*60*1000), // Subtract one day
				scheduler = new Cron("0 0 12 * * *", { stopAt: dayBefore });
			scheduler.nextRun();
		});
	});

	test("Valid stopAt with DateTime string should not throw", function () {
		assert.not.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "2016-12-01 00:00:00" });
			scheduler.nextRun();
		});
	});

	test("Valid stopAt with Date string should not throw", function () {
		assert.not.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "2016-12-01" });
			scheduler.nextRun();
		});
	});

	test("Invalid stopAt should throw", function () {
		assert.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "hellu throw" });
			scheduler.nextRun();
		});
	});

	test("Invalid unref should throw", function () {
		assert.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { unref: "hellu throw" });
			scheduler.nextRun();
		});
	});
	test("Valid unref should not throw", function () {
		let 
			scheduler = new Cron("0 0 12 * * *", { unref: true });
		scheduler.nextRun();
	});
	test("Setting unref to true should work", function () {
		let 
			scheduler = new Cron("0 0 12 * * *", { unref: true }, () => {});
		scheduler.nextRun();
		scheduler.stop();
		assert.equal(scheduler.options.unref,true);
	});
	test("Undefined unref should set unref to false", function () {
		let 
			scheduler = new Cron("0 0 12 * * *");
		scheduler.nextRun();
		assert.equal(scheduler.options.unref,false);
	});
	test("Valid utc offset should not throw", function () {
		assert.not.throws(() => {
			Cron("0 0 12 * * *", { utcOffset: -120});
		});
	});
	test("Invalid utc offset should throw", function () {
		assert.throws(() => {
			Cron("0 0 12 * * *", { utcOffset: "hello"});
		});
	});
	test("Out of bounds utc offset should throw", function () {
		assert.throws(() => {
			Cron("0 0 12 * * *", { utcOffset: 3000 });
		});
	});
	test("Combining utcOffset with timezone should throw", function () {
		assert.throws(() => {
			Cron("0 0 12 * * *", { utcOffset: 60, timezone: "Europe/Stockholm" });
		});
	});
	test("stopAt with time only should throw", function () {
		assert.throws(() => {
			let 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "00:35:00" });
			scheduler.nextRun();
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
		nextRun = scheduler.nextRun();

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
			nextRun = scheduler.nextRun();

		// Do comparison
		assert.equal(nextRun, null);

	});

	test("* * * * * * with maxRuns: 1 should return null after 1.5 seconds",  timeout(2000, (resolve, reject) => {
		let 
			scheduler = new Cron("* * * * * *", { maxRuns: 1 });
		scheduler.schedule(function () {});
		setTimeout(function () {
			let nextRun = scheduler.nextRun();
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
			let nextRun = scheduler.nextRun();
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
			let nextRun = scheduler.nextRun();
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
			Cron("* * * * * *", { interval: "a" }).nextRuns(3, "2022-02-17T00:00:00");
		});
	});

	test("Negative interval should throw", function () {
		assert.throws(() => {
			Cron("* * * * * *", { interval: "-1" }).nextRuns(3, "2022-02-17T00:00:00");
		});
	});

	test("Positive string interval should not throw", function () {
		assert.not.throws(() => {
			Cron("* * * * * *", { interval: "102" }).nextRuns(3, "2022-02-17T00:00:00");
		});
	});


	test("Valid interval should give correct run times", function () {
		let nextRuns = Cron("0,30 * * * * *", { interval: 90 }).nextRuns(3, "2022-02-16T00:00:00");
		
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
		let nextRuns = Cron("* * * * * *", { maxRuns: 5 }).nextRuns(10);
		
		assert.equal(nextRuns.length,5);
	});

	test("Valid interval starting in the past should give correct start date", function () {
		const now = new Date();
    
		const yesterday = new Date(now);
		yesterday.setDate(now.getDate() - 1);
		yesterday.setHours(19, 31, 2);
	
		const sixDaysFromNow = new Date(now);
		sixDaysFromNow.setDate(now.getDate() + 6);
		sixDaysFromNow.setHours(19, 31, 2);
	
		const nextRun = Cron("* * * * * *", { interval: 60 * 60 * 24 * 7, startAt: yesterday.toISOString() }).nextRun();
		
		assert.equal(nextRun.getFullYear(), sixDaysFromNow.getFullYear());
		assert.equal(nextRun.getMonth(), sixDaysFromNow.getMonth());
		assert.equal(nextRun.getDate(), sixDaysFromNow.getDate());
		assert.equal(nextRun.getHours(), sixDaysFromNow.getHours());
		assert.equal(nextRun.getMinutes(), sixDaysFromNow.getMinutes());
		assert.equal(nextRun.getSeconds(), sixDaysFromNow.getSeconds());
	});

	test("Valid interval starting in the future should give correct start date", function () {

		const now = new Date();
	
		const tomorrow = new Date(now);
		tomorrow.setDate(now.getDate() + 1);
		tomorrow.setHours(0, 31, 2);
	
		const nextRun = Cron("* * * * * *", { interval: 60 * 60 * 24 * 7, startAt: tomorrow.toISOString() }).nextRun();
		
		assert.equal(nextRun.getFullYear(), tomorrow.getFullYear());
		assert.equal(nextRun.getMonth(), tomorrow.getMonth());
		assert.equal(nextRun.getDate(), tomorrow.getDate());
		assert.equal(nextRun.getHours(), tomorrow.getHours());
		assert.equal(nextRun.getMinutes(), tomorrow.getMinutes());
		// The seconds are not checked because there will be no previous run, so CronDate.increment() will add 1 second to the nextRun
	});

};