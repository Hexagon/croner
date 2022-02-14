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

};