let 
	assert = require("uvu/assert"),
	timeout = require("../util/timeout.cjs"),
	sleep = require("../util/sleep.cjs");
	
module.exports = function (Cron, test, scheduledJobs) {

	test("Created jobs should appear in the 'scheduledJobs' array", function() {
		const uniqueName = "TestJob3" + new Date().getTime().toString();
		const job = new Cron("* * * * * *", { name: uniqueName});
		assert.equal(scheduledJobs.find(j => j === job), job);
		job.stop();
	});

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

	test("Array passed as next date should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * * *");
			scheduler.next([]);
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
   
	test("Too high hours minute should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * 0,23,24 * * *");
			scheduler.next();
		});
	});
     

	test("Options as second argument should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * * * *", {maxRuns: 1});
			scheduler.next();
		});
	});

	test("Options as third argument should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * * * *", () => {}, {maxRuns: 1});
			scheduler.next();
		});
	});

	test("Text as second argument should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * * *", "bogus", {maxRuns: 1});
			scheduler.next();
		});
	});

	test("Text as third argument should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * * *", {maxRuns: 1}, "bogus");
			scheduler.next();
		});
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

	test("Next 10 run times is returned by enumeration(), and contain a reasonable time span", () => {

		let 
			now = new Date(),
			nextRuns = Cron("*/30 * * * * *").enumerate(10);

		// Check number of times returned
		assert.equal(nextRuns.length, 10);

		// Check that time span of first entry is within a minute
		assert.equal(nextRuns[0].getTime() >= now.getTime()-1000, true);
		assert.equal(nextRuns[0].getTime() <= now.getTime()+61*1000, true);

		// Check that time span of last entry is about 5 minutes from now
		assert.equal(nextRuns[9].getTime() > now.getTime()+4*60*1000, true);
		assert.equal(nextRuns[9].getTime() < now.getTime()+6*60*1000, true);

	});

	test("Next 10 run times is returned by enumeration(), and contain a reasonable time span, when using modified start time", () => {

		// 20 minutes before now
		let 
			now = new Date(new Date().getTime()-1200*1000),
			nextRuns = Cron("0 * * * * *").enumerate(10, now);

		// Check number of times returned
		assert.equal(nextRuns.length, 10);

		// Check that time span of first entry is within a minute
		assert.equal(nextRuns[0].getTime() >= now.getTime(), true);
		assert.equal(nextRuns[0].getTime() <= now.getTime()+61*1000, true);

		// Check that time span of last entry is about 10 minutes from 'now'
		assert.equal(nextRuns[9].getTime() > now.getTime()+9*60*1000, true);
		assert.equal(nextRuns[9].getTime() < now.getTime()+11*60*1000, true);

	});

	test("@yearly should be replaced", function () {
		let nextRuns = Cron("@yearly").enumerate(3, "2022-02-17T00:00:00");
		assert.equal(nextRuns[0].getFullYear(),2023);
		assert.equal(nextRuns[0].getMonth(),0);
		assert.equal(nextRuns[0].getDate(),1);
		assert.equal(nextRuns[1].getFullYear(),2024);
		assert.equal(nextRuns[2].getFullYear(),2025);
	});

	test("@annually should be replaced", function () {
		let nextRuns = Cron("@annually").enumerate(3, "2022-02-17T00:00:00");
		assert.equal(nextRuns[0].getFullYear(),2023);
		assert.equal(nextRuns[0].getMonth(),0);
		assert.equal(nextRuns[0].getDate(),1);
	});

	test("@monthly should be replaced", function () {
		let nextRuns = Cron("@monthly").enumerate(3, "2022-02-17T00:00:00");
		assert.equal(nextRuns[0].getFullYear(),2022);
		assert.equal(nextRuns[0].getMonth(),2);
		assert.equal(nextRuns[0].getDate(),1);
		assert.equal(nextRuns[1].getMonth(),3);
		assert.equal(nextRuns[1].getDate(),1);
		assert.equal(nextRuns[2].getMonth(),4);
		assert.equal(nextRuns[2].getDate(),1);
	});

	test("@weekly should be replaced", function () {
		let nextRuns = Cron("@weekly").enumerate(3, "2022-02-17T00:00:00");
		assert.equal(nextRuns[0].getFullYear(),2022);
		assert.equal(nextRuns[0].getMonth(),1);
		assert.equal(nextRuns[0].getDate(),20);
		assert.equal(nextRuns[1].getMonth(),1);
		assert.equal(nextRuns[1].getDate(),27);
		assert.equal(nextRuns[2].getMonth(),2);
		assert.equal(nextRuns[2].getDate(),6);
	});

	test("@weekly should be replaced", function () {
		let nextRuns = Cron("@daily").enumerate(3, "2022-02-17T12:00:00");
		assert.equal(nextRuns[0].getFullYear(),2022);
		assert.equal(nextRuns[0].getMonth(),1);
		assert.equal(nextRuns[0].getDate(),18);
		assert.equal(nextRuns[1].getMonth(),1);
		assert.equal(nextRuns[1].getDate(),19);
		assert.equal(nextRuns[2].getMonth(),1);
		assert.equal(nextRuns[2].getDate(),20);
	});

	test("@wekly should throw", function () {
		assert.throws(() => {
			Cron("@wekly").enumerate(3, "2022-02-17T12:00:00");
		});
	});

	test("@hourly should be replaced", function () {
		let nextRuns = Cron("@hourly").enumerate(3, "2022-02-16T23:59:00");
		assert.equal(nextRuns[0].getFullYear(),2022);
		assert.equal(nextRuns[0].getMonth(),1);
		assert.equal(nextRuns[0].getDate(),17);
		assert.equal(nextRuns[0].getHours(),0);
		assert.equal(nextRuns[1].getMonth(),1);
		assert.equal(nextRuns[1].getDate(),17);
		assert.equal(nextRuns[1].getHours(),1);
		assert.equal(nextRuns[2].getHours(),2);
	});

	test("Croner should increment seconds", function () {
		let runs = Cron("* * * * * *").enumerate(4);
		assert.ok(runs[0] < runs[1]);
		assert.ok(runs[1] < runs[2]);
		assert.ok(runs[2] < runs[3]);
	});

	test("Croner should increment minutes", function () {
		let runs = Cron("0 * * * * *").enumerate(4);
		assert.ok(runs[0] < runs[1]);
		assert.ok(runs[1] < runs[2]);
		assert.ok(runs[2] < runs[3]);
	});

	test("Croner should increment hours", function () {
		let runs = Cron("0 0 * * * *").enumerate(4);
		assert.ok(runs[0] < runs[1]);
		assert.ok(runs[1] < runs[2]);
		assert.ok(runs[2] < runs[3]);
	});

	test("Croner should increment days", function () {
		let runs = Cron("0 0 0 * * *").enumerate(4);
		assert.ok(runs[0] < runs[1]);
		assert.ok(runs[1] < runs[2]);
		assert.ok(runs[2] < runs[3]);
	});
	test("Croner should increment months", function () {
		let runs = Cron("0 0 0 1 * *").enumerate(4);
		assert.ok(runs[0] < runs[1]);
		assert.ok(runs[1] < runs[2]);
		assert.ok(runs[2] < runs[3]);
	});

	test("Croner should increment years", function () {
		let runs = Cron("0 0 0 1 12 *").enumerate(4);
		assert.ok(runs[0] < runs[1]);
		assert.ok(runs[1] < runs[2]);
		assert.ok(runs[2] < runs[3]);
	});

	test("Croner should increment weeks", function () {
		let runs = Cron("0 0 0 * * 1").enumerate(4);
		assert.ok(runs[0] < runs[1]);
		assert.ok(runs[1] < runs[2]);
		assert.ok(runs[2] < runs[3]);
	});

	test("Croner should increment last day of month", function () {
		let runs = Cron("0 0 0 L * *").enumerate(4);
		assert.ok(runs[0] < runs[1]);
		assert.ok(runs[1] < runs[2]);
		assert.ok(runs[2] < runs[3]);
	});

	test("Croner should give correct last day of months", function () {
		let runs = Cron("0 0 0 L * *").enumerate(4, "2022-01-01T00:00:00");
		
		assert.equal(runs[0].getFullYear(), 2022);
		assert.equal(runs[0].getMonth(), 0);
		assert.equal(runs[0].getDate(), 31);
		assert.equal(runs[0].getHours(), 0);

		assert.equal(runs[1].getFullYear(), 2022);
		assert.equal(runs[1].getMonth(), 1);
		assert.equal(runs[1].getDate(), 28);
		assert.equal(runs[1].getHours(), 0);

		assert.equal(runs[2].getFullYear(), 2022);
		assert.equal(runs[2].getMonth(), 2);
		assert.equal(runs[2].getDate(), 31);
		assert.equal(runs[2].getHours(), 0);

	});

	test("Croner should give correct last day of months when combined with other dates", function () {
		let runs = Cron("0 0 0 15,L * *").enumerate(4, "2022-01-01T00:00:00");

		assert.equal(runs[0].getFullYear(), 2022);
		assert.equal(runs[0].getMonth(), 0);
		assert.equal(runs[0].getDate(), 15);
		assert.equal(runs[0].getHours(), 0);

		assert.equal(runs[1].getFullYear(), 2022);
		assert.equal(runs[1].getMonth(), 0);
		assert.equal(runs[1].getDate(), 31);
		assert.equal(runs[1].getHours(), 0);

		assert.equal(runs[2].getFullYear(), 2022);
		assert.equal(runs[2].getMonth(), 1);
		assert.equal(runs[2].getDate(), 15);
		assert.equal(runs[2].getHours(), 0);

		assert.equal(runs[3].getFullYear(), 2022);
		assert.equal(runs[3].getMonth(), 1);
		assert.equal(runs[3].getDate(), 28);
		assert.equal(runs[3].getHours(), 0);

	});

	test("Impossible combination should result in null (non legacy mode)", function () {
		let impossible = Cron("0 0 0 30 2 6", { legacyMode: false }).next(new Date(1634076000000));
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
	test("scheduled job should execute callback on unhandled error with option catch: callback()",  timeout(4000, (resolve) => {
		let job = Cron("* * * * * *",{catch: (e) => { 
			assert.instance(e,Error);
			resolve(); 
		}},() => { 
			job.stop();
			throw new Error("E");
		});
	}));
	test("scheduled job should execute callback on unhandled error with option catch: callback()",  timeout(4000, (resolve) => {
		let job = Cron("* * * * * *",{catch: async (e) => { 
			assert.instance(e,Error);
			resolve(); 
		}}, async () => {
			job.stop();
			throw new Error("E");
		}
		);
	}));
	test("Initializing two jobs with the same name should throw", () => {
		const uniqueName = "TestJob1" + new Date().getTime().toString();
		Cron("* * * * * *", { name: uniqueName, paused: true });
		assert.throws(() => {
			Cron("* * * * * *", { name: uniqueName, paused: true });
		}, "already taken");
	});
	test("named job should be found in other scope",  timeout(4000, (resolve) => {
		const uniqueName = "TestJob2" + new Date().getTime().toString();
		(() => {
			Cron("* * * * * *", { name: uniqueName });
		})();
		setTimeout(() => {
			const foundJob = Cron.scheduledJobs.find(j => j.name === uniqueName);
			if (foundJob && foundJob.name === uniqueName) {
				foundJob.stop();
				resolve();
			}
		},1500);
	}));
	test("unnamed job should not be found in other scope",  timeout(4000, (resolve) => {
		let ref;
		(() => {
			ref = Cron("* * * * * *", { paused: true });
		})();
		setTimeout(() => {
			const found = Cron.scheduledJobs.find(job => job === ref);
			if (!found) {
				resolve();
			}
			ref.stop();
		},500);
	}));
	test("Job should be working after 1500 ms",  timeout(4000, (resolve, reject) => {
		const job = Cron("* * * * * *", async () => {
			await sleep(2000);
			job.stop();
		});
		setTimeout(() => {
			if (job.busy()) {
				resolve();
			} else {
				reject();
			}
		},1500);
	}));
	test("Job should not be working after 3500 ms",  timeout(4000, (resolve, reject) => {
		const job = Cron("* * * * * *", async () => {
			await sleep(2000);
			job.stop();
		});
		setTimeout(() => {
			if (!job.busy()) {
				resolve();
			} else {
				reject();
			}
		},3500);
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
	test("trigger should run a paused job",  timeout(4000, (resolve) => {
		let job = Cron("* * * * * *",{paused:true},() => { job.stop(); resolve(); });
		job.trigger();
	}));
	test("trigger should run a stopped job",  timeout(4000, (resolve) => {
		let job = Cron("* * * * * *",{paused:true},() => { job.stop(); resolve(); });
		job.stop();
		job.trigger();
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

	test("maxRuns should be inherited from scheduler to job", function () {
		let scheduler = Cron("* * * 1 11 4", {maxRuns: 14}),
			job = scheduler.schedule(() => {});
		assert.equal(job.options.maxRuns,14);
		job.stop();
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

	test("Test when next thursday 1st november occurr, starting from 2021-10-13 00:00:00 (croner mode)", function () {
		assert.equal(Cron("0 0 0 1 11 4", { legacyMode: false }).next(new Date(1634076000000)).getFullYear(), 2029);
	});

	test("Test when next thursday 1st november occurr, starting from 2021-10-13 00:00:00 (legacy/default mode)", function () {
		assert.equal(Cron("0 0 0 1 11 4").next(new Date(1634076000000)).getFullYear(), 2021);
	});

	test("Next saturday at 29th of february should occur 2048. Also test weekday an month names and case insensitivity (croner mode)", function () {
		let nextSaturday29feb = Cron("0 0 0 29 feb SAT", { legacyMode: false }).next(new Date(1634076000000));
		assert.equal(nextSaturday29feb.getFullYear(),2048);
	});

	test("scheduler should be passed as first argument to triggered function",  timeout(2000, (resolve) => {
		let 
			scheduler = new Cron("* * * * * *", { maxRuns: 1 });
		scheduler.schedule(function (self) {
			assert.equal(self.options.maxRuns,0);
			assert.equal(typeof self.pause, "function");
			resolve();
		});
	}));

	test("0 0 0 * * * with 365 iterations should return 365 days from now", function () {
		let scheduler = new Cron("0 0 0 * * *"),
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

	test("0 * * * * * with 40 iterations should return 45 minutes from now (legacy mode)", function () {
		let scheduler = new Cron("0 * * * * *", { legacyMode: true }),
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

	test("Fire-once should be supported by ISO 8601 string, past and .next() should return null", function () {
		let 
			scheduler0 = new Cron("2020-01-01T00:00:00");
		assert.equal(scheduler0.next(),null);
	});

	test("Fire-once should be supported by ISO 8601 string, past and .next() should return null (legacy mode)", function () {
		let 
			scheduler0 = new Cron("2020-01-01T00:00:00", { legacyMode: true});
		assert.equal(scheduler0.next(),null);
	});

	test("Fire-once should be supported by ISO 8601 string, future and .next() should handle ISO 8601 UTC correctly", function () {
		let 
			scheduler0 = new Cron("2200-01-01T00:00:00Z", {timezone: "America/New_York"});
		assert.equal(scheduler0.next().getTime(),new Date(Date.UTC(2200,0,1,0,0,0)).getTime());
	});

	test("Fire-once should be supported by ISO 8601 string, past and .enumerate() should return zero items", function () {
		let 
			scheduler0 = new Cron("2018-01-01T00:00:00"),
			nextRun = scheduler0.enumerate(10);
		assert.equal(nextRun.length, 0);
	});

	test("Fire-once should be supported by ISO 8601 local string, future and .next() should return correct date", function () {
		let 
			scheduler0 = new Cron("2200-01-01T00:00:00"),
			nextRun = scheduler0.next();
		assert.equal(nextRun.getFullYear(), 2200);
		assert.equal(nextRun.getMonth(), 0);
		assert.equal(nextRun.getDate(), 1);
		assert.equal(nextRun.getHours(), 0);
	});

	test("Fire-once should be supported by ISO 8601 UTC string, future and .next() should return correct date", function () {
		let 
			scheduler0 = new Cron("2200-01-01T00:00:00Z"),
			nextRun = scheduler0.next();
		assert.equal(nextRun.getUTCFullYear(), 2200);
		assert.equal(nextRun.getUTCMonth(), 0);
		assert.equal(nextRun.getUTCDate(), 1);
		assert.equal(nextRun.getUTCHours(), 0);
	});


	test("Fire-once should be supported by ISO 8601 string, future and .enumerate() should return exactly one item", function () {
		let 
			scheduler0 = new Cron("2200-01-01T00:00:00"),
			nextRun = scheduler0.enumerate(10);
		assert.equal(nextRun.length, 1);
	});

	test("Fire-once should be supported by date, past and .next() should return null", function () {
		let 
			refTime = new Date(),
			twoSecsBeforeNow = new Date(refTime.getTime() - 2000),
			scheduler0 = new Cron(twoSecsBeforeNow),
			nextRun = scheduler0.next();
		assert.equal(nextRun, null);
	});


	test("Fire-once should be supported by date, future and .next() should return correct date", function () {
		let 
			refTime = new Date(),
			twoSecsFromNow = new Date(refTime.getTime() + 2000),
			scheduler0 = new Cron(twoSecsFromNow),
			nextRun = scheduler0.next();
		assert.equal(nextRun.getTime() > refTime.getTime(), true);
		assert.equal(nextRun.getTime() < refTime.getTime()+4000, true);
	});

	test("Invalid ISO 8601 local string should throw", function () {
		assert.throws(() => {
			let 
				scheduler0 = new Cron("2020-13-01T00:00:00");
			assert.equal(scheduler0.next(),null);
		});
	});

	test("Invalid ISO 8601 UTC string should throw", function () {
		assert.throws(() => {
			let 
				scheduler0 = new Cron("2020-13-01T00:00:00Z");
			assert.equal(scheduler0.next(),null);
		});
	});

	test("Weekday pattern should return correct weekdays", function () {
		let nextRuns = new Cron("0 0 0 * * 5,6").enumerate(10, "2022-02-17T00:00:00");
		assert.equal(nextRuns[0].getFullYear(),2022);
		assert.equal(nextRuns[0].getMonth(),1);
		assert.equal(nextRuns[0].getDate(),18);
		assert.equal(nextRuns[1].getDate(),19);
		assert.equal(nextRuns[2].getDate(),25);
		assert.equal(nextRuns[3].getDate(),26);
		assert.equal(nextRuns[4].getMonth(),2);
		assert.equal(nextRuns[4].getDate(),4);
		assert.equal(nextRuns[5].getDate(),5);
	});

	test("Weekday pattern should return correct weekdays (legacy mode)", function () {
		let nextRuns = new Cron("0 0 0 * * 5,6").enumerate(10, "2022-02-17T00:00:00");
		assert.equal(nextRuns[0].getFullYear(),2022);
		assert.equal(nextRuns[0].getMonth(),1);
		assert.equal(nextRuns[0].getDate(),18);
		assert.equal(nextRuns[1].getDate(),19);
		assert.equal(nextRuns[2].getDate(),25);
		assert.equal(nextRuns[3].getDate(),26);
		assert.equal(nextRuns[4].getMonth(),2);
		assert.equal(nextRuns[4].getDate(),4);
		assert.equal(nextRuns[5].getDate(),5);
	});

	test("Weekday pattern should return correct combined with day of month (croner mode)", function () {
		let nextRuns = new Cron("59 59 23 2 * 6", { legacyMode: false }).enumerate(2, "2022-02-17T00:00:00");
		assert.equal(nextRuns[0].getFullYear(),2022);
		assert.equal(nextRuns[0].getMonth(),3);
		assert.equal(nextRuns[0].getDate(),2);
		assert.equal(nextRuns[1].getFullYear(),2022);
		assert.equal(nextRuns[1].getMonth(),6);
		assert.equal(nextRuns[1].getDate(),2);
	});

	test("Weekday pattern should return correct weekdays (legacy mode)", function () {
		let nextRuns = new Cron("0 0 0 * * 5,6").enumerate(10, "2022-02-17T00:00:00");
		assert.equal(nextRuns[0].getFullYear(),2022);
		assert.equal(nextRuns[0].getMonth(),1);
		assert.equal(nextRuns[0].getDate(),18);
		assert.equal(nextRuns[1].getDate(),19);
		assert.equal(nextRuns[2].getDate(),25);
		assert.equal(nextRuns[3].getDate(),26);
		assert.equal(nextRuns[4].getMonth(),2);
		assert.equal(nextRuns[4].getDate(),4);
		assert.equal(nextRuns[5].getDate(),5);
	});

	test("Weekday pattern should return correct combined with day of month (legacy mode)", function () {
		let nextRuns = new Cron("59 59 23 2 * 6", { legacyMode: true }).enumerate(6, "2022-01-31T00:00:00");
		assert.equal(nextRuns[0].getFullYear(),2022);
		assert.equal(nextRuns[0].getMonth(),1);
		assert.equal(nextRuns[0].getDate(),2);
		assert.equal(nextRuns[1].getMonth(),1);
		assert.equal(nextRuns[1].getDate(),5);
		assert.equal(nextRuns[2].getMonth(),1);
		assert.equal(nextRuns[2].getDate(),12);
		assert.equal(nextRuns[3].getMonth(),1);
		assert.equal(nextRuns[3].getDate(),19);
		assert.equal(nextRuns[4].getMonth(),1);
		assert.equal(nextRuns[4].getDate(),26);
		assert.equal(nextRuns[5].getMonth(),2);
		assert.equal(nextRuns[5].getDate(),2);
	});

	test("Weekday pattern should return correct alone (legacy mode)", function () {
		let nextRuns = new Cron("15 9 * * mon", { legacyMode: true }).enumerate(3, "2022-02-28T23:59:00");
		assert.equal(nextRuns[0].getFullYear(),2022);
		assert.equal(nextRuns[0].getMonth(),2);
		assert.equal(nextRuns[0].getDate(),7);
		assert.equal(nextRuns[0].getHours(),9);
		assert.equal(nextRuns[0].getMinutes(),15);
		
		assert.equal(nextRuns[1].getDate(),14);
		assert.equal(nextRuns[1].getHours(),9);
		assert.equal(nextRuns[1].getMinutes(),15);

		assert.equal(nextRuns[2].getDate(),21);
		assert.equal(nextRuns[2].getHours(),9);
		assert.equal(nextRuns[2].getMinutes(),15);
		
	});

	test("Invalid date should throw", function () {
		assert.throws(() => {
			new Cron("15 9 * * mon", { legacyMode: true }).next(new Date("pizza"));
		});
	});

	test("Specific date should not create infinite loop (legacy mode)", function () {
		const cron = new Cron("0 * * * mon,tue,wed,fri,sat,sun", {
				legacyMode: true,
			}),
			next = cron.next(new Date("2022-03-31T11:40:34"));
		assert.equal(next.getFullYear(),2022);
		assert.equal(next.getMonth(),3);
		assert.equal(next.getDate(),1);
		assert.equal(next.getHours(),0);
	});

	test("Value of next, previous and current during trigger (legacy mode)",  timeout(4000, (resolve, reject) => {
		let run = 1;
		const cron = new Cron("* * * * * *", {
			legacyMode: true
		}, () => {
			const
				now = new Date(),
				nextParsed = new Date(cron.next().toLocaleString()),
				nowParsed = new Date(now.toLocaleString());
			if (run === 1) {
				try {
					assert.equal(nowParsed.getTime(),nextParsed.getTime()-1000);
					assert.equal(cron.previous(), null);
				} catch (e) {
					reject(e);
				}
			} else {
				const prevParsed = new Date(cron.previous().toLocaleString());
				try {
					assert.equal(nowParsed.getTime(),nextParsed.getTime()-1000);
					assert.equal(nowParsed.getTime(),prevParsed.getTime()+1000);
					resolve();
				} catch (e) {
					reject(e);
				}
				cron.stop();
			}
			run++;
		}
		);
	}));
};
