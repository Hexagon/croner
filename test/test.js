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

'use strict';

var should = require('should'),
	cron = require('../index.js');

describe('Module', function () {

	it('new cron(...) should not throw', function () {
		(function(){
		  var 	scheduler = new cron('* * * * * *'),
		  		nextRun = scheduler.next();
		}).should.not.throw();
	});

	it('cron(...) without `new` should not throw', function () {
		(function(){
		  var 	scheduler = cron('* * * * * *'),
		  		nextRun = scheduler.next();
		}).should.not.throw();
	});

});

describe('Parser', function () {

	it('Clean pattern should not throw', function () {
		(function(){
		  var scheduler = new cron('* * * * * *');
		}).should.not.throw();
	});
	
	it('Short pattern should throw', function () {
		(function(){
		  var scheduler = new cron('* * * * *');
		}).should.throw();
	});
	
	it('Long pattern should throw', function () {
		(function(){
		  var scheduler = new cron('* * * * * * *');
		}).should.throw();
	});
	
	it('Letter in pattern should throw', function () {
		(function(){
		  var scheduler = new cron('* a * * * *');
		}).should.throw();
	});

	it('Missing lower range should throw', function () {
		(function(){
		  var scheduler = new cron('* -9 * * * *');
		}).should.throw();
	});

	it('Missing upper range should throw', function () {
		(function(){
		  var scheduler = new cron('* 0- * * * *');
		}).should.throw();
	});

	it('Valid range should not throw', function () {
		(function(){
		  var scheduler = new cron('* 0-9 * * * *');
		}).should.not.throw();
	});

	it('Valid seconds should not throw', function () {
		(function(){
		  var scheduler = new cron('0-59 * * * * *');
		}).should.not.throw();
	});

	it('Too high second should throw', function () {
		(function(){
		  var scheduler = new cron('0-60 * * * * *');
		}).should.throw();
	});

	it('Valid minutes should not throw', function () {
		(function(){
		  var scheduler = new cron('* 0-59 * * * *');
		}).should.not.throw();
	});

	it('Too high minute should throw', function () {
		(function(){
		  var scheduler = new cron('* 0-5,55,60 * * * *');
		}).should.throw();
	});

	it('Valid hours should not throw', function () {
		(function(){
		  var scheduler = new cron('* * 0-23 * * *');
		}).should.not.throw();
	});

	it('Too high hours minute should throw', function () {
		(function(){
		  var scheduler = new cron('* * 0,23,24 * * *');
		}).should.throw();
	});

	it('Valid days should not throw', function () {
		(function(){
		  var scheduler = new cron('* * * 1-31 * *');
		}).should.not.throw();
	});

	it('Too high days should throw', function () {
		(function(){
		  var scheduler = new cron('* * * 32 * *');
		}).should.throw();
	});

	it('Too low days should throw', function () {
		(function(){
		  var scheduler = new cron('* * * 0 * *');
		}).should.throw();
	});

	it('Valid months should not throw', function () {
		(function(){
		  var scheduler = new cron('* * * * 1,2,3,4,5,6,7,8,9,10,11,12 *');
		}).should.not.throw();
	});

	it('Too high months should throw', function () {
		(function(){
		  var scheduler = new cron('* * * * 7-13 *');
		}).should.throw();
	});

	it('Too low months should throw', function () {
		(function(){
		  var scheduler = new cron('* * * * 0-3 *');
		}).should.throw();
	});

	it('Valid weekdays should not throw', function () {
		(function(){
		  var scheduler = new cron('* * * * * 0,1,2,3,4,5,6,7');
		}).should.not.throw();
	});

	it('Too high weekday should throw', function () {
		(function(){
		  var scheduler = new cron('* * * * * 8');
		}).should.throw();
	});

	it('Too low weekday should throw', function () {
		(function(){
		  var scheduler = new cron('* * * * * -1');
		}).should.throw();
	});

});

describe('Scheduler', function () {

	it('0 0 0 * * * should return tomorrow, at 00:00:00', function () {
		var scheduler = new cron('0 0 0 * * *'),
			nextRun = scheduler.next(),
			nextDay = new Date(new Date().getTime()+24*60*60*1000); 	// Add one day

		// Set seconds, minutes and hours to 00:00:00
		nextDay.setMilliseconds(0);
		nextDay.setSeconds(0);
		nextDay.setMinutes(0);
		nextDay.setHours(0);

		// Do comparison
		nextRun.getTime().should.equal(nextDay.getTime());

	});

	it('0 0 0 * * * with 40 iterations should return 40 days from now, at 00:00:00', function () {
		var scheduler = new cron('0 0 0 * * *'),
			prevRun = new Date(),
			nextRun,
			iterations = 40,
			compareDay = new Date(new Date().getTime()+40*24*60*60*1000); 	// Add one day

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

	it('0 * * * * * with 40 iterations should return 40 minutes from now', function () {
		var scheduler = new cron('0 * * * * *'),
			prevRun = new Date(),
			nextRun,
			iterations = 40,
			compareDay = new Date(new Date().getTime()+40*60*1000); 	// Add one day

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
	
})