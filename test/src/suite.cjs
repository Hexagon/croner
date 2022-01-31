let 
	test = require("uvu").test,
	assert = require("uvu/assert");

// Convenience function for asynchronous testing
const timeout = (timeoutMs, fn) => {
	return () => { 
		let to = void 0;
		return new Promise((resolve, reject) => {
			fn(resolve, reject);
			to = setTimeout(() => { reject(new Error("Timeout")); }, timeoutMs);
		}).finally(() => {
			clearTimeout(to);
		});
	};
};

// Actual tests
module.exports = function (Cron) {
	test("new Cron(...) should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * * * *");
			scheduler.next();
		});
	});

	test("cron(...) without `new` should not throw", function () {
		assert.not.throws(() => {
			let scheduler = Cron("* * * * * *");
			scheduler.next();
		});
	});
	
	test("Scheduling two functions with the same instance is not allowed", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * * *");
			scheduler.schedule((self) => { self.stop(); });
			scheduler.schedule((self) => { self.stop(); });
		});
	});

	test("Scheduling two functions with the same instance is not allowed (shorthand)", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * * *", (self) => { self.stop(); });
			scheduler.schedule((self) => { self.stop(); });
		});
	});

	test("Clean 6 part pattern should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * * * *");
			scheduler.next();
		});
	});

	test("Clean 5 part pattern should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * * *");
			scheduler.next();
		});
	});

	test("String object pattern should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron(new String("* * * * * *"));
			scheduler.next();
		});
	});
	
	test("Short pattern should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * *");
			scheduler.next();
		});
	});
	
	test("Long pattern should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * * * *");
			scheduler.next();
		});
	});
	
	test("Letter in pattern should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* a * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* */5 * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern with number first should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* 5/* * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern without following number should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* */ * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern with preceding number should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* 5/5 * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern with preceding letter should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* a/5 * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern with preceding comma separated entries should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* 1,2/5 * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern with preceding range should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* 1-15/5 * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern with preceding range separated by comma should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* 1-15/5,6 * * * *");
			scheduler.next();
		});
	});

	test("Range separated by comma should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* 1-15,17 * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern with wildcards both pre and post should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* */* * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern with range pre should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* 15-45/15 * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern with zero stepping should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* */0 * * * *");
			scheduler.next();
		});
	});

	test("Range with stepping with zero stepping should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* 10-20/0 * * * *");
			scheduler.next();
		});
	});

	test("Range with stepping with illegal upper range should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* 10-70/5 * * * *");
			scheduler.next();
		});
	});

	test("Range with stepping with illegal range should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* 50-40/5 * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern with letter after should throw should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* */a * * * *");
			scheduler.next();
		});
	});

	test("Slash in pattern with too high stepping should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* */61 * * * *");
			scheduler.next();
		});
	});

	test("Multiple stepping should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* */5/5 * * * *");
			scheduler.next();
		});
	});

	test("Missing lower range should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* -9 * * * *");
			scheduler.next();
		});
	});

	test("Missing upper range should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* 0- * * * *");
			scheduler.next();
		});
	});

	test("Higher upper range than lower range should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* 12-2 * * * *");
			scheduler.next();
		});
	});

	test("Rangerange should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* 0-0-0 * * * *");
			scheduler.next();
		});
	});

	test("Invalid data type of pattern should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron(new Date());
			scheduler.next();
		});
	});

	test("Valid range should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* 0-9 * * * *");
			scheduler.next();
		});
	});

	test("Valid seconds should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("0-59 * * * * *");
			scheduler.next();
		});
	});

	test("Too high second should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("0-60 * * * * *");
			scheduler.next();
		});
	});

	test("Valid minutes should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* 0-59 * * * *");
			scheduler.next();
		});
	});

	test("Too high minute should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* 0-5,55,60 * * * *");
			scheduler.next();
		});
	});

	test("Valid hours should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * 0-23 * * *");
			scheduler.next();
		});
	});

	test("Too high hours minute should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * 0,23,24 * * *");
			scheduler.next();
		});
	});
	
	test("Array passed as next date should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * * *");
			scheduler.next([]);
		});
	});

	test("Valid days should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * 1-31 * *");
			scheduler.next();
		});
	});

	test("31st february should not be found", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * 31 2 *");
			assert.equal(scheduler.next(),null);
		});
	});

	test("Too high days should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * 32 * *");
			scheduler.next();
		});
	});

	test("Too low days should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * 0 * *");
			scheduler.next();
		});
	});

	test("Valid months should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * * 1,2,3,4,5,6,7,8,9,10,11,12 *");
			scheduler.next();
		});
	});

	test("Too high months should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * 7-13 *");
			scheduler.next();
		});
	});

	test("Too low months should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * 0-3 *");
			scheduler.next();
		});
	});

	test("Valid weekdays should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * * * 0,1,2,3,4,5,6,7");
			scheduler.next();
		});
	});

	test("Too high weekday should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * * 8");
			scheduler.next();
		});
	});

	test("Too low weekday should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * * -1");
			scheduler.next();
		});
	});

	test("0 0 0 * * * should return tomorrow, at 00:00:00", function () {
		let scheduler = new Cron("0 0 0 * * *"),
			nextRun = scheduler.next(),

			// ToDay/nextDay is a fix for DST in test
			toDay = new Date(),
			nextDay = new Date(new Date().getTime()+24*60*60*1000);     // Add one day

		// Set seconds, minutes and hours to 00:00:00
		toDay.setMilliseconds(0);
		toDay.setSeconds(0);
		toDay.setMinutes(0);
		toDay.setHours(0);
		nextDay = new Date(toDay.getTime()+36*60*60*1000);
		nextDay.setMilliseconds(0);
		nextDay.setSeconds(0);
		nextDay.setMinutes(0);
		nextDay.setHours(0);

		// Do comparison
		assert.equal(nextRun.getTime(),nextDay.getTime());

	});

	test("new String(\"0 0 0 * * *\") should return tomorrow, at 00:00:00", function () {
		let scheduler = new Cron(new String("0 0 0 * * *")),
			nextRun = scheduler.next(),

			// ToDay/nextDay is a fix for DST in test
			toDay = new Date(),
			nextDay = new Date(new Date().getTime()+24*60*60*1000);     // Add one day

		// Set seconds, minutes and hours to 00:00:00
		toDay.setMilliseconds(0);
		toDay.setSeconds(0);
		toDay.setMinutes(0);
		toDay.setHours(0);
		nextDay = new Date(toDay.getTime()+36*60*60*1000);
		nextDay.setMilliseconds(0);
		nextDay.setSeconds(0);
		nextDay.setMinutes(0);
		nextDay.setHours(0);


		// Do comparison
		assert.equal(nextRun.getTime(),nextDay.getTime());

	});

	test("0 0 12 * * * with startdate tomorrow should return day after tomorrow, at 12:00:00", function () {
		let 
			nextDay = new Date(new Date().getTime()+24*60*60*1000),		// Add one day
			dayAfterNext = new Date(new Date().getTime()+48*60*60*1000),// Add two days
			scheduler,
			nextRun;

		// Set a fixed hour later than startAt, to be sure that the days doesn't overlap
		nextDay =  new Date(nextDay.setUTCHours(14));
		scheduler = new Cron("0 0 12 * * *", {timezone: "Etc/UTC", startAt: nextDay.toISOString() });
		nextRun = scheduler.next();

		// Set seconds, minutes and hours to 00:00:00
		dayAfterNext.setMilliseconds(0);
		dayAfterNext.setUTCSeconds(0);
		dayAfterNext.setUTCMinutes(0);
		dayAfterNext.setUTCHours(12);

		// Do comparison
		assert.equal(nextRun.getTime(),dayAfterNext.getTime());

	});

	test("* 17 * * * should return today, at 17:00:00 (if time is before 17:00:00)", function () {
		let 
			todayAt12 = new Date(), // Subtract one day
			scheduler,
			nextRun;

		todayAt12.setHours(12);
		todayAt12.setMinutes(34);
		todayAt12.setMinutes(54);

		scheduler = new Cron("* * 17 * * *");
		nextRun = scheduler.next(todayAt12);

		// Do comparison
		assert.equal(nextRun.getHours(),17);
		assert.equal(nextRun.getMinutes(),0);
		assert.equal(nextRun.getMinutes(),0);

	});

	test("*/5 * 15 * * should return today, at 15:00:00 (if time is before 17:00:00)", function () {
		let 
			todayAt12 = new Date(), // Subtract one day
			scheduler,
			nextRun;

		todayAt12.setHours(12);
		todayAt12.setMinutes(34);
		todayAt12.setMinutes(54);

		scheduler = new Cron("*/5 * 15 * * *");
		nextRun = scheduler.next(todayAt12);

		// Do comparison
		assert.equal(nextRun.getHours(),15);
		assert.equal(nextRun.getMinutes(),0);
		assert.equal(nextRun.getMinutes(),0);
		
	});

	
	test("* * 15 * * should return today, at 15:00:00 (if time is before 17:00:00)", function () {
		let 
			todayAt12 = new Date(), // Subtract one day
			scheduler,
			nextRun;

		todayAt12.setHours(12);
		todayAt12.setMinutes(34);
		todayAt12.setMinutes(54);

		scheduler = new Cron("* * 15 * * *");
		nextRun = scheduler.next(todayAt12);

		// Do comparison
		assert.equal(nextRun.getHours(),15);
		assert.equal(nextRun.getMinutes(),0);
		assert.equal(nextRun.getMinutes(),0);
		
	});

	test("*/5 * 11 * * should return next day, at 11:00:00, if time is 12", function () {
		let 
			todayAt12 = new Date(), // Subtract one day
			scheduler,
			nextRun;

		todayAt12.setHours(12);
		todayAt12.setMinutes(34);
		todayAt12.setMinutes(54);

		scheduler = new Cron("*/5 * 11 * * *");
		nextRun = scheduler.next(todayAt12);

		// Do comparison
		assert.equal(nextRun.getHours(),11);
		assert.equal(nextRun.getMinutes(),0);
		assert.equal(nextRun.getMinutes(),0);
		
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

	test("scheduler should be passed as first argument to triggered function",  timeout(2000, (resolve) => {
		let 
			scheduler = new Cron("* * * * * *", { maxRuns: 1 });
		scheduler.schedule(function (self) {
			assert.equal(self.options.maxRuns,0);
			assert.equal(typeof self.pause, "function");
			resolve();
		});
	}));

	test("0 0 0 * * * with 40 iterations should return 40 days from now", function () {
		let scheduler = new Cron("0 0 0 * * *"),
			prevRun = new Date(),
			nextRun,
			iterations = 40,
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
		assert.equal(nextRun.getTime(),compareDay.getTime());

	});

	test("0 * * * * * with 40 iterations should return 45 minutes from now", function () {
		let scheduler = new Cron("0 * * * * *"),
			prevRun = new Date(),
			nextRun,
			iterations = 45,
			compareDay = new Date(new Date().getTime()+45*60*1000);

		while(iterations-->0) {
			nextRun = scheduler.next(prevRun),
			prevRun = nextRun;
		}

		// Set seconds, minutes and hours to 00:00:00
		compareDay.setMilliseconds(0);
		compareDay.setSeconds(0);

		// Do comparison
		assert.equal(nextRun.getTime(),compareDay.getTime());

	});

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

	test("Weekday 0 (sunday) and weekday 7 (sunday) should both be valid patterns", function () {
		assert.not.throws(() => {
			let 
				scheduler0 = new Cron("0 0 0 * * 0");
			scheduler0.next();
			let
				scheduler7 = new Cron("0 0 0 * * 7");
			scheduler7.next();
		});
	});

	test("Weekday 0 (sunday) and weekday 7 (sunday) should give the same run time", function () {
		let 
			scheduler0 = new Cron("0 0 0 * * 0"),
			scheduler7 = new Cron("0 0 0 * * 7"),
			nextRun0 = scheduler0.next(),
			nextRun7 = scheduler7.next();
		assert.equal(nextRun0.getTime(),nextRun7.getTime());
	});

	test("Test milliseconds to 01:01:01 XXXX-01-01 (most often next year), 1000s steps", function () {

		let prevRun = new Date(new Date().setMilliseconds(0)),
			target = new Date(new Date((prevRun.getFullYear()+1) + "-01-01 01:01:01").getTime()),
			scheduler = new Cron("1 1 1 1 1 *"),
			left,
			diff;

		assert.equal(target.getTime(),scheduler.next().getTime());
		if(target.getTime() === scheduler.next().getTime()) {
			while(prevRun < target) {
				left = scheduler.msToNext(prevRun);
				diff = Math.abs((target.getTime() - prevRun.getTime())-left);
				assert.ok(diff<=1000);
				assert.ok(diff>=0);

				// Advance 1000s
				prevRun.setMilliseconds(1000000);
			}
		}

	});
	test("Test milliseconds to 23:59:59 XXXX-01-01 (most often next year), 1000s steps", function () {

		let prevRun = new Date(new Date().setMilliseconds(0)),
			target = new Date(new Date((prevRun.getFullYear()+1) + "-01-01 23:59:59").getTime()),
			scheduler = new Cron("59 59 23 1 1 *"),
			left,
			diff;
		
		assert.equal(target.getTime(),scheduler.next().getTime());
		
		if(target.getTime() === scheduler.next().getTime()) {
			while(prevRun < target) {
				left = scheduler.msToNext(prevRun);
				diff = Math.abs((target.getTime() - prevRun.getTime())-left);
				assert.ok(diff<=1000);
				assert.ok(diff>=0);

				// Advance 1000s
				prevRun.setMilliseconds(1000000);
			}
		}

	});
	test("Test when next thursday 1st november occurr, starting from 2021-10-13 00:00:00", function () {
		assert.equal(Cron("0 0 0 1 11 4").next(new Date(1634076000000)).getFullYear(), 2029);
	});
	test("getTime should return expcted difference with different timezones (now)", function () {
		let timeStockholm = Cron("* * * * * *", {timezone: "Europe/Stockholm"}).next().getTime(),
			timeNewYork = Cron("* * * * * *", {timezone: "America/New_York"}).next().getTime();

		// The time right now should be the same in utc wether in new york or stockholm
		assert.ok(timeStockholm>=timeNewYork-4000);
		assert.ok(timeStockholm<=timeNewYork+4000);
	});
	test("getTime should return expcted difference with different timezones (next 31st october)", function () {
		let refTime = new Date();
		refTime.setFullYear(2021);
		refTime.setMonth(9);
		let
			timeStockholm = Cron("0 0 0 31 10 *", {timezone: "Europe/Stockholm"}).next(refTime).getTime(),
			timeNewYork = Cron("0 0 0 31 10 *", {timezone: "America/New_York"}).next(refTime).getTime(),
			diff = (timeNewYork-timeStockholm)/1000/3600;

		// The time when next sunday 1st november occur should be with 6 hours difference (seen from utc)
		assert.equal(diff,6);
	});
	test("getTime should return expcted difference with different timezones (next 1st november)", function () {
		let timeStockholm = Cron("0 0 0 1 11 *", {timezone: "Europe/Stockholm"}).next().getTime(),
			timeNewYork = Cron("0 0 0 1 11 *", {timezone: "America/New_York"}).next().getTime(),
			diff = (timeNewYork-timeStockholm)/1000/3600;

		// The time when next sunday 1st november occur should be with 6 hours difference (seen from utc)
		assert.equal(diff,5);
	});
	test("maxRuns should be inherited from scheduler to job", function () {
		let scheduler = Cron("* * * 1 11 4", {maxRuns: 14}),
			job = scheduler.schedule(() => {});
		assert.equal(job.options.maxRuns,14);
		job.stop();
	});
	test("Next saturday at 29th of february should occur 2048. Also test weekday an month names and case insensitivity", function () {
		let nextSaturday29feb = Cron("0 0 0 29 feb SAT").next(new Date(1634076000000));
		assert.equal(nextSaturday29feb.getFullYear(),2048);
	});
	test("Impossible combination should result in null", function () {
		let impossible = Cron("0 0 0 30 2 6").next(new Date(1634076000000));
		assert.equal(null, impossible);
	});
	test("scheduled job should not stop on unhandled error with option catch: true",  timeout(4000, (resolve) => {
		let first = true;
		let job = Cron("* * * * * *",{catch: true},() => { 
			if (first) {
				first = false;
				throw new Error("E");
			}
			job.stop();
			resolve(); 
		});
	}));
	test("shorthand schedule without options should not throw, and execute",  timeout(2000, (resolve, reject) => {
		try {
			let job = Cron("* * * * * *",() => { job.stop(); resolve(); });
		} catch (e) {
			reject(e);
		}
	}));
	test("sanity check start stop resume", function () {
		let job = Cron("* * * 1 11 4",() => {});
		assert.not.throws(() => {
			job.pause();
			job.resume();
			job.stop();
		});
	});
	test("pause by options work",  timeout(2000, (resolve, reject) => {
		try {
			let job = Cron("* * * * * *",{paused:true},() => { throw new Error("This should not happen"); });
			setTimeout(function () {
				job.stop();
				resolve();
			},1500);
		} catch (e) {
			reject(e);
		}
	}));
	test("previous run time should be null if not yet executed", function () {
		let job = Cron("* * * 1 11 4",() => {});
		let result = job.previous();
		assert.equal(result,null);
		job.stop();
	});
	test("previous run time should be set if executed",  timeout(2000, (resolve, reject) => {
		let 
			scheduler = new Cron("* * * * * *", { maxRuns: 1 });
		scheduler.schedule(function () {});
		setTimeout(function () {
			let previous = scheduler.previous();
			// Do comparison
			try {
				assert.ok(previous>=new Date().getTime()-3000);
				assert.ok(previous<=new Date().getTime()+3000);
				scheduler.stop();
				resolve();
			} catch (e) {
				reject(e);
			}
		},1500);
	}));

	test("Isrunning should not throw, and return correct value after control functions is used", function () {
		let 
			scheduler0 = new Cron("0 0 0 * * 0");
		assert.equal(scheduler0.running(), false);
		scheduler0.schedule(() => {});
		assert.equal(scheduler0.running(), true);
		scheduler0.pause();
		assert.equal(scheduler0.running(), false);
		scheduler0.resume();
		assert.equal(scheduler0.running(), true);
		scheduler0.stop();
		assert.equal(scheduler0.running(), false);
	});

	test("DST/Timezone", function () {
		let 
			dayOne = new Date("2021-10-31T20:00:00"), // Last day of DST
			scheduler = new Cron("0 0 12 * * *", {timezone: "Etc/UTC", startAt: dayOne }),
			nextRun = scheduler.next(); // Next run in local time

		// Do comparison
		assert.equal(nextRun.getUTCHours(), 12);

	});

	test("Context is passed", timeout(2000, (resolve, reject) => {
		const 
			c = { a: "b" };
		Cron("* * * * * *", { context: c }, (self, context) => {
			self.stop();
			if (!context || (context && context.a && context.a !== "b")) {
				reject(new Error("Failure"));
			} else {
				resolve();
			}
		});
	}));

	test.run();
};