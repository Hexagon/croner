let 
	assert = require("uvu/assert");

// Actual tests
module.exports = function (Cron, test) {

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

	
	test("Steps for hours should yield correct hours", function () {
		let nextRuns = new Cron("1 1 */3 * * *").enumerate(10, "2020-01-01T00:00:00");
		assert.equal(nextRuns[0].getHours(),0);
		assert.equal(nextRuns[1].getHours(),3);
		assert.equal(nextRuns[2].getHours(),6);
		assert.equal(nextRuns[3].getHours(),9);
		assert.equal(nextRuns[4].getHours(),12);
		assert.equal(nextRuns[5].getHours(),15);
		assert.equal(nextRuns[6].getHours(),18);
		assert.equal(nextRuns[7].getHours(),21);
		assert.equal(nextRuns[8].getHours(),0);
		assert.equal(nextRuns[9].getHours(),3);
	});

	test("Steps for hours should yield correct hours with range", function () {
		let nextRuns = new Cron("1 1 0-23/3 * * *").enumerate(10, "2020-01-01T00:00:00");
		assert.equal(nextRuns[0].getHours(),0);
		assert.equal(nextRuns[1].getHours(),3);
		assert.equal(nextRuns[2].getHours(),6);
		assert.equal(nextRuns[3].getHours(),9);
		assert.equal(nextRuns[4].getHours(),12);
		assert.equal(nextRuns[5].getHours(),15);
		assert.equal(nextRuns[6].getHours(),18);
		assert.equal(nextRuns[7].getHours(),21);
		assert.equal(nextRuns[8].getHours(),0);
		assert.equal(nextRuns[9].getHours(),3);
	});
	
	test("Steps for hours should yield correct hours with range and stepping and comma-separated values", function () {
		let nextRuns = new Cron("1 1 0-12/3,1,10 * * *").enumerate(10, "2020-01-01T00:00:00");
		assert.equal(nextRuns[0].getHours(),0);
		assert.equal(nextRuns[1].getHours(),1);
		assert.equal(nextRuns[2].getHours(),3);
		assert.equal(nextRuns[3].getHours(),6);
		assert.equal(nextRuns[4].getHours(),9);
		assert.equal(nextRuns[5].getHours(),10);
		assert.equal(nextRuns[6].getHours(),12);
	});

	test("Steps for hours should yield correct hours with stepping and comma-separated values", function () {
		let nextRuns = new Cron("1 1 12/3,1,10 * * *").enumerate(10, "2020-01-01T00:00:00");
		assert.equal(nextRuns[0].getHours(),1);
		assert.equal(nextRuns[1].getHours(),10);
		assert.equal(nextRuns[2].getHours(),12);
		assert.equal(nextRuns[3].getHours(),15);
		assert.equal(nextRuns[4].getHours(),18);
		assert.equal(nextRuns[5].getHours(),21);
	});

	test("Steps for hours should yield correct hours with range and comma-separated values", function () {
		let nextRuns = new Cron("1 1 0-6,1,10 * * *").enumerate(10, "2020-01-01T00:00:00");
		assert.equal(nextRuns[0].getHours(),0);
		assert.equal(nextRuns[1].getHours(),1);
		assert.equal(nextRuns[2].getHours(),2);
		assert.equal(nextRuns[3].getHours(),3);
		assert.equal(nextRuns[4].getHours(),4);
		assert.equal(nextRuns[5].getHours(),5);
		assert.equal(nextRuns[6].getHours(),6);
		assert.equal(nextRuns[7].getHours(),10);
	});

	test("Steps for hours should yield correct hours with offset range and comma-separated values on wednesdays (legacy mode)", function () {
		let nextRuns = new Cron("1 1 3-8/2,1,10 * * sat").enumerate(10, "2020-01-01T00:00:00");
		assert.equal(nextRuns[0].getFullYear(),2020);
		assert.equal(nextRuns[0].getMonth(),0);
		assert.equal(nextRuns[0].getDate(),4);
		assert.equal(nextRuns[0].getHours(),1);
		assert.equal(nextRuns[1].getHours(),3);
		assert.equal(nextRuns[2].getHours(),5);
		assert.equal(nextRuns[3].getHours(),7);
		assert.equal(nextRuns[4].getHours(),10);
		assert.equal(nextRuns[5].getHours(),1);
	});

	test("Steps for months should yield correct months", function () {
		let nextRuns = new Cron("1 1 1 */3 *").enumerate(10, "2020-12-31T23:59:59");
		assert.equal(nextRuns[0].getMonth(),0);
		assert.equal(nextRuns[1].getMonth(),3);
		assert.equal(nextRuns[2].getMonth(),6);
		assert.equal(nextRuns[3].getMonth(),9);
	});

	test("Steps for months should yield correct months with range", function () {
		let nextRuns = new Cron("1 1 1 1-12/3 *").enumerate(10, "2020-12-31T23:59:59");
		assert.equal(nextRuns[0].getMonth(),0);
		assert.equal(nextRuns[1].getMonth(),3);
		assert.equal(nextRuns[2].getMonth(),6);
		assert.equal(nextRuns[3].getMonth(),9);
	});

};