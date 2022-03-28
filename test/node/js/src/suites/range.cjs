
let 
	assert = require("uvu/assert");

// Actual tests
module.exports = function (Cron, test) {

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

	test("Slash in pattern with preceding comma separated entries should not throw", function () {
		assert.not.throws(() => {
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

	test("Slash in pattern with preceding range separated by comma should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* 1-15/5,6 * * * *");
			scheduler.next();
		});
	});

	test("Range separated by comma should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* 1-15,17 * * * *");
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

	test("Valid days should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * 1-31 * *");
			scheduler.next();
		});
	});

};
