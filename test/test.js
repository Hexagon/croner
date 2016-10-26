/*

Copyright (c) 2015 Hexagon <robinnilsson@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

/* eslint no-unused-vars: 0 */

"use strict";

var should = require("should"),
	Cron = require("../index.js");

describe("Module", function () {

	it("new Cron(...) should not throw", function () {
		(function(){
			var   scheduler = new Cron("* * * * * *");
			scheduler.next();
		}).should.not.throw();
	});

	it("cron(...) without `new` should not throw", function () {
		(function(){
			var   scheduler = Cron("* * * * * *");
			scheduler.next();
		}).should.not.throw();
	});

});

describe("Parser", function () {

	it("Clean pattern should not throw", function () {
		(function(){
			var scheduler = new Cron("* * * * * *");
			scheduler.next();
		}).should.not.throw();
	});
	
	it("Short pattern should throw", function () {
		(function(){
			var scheduler = new Cron("* * * * *");
			scheduler.next();
		}).should.throw();
	});
	
	it("Long pattern should throw", function () {
		(function(){
			var scheduler = new Cron("* * * * * * *");
			scheduler.next();
		}).should.throw();
	});
	
	it("Letter in pattern should throw", function () {
		(function(){
			var scheduler = new Cron("* a * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Slash in pattern should not throw", function () {
		(function(){
			var scheduler = new Cron("* */5 * * * *");
			scheduler.next();
		}).should.not.throw();
	});

	it("Slash in pattern with number first should throw", function () {
		(function(){
			var scheduler = new Cron("* 5/* * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Slash in pattern without following number should throw", function () {
		(function(){
			var scheduler = new Cron("* */ * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Slash in pattern with preceding number should throw", function () {
		(function(){
			var scheduler = new Cron("* 1/5 * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Slash in pattern with wildcards both pre and post should throw", function () {
		(function(){
			var scheduler = new Cron("* */* * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Slash in pattern with zero stepping should throw", function () {
		(function(){
			var scheduler = new Cron("* */0 * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Slash in pattern with letter after should throw should throw", function () {
		(function(){
			var scheduler = new Cron("* */a * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Slash in pattern with too high stepping should throw", function () {
		(function(){
			var scheduler = new Cron("* */61 * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Missing lower range should throw", function () {
		(function(){
			var scheduler = new Cron("* -9 * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Missing upper range should throw", function () {
		(function(){
			var scheduler = new Cron("* 0- * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Valid range should not throw", function () {
		(function(){
			var scheduler = new Cron("* 0-9 * * * *");
			scheduler.next();
		}).should.not.throw();
	});

	it("Valid seconds should not throw", function () {
		(function(){
			var scheduler = new Cron("0-59 * * * * *");
			scheduler.next();
		}).should.not.throw();
	});

	it("Too high second should throw", function () {
		(function(){
			var scheduler = new Cron("0-60 * * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Valid minutes should not throw", function () {
		(function(){
			var scheduler = new Cron("* 0-59 * * * *");
			scheduler.next();
		}).should.not.throw();
	});

	it("Too high minute should throw", function () {
		(function(){
			var scheduler = new Cron("* 0-5,55,60 * * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Valid hours should not throw", function () {
		(function(){
			var scheduler = new Cron("* * 0-23 * * *");
			scheduler.next();
		}).should.not.throw();
	});

	it("Too high hours minute should throw", function () {
		(function(){
			var scheduler = new Cron("* * 0,23,24 * * *");
			scheduler.next();
		}).should.throw();
	});

	it("Valid days should not throw", function () {
		(function(){
			var scheduler = new Cron("* * * 1-31 * *");
			scheduler.next();
		}).should.not.throw();
	});

	it("Too high days should throw", function () {
		(function(){
			var scheduler = new Cron("* * * 32 * *");
			scheduler.next();
		}).should.throw();
	});

	it("Too low days should throw", function () {
		(function(){
			var scheduler = new Cron("* * * 0 * *");
			scheduler.next();
		}).should.throw();
	});

	it("Valid months should not throw", function () {
		(function(){
			var scheduler = new Cron("* * * * 1,2,3,4,5,6,7,8,9,10,11,12 *");
			scheduler.next();
		}).should.not.throw();
	});

	it("Too high months should throw", function () {
		(function(){
			var scheduler = new Cron("* * * * 7-13 *");
			scheduler.next();
		}).should.throw();
	});

	it("Too low months should throw", function () {
		(function(){
			var scheduler = new Cron("* * * * 0-3 *");
			scheduler.next();
		}).should.throw();
	});

	it("Valid weekdays should not throw", function () {
		(function(){
			var scheduler = new Cron("* * * * * 0,1,2,3,4,5,6,7");
			scheduler.next();
		}).should.not.throw();
	});

	it("Too high weekday should throw", function () {
		(function(){
			var scheduler = new Cron("* * * * * 8");
			scheduler.next();
		}).should.throw();
	});

	it("Too low weekday should throw", function () {
		(function(){
			var scheduler = new Cron("* * * * * -1");
			scheduler.next();
		}).should.throw();
	});

});

describe("Scheduler", function () {

	it("0 0 0 * * * should return tomorrow, at 00:00:00", function () {
		var scheduler = new Cron("0 0 0 * * *"),
			nextRun = scheduler.next(),
			nextDay = new Date(new Date().getTime()+24*60*60*1000);     // Add one day

		// Set seconds, minutes and hours to 00:00:00
		nextDay.setMilliseconds(0);
		nextDay.setSeconds(0);
		nextDay.setMinutes(0);
		nextDay.setHours(0);

		// Do comparison
		nextRun.getTime().should.equal(nextDay.getTime());

	});

	it("0 0 12 * * * with startdate tomorrow should return day after tomorrow, at 12:00:00", function () {
		var 
			nextDay = new Date(new Date().getTime()+24*60*60*1000),		// Add one day
			dayAfterNext = new Date(new Date().getTime()+48*60*60*1000),// Add two days
			scheduler,
			nextRun;

		// Set a fixed hour later than startAt, to be sure that the days doesn't overlap
		nextDay =  new Date(nextDay.setHours(13));
		dayAfterNext = new Date(dayAfterNext.setHours(13));

		scheduler = new Cron("0 0 12 * * *", { startAt: nextDay });
		nextRun = scheduler.next();

		// Set seconds, minutes and hours to 00:00:00
		dayAfterNext.setMilliseconds(0);
		dayAfterNext.setSeconds(0);
		dayAfterNext.setMinutes(0);
		dayAfterNext.setHours(12);

		// Do comparison
		nextRun.getTime().should.equal(dayAfterNext.getTime());
		

	});

	it("0 0 12 * * * with stopdate yesterday should return undefined", function () {
		var 
			dayBefore = new Date(new Date().getTime()-24*60*60*1000), // Subtract one day
			scheduler = new Cron("0 0 12 * * *", { stopAt: dayBefore }),
			nextRun = scheduler.next();

		// Do comparison
		should.equal(nextRun, undefined);

	});

	it("0 0 0 * * * with 40 iterations should return 40 days from now", function () {
		var scheduler = new Cron("0 0 12 * * *"),
			prevRun = new Date(),
			nextRun,
			iterations = 40,
			compareDay = new Date(new Date().getTime()+40*24*60*60*1000);   // Add one day
		

		while(iterations-->0) {
			nextRun = scheduler.next(prevRun),
			prevRun = nextRun;
		}

		// Set seconds, minutes and hours to 00:00:00
		compareDay.setMilliseconds(0);
		compareDay.setSeconds(0);
		compareDay.setMinutes(0);
		compareDay.setHours(12);

		// Do comparison
		nextRun.getTime().should.equal(compareDay.getTime());

	});

	it("0 * * * * * with 40 iterations should return 45 minutes from now", function () {
		var scheduler = new Cron("0 * * * * *"),
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

	it("Valid startAt with Date should not throw", function () {
		(function ()  {
			var 
				dayBefore = new Date(new Date().getTime()-24*60*60*1000), // Subtract one day
				scheduler = new Cron("0 0 12 * * *", { startAt: dayBefore }),
				nextRun = scheduler.next();
			}).should.not.throw();
	});

	it("Valid startAt with DateTime string should not throw", function () {
		(function ()  {
			var 
				scheduler = new Cron("0 0 12 * * *", { startAt: "2016-12-01 00:00:00" }),
				nextRun = scheduler.next();
			}).should.not.throw();
	});

	it("Valid startAt with Date string should not throw", function () {
		(function ()  {
			var 
				scheduler = new Cron("0 0 12 * * *", { startAt: "2016-12-01" }),
				nextRun = scheduler.next();
			}).should.not.throw();
	});

	it("Invalid startat should throw", function () {
		(function ()  {
			var 
				scheduler = new Cron("0 0 12 * * *", { startAt: "hellu throw" }),
				nextRun = scheduler.next();
			}).should.throw();
	});

	it("startAt with time only should throw", function () {
		(function ()  {
			var 
				scheduler = new Cron("0 0 12 * * *", { startAt: "00:35:00" }),
				nextRun = scheduler.next();
			}).should.throw();
	});

	it("Valid stopAt with Date should not throw", function () {
		(function ()  {
			var 
				dayBefore = new Date(new Date().getTime()-24*60*60*1000), // Subtract one day
				scheduler = new Cron("0 0 12 * * *", { stopAt: dayBefore }),
				nextRun = scheduler.next();
			}).should.not.throw();
	});

	it("Valid stopAt with DateTime string should not throw", function () {
		(function ()  {
			var 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "2016-12-01 00:00:00" }),
				nextRun = scheduler.next();
			}).should.not.throw();
	});

	it("Valid stopAt with Date string should not throw", function () {
		(function ()  {
			var 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "2016-12-01" }),
				nextRun = scheduler.next();
			}).should.not.throw();
	});

	it("Invalid stopAt should throw", function () {
		(function ()  {
			var 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "hellu throw" }),
				nextRun = scheduler.next();
			}).should.throw();
	});

	it("stopAt with time only should throw", function () {
		(function ()  {
			var 
				scheduler = new Cron("0 0 12 * * *", { stopAt: "00:35:00" }),
				nextRun = scheduler.next();
			}).should.throw();
	});

});

describe("Comprehensive testing ( will fail first day of the year)", function () {
	it("Test milliseconds to 01:01:91 XXXX-01-01 (most often next year), 1000s steps", function () {

		var prevRun = new Date(new Date().setMilliseconds(0)),
			target = new Date(new Date((prevRun.getFullYear()+1) + "-01-01 01:01:01").getTime()),
			scheduler = new Cron("1 1 1 1 1 *"),
			nextRun,
			left,
			diff;

		target.getTime().should.equal(scheduler.next().getTime());

		if(target.getTime() === scheduler.next().getTime()) {
			while(prevRun < target) {
				left = scheduler.msToNext(prevRun);
				diff = Math.abs((target.getTime() - prevRun.getTime())-left);
				diff.should.be.below(1001);
				prevRun = new Date(prevRun.getTime() + 1000000);
			}
		}

	});
	it("Test milliseconds to 23:59:59 XXXX-01-01 (most often next year), 1000s steps", function () {

		var prevRun = new Date(new Date().setMilliseconds(0)),
			target = new Date(new Date((prevRun.getFullYear()+1) + "-01-01 23:59:59").getTime()),
			scheduler = new Cron("59 59 23 1 1 *"),
			nextRun,
			left,
			diff;
		
		target.getTime().should.equal(scheduler.next().getTime());
		
		if(target.getTime() === scheduler.next().getTime()) {
			while(prevRun < target) {
				left = scheduler.msToNext(prevRun);
				diff = Math.abs((target.getTime() - prevRun.getTime())-left);
				diff.should.be.below(1001);
				prevRun = new Date(prevRun.getTime() + 1000000);
			}
		}

	});
});