
let should = require("should");

module.exports = function (Cron) {
	describe("Module", function () {

		it("new Cron(...) should not throw", function () {
			(function(){
				let   scheduler = new Cron("* * * * * *");
				scheduler.next();
			}).should.not.throw();
		});

		it("cron(...) without `new` should not throw", function () {
			(function(){
				let   scheduler = Cron("* * * * * *");
				scheduler.next();
			}).should.not.throw();
		});

	});

	describe("Parser", function () {

		it("Clean 6 part pattern should not throw", function () {
			(function(){
				let scheduler = new Cron("* * * * * *");
				scheduler.next();
			}).should.not.throw();
		});

		it("Clean 5 part pattern should not throw", function () {
			(function(){
				let scheduler = new Cron("* * * * *");
				scheduler.next();
			}).should.not.throw();
		});

		it("String object pattern should not throw", function () {
			(function(){
				let scheduler = new Cron(new String("* * * * * *"));
				scheduler.next();
			}).should.not.throw();
		});
        
		it("Short pattern should throw", function () {
			(function(){
				let scheduler = new Cron("* * * *");
				scheduler.next();
			}).should.throw();
		});
        
		it("Long pattern should throw", function () {
			(function(){
				let scheduler = new Cron("* * * * * * *");
				scheduler.next();
			}).should.throw();
		});
        
		it("Letter in pattern should throw", function () {
			(function(){
				let scheduler = new Cron("* a * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Slash in pattern should not throw", function () {
			(function(){
				let scheduler = new Cron("* */5 * * * *");
				scheduler.next();
			}).should.not.throw();
		});

		it("Slash in pattern with number first should throw", function () {
			(function(){
				let scheduler = new Cron("* 5/* * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Slash in pattern without following number should throw", function () {
			(function(){
				let scheduler = new Cron("* */ * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Slash in pattern with preceding number should throw", function () {
			(function(){
				let scheduler = new Cron("* 1/5 * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Slash in pattern with wildcards both pre and post should throw", function () {
			(function(){
				let scheduler = new Cron("* */* * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Slash in pattern with zero stepping should throw", function () {
			(function(){
				let scheduler = new Cron("* */0 * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Slash in pattern with letter after should throw should throw", function () {
			(function(){
				let scheduler = new Cron("* */a * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Slash in pattern with too high stepping should throw", function () {
			(function(){
				let scheduler = new Cron("* */61 * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Multiple stepping should throw", function () {
			(function(){
				let scheduler = new Cron("* */5/5 * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Missing lower range should throw", function () {
			(function(){
				let scheduler = new Cron("* -9 * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Missing upper range should throw", function () {
			(function(){
				let scheduler = new Cron("* 0- * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Higher upper range than lower range should throw", function () {
			(function(){
				let scheduler = new Cron("* 12-2 * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Rangerange should throw", function () {
			(function(){
				let scheduler = new Cron("* 0-0-0 * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Invalid data type of pattern should throw", function () {
			(function(){
				let scheduler = new Cron(new Date());
				scheduler.next();
			}).should.throw();
		});

		it("Valid range should not throw", function () {
			(function(){
				let scheduler = new Cron("* 0-9 * * * *");
				scheduler.next();
			}).should.not.throw();
		});

		it("Valid seconds should not throw", function () {
			(function(){
				let scheduler = new Cron("0-59 * * * * *");
				scheduler.next();
			}).should.not.throw();
		});

		it("Too high second should throw", function () {
			(function(){
				let scheduler = new Cron("0-60 * * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Valid minutes should not throw", function () {
			(function(){
				let scheduler = new Cron("* 0-59 * * * *");
				scheduler.next();
			}).should.not.throw();
		});

		it("Too high minute should throw", function () {
			(function(){
				let scheduler = new Cron("* 0-5,55,60 * * * *");
				scheduler.next();
			}).should.throw();
		});

		it("Valid hours should not throw", function () {
			(function(){
				let scheduler = new Cron("* * 0-23 * * *");
				scheduler.next();
			}).should.not.throw();
		});

		it("Too high hours minute should throw", function () {
			(function(){
				let scheduler = new Cron("* * 0,23,24 * * *");
				scheduler.next();
			}).should.throw();
		});
		
		it("Array passed as next date should throw", function () {
			(function(){
				let scheduler = new Cron("* * * * * *");
				scheduler.next([]);
			}).should.throw();
		});

		it("Valid days should not throw", function () {
			(function(){
				let scheduler = new Cron("* * * 1-31 * *");
				scheduler.next();
			}).should.not.throw();
		});

		it("Too high days should throw", function () {
			(function(){
				let scheduler = new Cron("* * * 32 * *");
				scheduler.next();
			}).should.throw();
		});

		it("Too low days should throw", function () {
			(function(){
				let scheduler = new Cron("* * * 0 * *");
				scheduler.next();
			}).should.throw();
		});

		it("Valid months should not throw", function () {
			(function(){
				let scheduler = new Cron("* * * * 1,2,3,4,5,6,7,8,9,10,11,12 *");
				scheduler.next();
			}).should.not.throw();
		});

		it("Too high months should throw", function () {
			(function(){
				let scheduler = new Cron("* * * * 7-13 *");
				scheduler.next();
			}).should.throw();
		});

		it("Too low months should throw", function () {
			(function(){
				let scheduler = new Cron("* * * * 0-3 *");
				scheduler.next();
			}).should.throw();
		});

		it("Valid weekdays should not throw", function () {
			(function(){
				let scheduler = new Cron("* * * * * 0,1,2,3,4,5,6,7");
				scheduler.next();
			}).should.not.throw();
		});

		it("Too high weekday should throw", function () {
			(function(){
				let scheduler = new Cron("* * * * * 8");
				scheduler.next();
			}).should.throw();
		});

		it("Too low weekday should throw", function () {
			(function(){
				let scheduler = new Cron("* * * * * -1");
				scheduler.next();
			}).should.throw();
		});

	});

	describe("Scheduler", function () {

		it("0 0 0 * * * should return tomorrow, at 00:00:00", function () {
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
			nextRun.getTime().should.equal(nextDay.getTime());

		});

		it("new String(\"0 0 0 * * *\") should return tomorrow, at 00:00:00", function () {
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
			nextRun.getTime().should.equal(nextDay.getTime());

		});

		it("0 0 12 * * * with startdate tomorrow should return day after tomorrow, at 12:00:00", function () {
			let 
				nextDay = new Date(new Date().getTime()+24*60*60*1000),		// Add one day
				dayAfterNext = new Date(new Date().getTime()+48*60*60*1000),// Add two days
				scheduler,
				nextRun;

			// Set a fixed hour later than startAt, to be sure that the days doesn't overlap
			nextDay =  new Date(nextDay.setUTCHours(13));
			scheduler = new Cron("0 0 12 * * *", {timezone: "Etc/UTC", startAt: nextDay.toISOString() });
			nextRun = scheduler.next();

			// Set seconds, minutes and hours to 00:00:00
			dayAfterNext.setMilliseconds(0);
			dayAfterNext.setUTCSeconds(0);
			dayAfterNext.setUTCMinutes(0);
			dayAfterNext.setUTCHours(12);	

			// Do comparison
			nextRun.getTime().should.equal(dayAfterNext.getTime());

		});

		it("0 0 0 * * * with startdate yesterday should return tomorrow, at 12:00:00", function () {
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
			nextRun.getTime().should.equal(nextDay.getTime());
            

		});

		it("0 0 12 * * * with stopdate yesterday should return undefined", function () {
			let 
				dayBefore = new Date(new Date().getTime()-24*60*60*1000), // Subtract one day
				scheduler = new Cron("0 0 12 * * *", { timezone: "Etc/UTC", stopAt: dayBefore.toISOString() }),
				nextRun = scheduler.next();

			// Do comparison
			should.equal(nextRun, void 0);

		});

		it("* * * * * * with maxRuns: 1 should return undefined after 1.5 seconds", function (done) {
			let 
				scheduler = new Cron("* * * * * *", { maxRuns: 1 });
			scheduler.schedule(function () {});
			setTimeout(function () {
				let nextRun = scheduler.next();
				// Do comparison
				should.equal(nextRun, void 0);
				done();
			},1500);
		});

		it("0 0 0 * * * with 40 iterations should return 40 days from now", function () {
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
			nextRun.getTime().should.equal(compareDay.getTime());

		});

		it("0 * * * * * with 40 iterations should return 45 minutes from now", function () {
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
			nextRun.getTime().should.equal(compareDay.getTime());

		});

		it("Valid startAt with DateTime string should not throw", function () {
			(function ()  {
				let 
					scheduler = new Cron("0 0 12 * * *", { startAt: "2016-12-01 00:00:00" });
				scheduler.next();
			}).should.not.throw();
		});

		it("startAt with Date string should throw", function () {
			(function ()  {
				let 
					scheduler = new Cron("0 0 12 * * *", { startAt: "2016-12-01" });
				scheduler.next();
			}).should.throw();
		});

		it("Invalid startat should throw", function () {
			(function ()  {
				let 
					scheduler = new Cron("0 0 12 * * *", { startAt: "hellu throw" });
				scheduler.next();
			}).should.throw();
		});

		it("startAt with time only should throw", function () {
			(function ()  {
				let 
					scheduler = new Cron("0 0 12 * * *", { startAt: "00:35:00" });
				scheduler.next();
			}).should.throw();
		});

		it("Valid stopAt with Date should not throw", function () {
			(function ()  {
				let 
					dayBefore = new Date(new Date().getTime()-24*60*60*1000), // Subtract one day
					scheduler = new Cron("0 0 12 * * *", { stopAt: dayBefore });
				scheduler.next();
			}).should.not.throw();
		});

		it("Valid stopAt with DateTime string should not throw", function () {
			(function ()  {
				let 
					scheduler = new Cron("0 0 12 * * *", { stopAt: "2016-12-01 00:00:00" });
				scheduler.next();
			}).should.not.throw();
		});

		it("Valid stopAt with Date string should throw", function () {
			(function ()  {
				let 
					scheduler = new Cron("0 0 12 * * *", { stopAt: "2016-12-01" });
				scheduler.next();
			}).should.throw();
		});

		it("Invalid stopAt should throw", function () {
			(function ()  {
				let 
					scheduler = new Cron("0 0 12 * * *", { stopAt: "hellu throw" });
				scheduler.next();
			}).should.throw();
		});

		it("stopAt with time only should throw", function () {
			(function ()  {
				let 
					scheduler = new Cron("0 0 12 * * *", { stopAt: "00:35:00" });
				scheduler.next();
			}).should.throw();
		});

		it("Weekday 0 (sunday) and weekday 7 (sunday) should both be valid patterns", function () {
			(function ()  {
				let 
					scheduler0 = new Cron("0 0 0 * * 0");
				scheduler0.next();
				let
					scheduler7 = new Cron("0 0 0 * * 7");
				scheduler7.next();
			}).should.not.throw();
		});

		it("Weekday 0 (sunday) and weekday 7 (sunday) should give the same run time", function () {
			let 
				scheduler0 = new Cron("0 0 0 * * 0"),
				scheduler7 = new Cron("0 0 0 * * 7"),
				nextRun0 = scheduler0.next(),
				nextRun7 = scheduler7.next();
			nextRun0.getTime().should.equal(nextRun7.getTime());
		});

		it("Test milliseconds to 01:01:01 XXXX-01-01 (most often next year), 1000s steps", function () {

			let prevRun = new Date(new Date().setMilliseconds(0)),
				target = new Date(new Date((prevRun.getFullYear()+1) + "-01-01 01:01:01").getTime()),
				scheduler = new Cron("1 1 1 1 1 *"),
				left,
				diff;

			target.getTime().should.equal(scheduler.next().getTime());

			if(target.getTime() === scheduler.next().getTime()) {
				while(prevRun < target) {
					left = scheduler.msToNext(prevRun);
					diff = Math.abs((target.getTime() - prevRun.getTime())-left);
					diff.should.be.below(1001);
					diff.should.be.above(-1);
					prevRun = new Date(prevRun.getTime() + 1000000);
				}
			}

		});
		it("Test milliseconds to 23:59:59 XXXX-01-01 (most often next year), 1000s steps", function () {

			let prevRun = new Date(new Date().setMilliseconds(0)),
				target = new Date(new Date((prevRun.getFullYear()+1) + "-01-01 23:59:59").getTime()),
				scheduler = new Cron("59 59 23 1 1 *"),
				left,
				diff;
            
			target.getTime().should.equal(scheduler.next().getTime());
            
			if(target.getTime() === scheduler.next().getTime()) {
				while(prevRun < target) {
					left = scheduler.msToNext(prevRun);
					diff = Math.abs((target.getTime() - prevRun.getTime())-left);
					diff.should.be.below(1001);
					diff.should.be.above(-1);
					prevRun = new Date(prevRun.getTime() + 1000000);
				}
			}

		});
		it("Test when next thursday 1st november occurr, starting from 2021-10-13 00:00:00", function () {
			Cron("0 0 0 1 11 4").next(new Date(1634076000000)).getFullYear().should.equal(2029);
		});
		it("getTime should return expcted difference with different timezones (now)", function () {
			let timeStockholm = Cron("* * * * * *", {timezone: "Europe/Stockholm"}).next(new Date()).getTime(),
				timeNewYork = Cron("* * * * * *", {timezone: "America/New_York"}).next(new Date()).getTime();

			// The time right now should be the same in utc wether in new york or stockholm
			timeStockholm.should.be.above(timeNewYork-4000);
			timeStockholm.should.be.below(timeNewYork+4000);
		});
		it("getTime should return expcted difference with different timezones (net sunday 1st november)", function () {
			let timeStockholm = Cron("* * * 1 11 4", {timezone: "Europe/Stockholm"}).next(new Date(1634076000000)).getTime(),
				timeNewYork = Cron("* * * 1 11 4", {timezone: "America/New_York"}).next(new Date(1634076000000)).getTime(),
				diff = (timeNewYork-timeStockholm)/1000/3600;

			// The time when next sunday 1st november occur should be with 6 hours difference (seen from utc)
			diff.should.equal(6);
		});
		it("maxRuns should be inherited from scheduler to job", function () {
			let scheduler = Cron("* * * 1 11 4", {maxRuns: 14}),
				job = scheduler.schedule(() => {});
			job.options.maxRuns.should.equal(14);
			job.stop();
		});
		it("Next saturday at 29th of february should occur 2048. Also test weekday an month names and case insensitivity", function () {
			let nextSaturday29feb = Cron("0 0 0 29 feb SAT").next(new Date(1634076000000));
			nextSaturday29feb.getFullYear().should.equal(2048);
		});
		it("Impossible combination should result in null", function () {
			let impossible = Cron("0 0 0 30 2 6").next(new Date(1634076000000));
			should.equal(null, impossible);
		});
		it("shorthand schedule without options should not throw, and execute", function (done) {
			(function(){
				let job = Cron("* * * * * *",() => { job.stop(); done(); });
			}).should.not.throw();
		});
		it("sanity check start stop resume", function () {
			let job = Cron("* * * 1 11 4",() => {});
			(function(){
				job.pause();
				job.resume();
				job.stop();
			}).should.not.throw();
		});
		it("pause by options work", function (done) {
			let job = Cron("* * * * * *",{paused:true},() => { throw new Error("This should not happen"); });
			setTimeout(function () {
				job.stop();
				done();
			},1500);
		});
		it("previous run time should be null if not yet executed", function () {
			let job = Cron("* * * 1 11 4",() => {});
			let result = job.previous();
			should.equal(result,null);
			job.stop();
		});
		it("previous run time should be set if executed", function (done) {
			let 
				scheduler = new Cron("* * * * * *", { maxRuns: 1 });
			scheduler.schedule(function () {});
			setTimeout(function () {
				let previous = scheduler.previous();
				// Do comparison
				previous.should.be.above(new Date().getTime()-3000);
				previous.should.be.below(new Date().getTime()+3000);
				scheduler.stop();
				done();
			},1500);
		});
	});
};