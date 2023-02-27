let 
	assert = require("uvu/assert");

// Actual tests
module.exports = function (Cron, test) {

	test("Clean 6 part pattern should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * * * *");
			scheduler.nextRun();
		});
	});

	test("Clean 5 part pattern should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron("* * * * *");
			scheduler.nextRun();
		});
	});

	test("String object pattern should not throw", function () {
		assert.not.throws(() => {
			let scheduler = new Cron(new String("* * * * * *"));
			scheduler.nextRun();
		});
	});
	
	test("Short pattern should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * *");
			scheduler.nextRun();
		});
	});
	
	test("Long pattern should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* * * * * * *");
			scheduler.nextRun();
		});
	});
	
	test("Letter in pattern should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* a * * * *");
			scheduler.nextRun();
		});
	});

	test("Letter combined with star in pattern should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* *a * * * *");
			scheduler.nextRun();
		});
	});

	test("Number combined with star in pattern should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron("* *1 * * * *");
			scheduler.nextRun();
		});
	});

	test("Invalid data type of pattern should throw", function () {
		assert.throws(() => {
			let scheduler = new Cron(new Object());
			scheduler.nextRun();
		});
	});

	test("Weekday 0 (sunday) and weekday 7 (sunday) should both be valid patterns", function () {
		assert.not.throws(() => {
			let 
				scheduler0 = new Cron("0 0 0 * * 0");
			scheduler0.nextRun();
			let
				scheduler7 = new Cron("0 0 0 * * 7");
			scheduler7.nextRun();
		});
	});

	test("Weekday 0 (sunday) and weekday 7 (sunday) should give the same run time", function () {
		let 
			scheduler0 = new Cron("0 0 0 * * 0"),
			scheduler7 = new Cron("0 0 0 * * 7"),
			nextRun0 = scheduler0.nextRun(),
			nextRun7 = scheduler7.nextRun();
		assert.equal(nextRun0.getTime(),nextRun7.getTime());
	});

	test("0 0 0 * * * should return tomorrow, at 00:00:00", function () {
		let scheduler = new Cron("0 0 0 * * *"),
			nextRun = scheduler.nextRun(),

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
			nextRun = scheduler.nextRun(),

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
		nextRun = scheduler.nextRun();

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
		nextRun = scheduler.nextRun(todayAt12);

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
		nextRun = scheduler.nextRun(todayAt12);

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
		nextRun = scheduler.nextRun(todayAt12);

		// Do comparison
		assert.equal(nextRun.getHours(),15);
		assert.equal(nextRun.getMinutes(),0);
		assert.equal(nextRun.getMinutes(),0);
		
	});
	test("59 * ? ? ? ? should (almost always) run within a minute", function () {

		let 
			now = new Date(),
			scheduler,
			nextRun;

		// Set seconds to a low value to make sure the hour does not tip over
		now.setSeconds(30);
		
		scheduler = new Cron("59 * ? ? ? ?");
		nextRun = scheduler.nextRun(now);

		// Do compariso
		assert.equal(nextRun.getTime() < now.getTime()+60000, true);
		assert.equal(nextRun.getTime() >= now.getTime(), true);
	});

	test("? * ? ? ? ? should (almost always) run within a minute", function () {

		let 
			now = new Date(),
			scheduler,
			nextRun;

		// Set seconds to a low value to make sure the hour/minute does not tip over
		now.setSeconds(30);
		
		scheduler = new Cron("? * ? ? ? ?");
		nextRun = scheduler.nextRun(now);

		// Do compariso
		assert.equal(nextRun.getTime() < now.getTime()+60000, true);
		assert.equal(nextRun.getTime() >= now.getTime(), true);
	});

	test("* * ? ? ? ? should return correct hour when used with a custom time zone", function () {

		let 
			now = new Date(),
			scheduler,
			nextRun;

		// Set seconds to a low value to make sure the hour/minute does not tip over
		now.setSeconds(30);
		
		scheduler = new Cron("* * ? ? ? ?", { timezone: "America/New_York"});
		nextRun = scheduler.nextRun(now);

		// Do comparison
		assert.equal(nextRun.getUTCHours(), now.getUTCHours());
	});

	test("* ? ? ? ? ? should (almost always) run within a second", function () {

		let 
			now = new Date(),
			scheduler,
			nextRun;

		// Set seconds to a low value to make sure the hour does not tip over
		now.setSeconds(30);
		
		scheduler = new Cron("* ? ? ? ? ?");
		nextRun = scheduler.nextRun(now);

		// Do compariso
		assert.equal(nextRun.getTime() < now.getTime()+1500, true);
		assert.equal(nextRun.getTime() >= now.getTime(), true);
	});

	test("*/5 * 11 * * should return next day, at 11:00:00, if time is 12", function () {
		let 
			todayAt12 = new Date(), // Subtract one day
			scheduler,
			nextRun;

		todayAt12.setHours(12);
		todayAt12.setMinutes(34);
		todayAt12.setMinutes(54);

		scheduler = new Cron("*/5 * 11 * * *"),
		nextRun = scheduler.nextRun(todayAt12);

		// Do comparison
		assert.equal(nextRun.getHours(),11);
		assert.equal(nextRun.getMinutes(),0);
		assert.equal(nextRun.getMinutes(),0);
		
	});
	
	test("0 0 0 L 2 * should find last day of february(28 2022)", function () {
		let scheduler = new Cron("0 0 0 L 2 *"),
			prevRun = new Date(1643930208380), // From 4th of february 2022
			nextRun = scheduler.nextRun(prevRun);

		// Do comparison
		assert.equal(nextRun.getDate(),28);
		assert.equal(nextRun.getMonth(),1);
		assert.equal(nextRun.getFullYear(),2022);
	});

	test("0 0 0 L 2 * should find last day of february (29 2024)", function () {
		let scheduler = new Cron("0 0 0 L 2 *"),
			prevRun = new Date(1703891808380), // From 30th of december 2023
			nextRun = scheduler.nextRun(prevRun);

		// Do comparison
		assert.equal(nextRun.getDate(),29);
		assert.equal(nextRun.getMonth(),1);
		assert.equal(nextRun.getFullYear(),2024);
	});

	test("0 0 0 * 2 LSUN should find last sunday of february 2024 (25/2 2024)", function () {
		let scheduler = new Cron("0 0 0 * 2 LSUN"),
			prevRun = new Date(1703891808380), // From 30th of december 2023
			nextRun = scheduler.nextRun(prevRun);

		// Do comparison
		assert.equal(nextRun.getDate(),25);
		assert.equal(nextRun.getMonth(),1);
		assert.equal(nextRun.getFullYear(),2024);
	});

	test("0 0 0 * 2 LSUN should find last thursday of february 2024 (29/2 2024)", function () {
		let scheduler = new Cron("0 0 0 * 2 LTHU"),
			prevRun = new Date(1703891808380), // From 30th of december 2023
			nextRun = scheduler.nextRun(prevRun);

		// Do comparison
		assert.equal(nextRun.getDate(),29);
		assert.equal(nextRun.getMonth(),1);
		assert.equal(nextRun.getFullYear(),2024);
	});

	test("0 0 0 * 2 LFRI should find last friday of february 2024 (23/2 2024)", function () {
		let scheduler = new Cron("0 0 0 * 2 LFRI"),
			prevRun = new Date(1703891808380), // From 30th of december 2023
			nextRun = scheduler.nextRun(prevRun);

		// Do comparison
		assert.equal(nextRun.getDate(),23);
		assert.equal(nextRun.getMonth(),1);
		assert.equal(nextRun.getFullYear(),2024);
	});

	test("0 0 0 * 2 LMON-SUN should find last thuirsday or friday of february 2024 (23/2 2024)", function () {
		let scheduler = new Cron("0 0 0 * 2 LTHU-FRI"),
			prevRun = new Date(1703891808380), // From 30th of december 2023
			nextRun = scheduler.nextRun(prevRun);

		// Do comparison
		assert.equal(nextRun.getDate(),23);
		assert.equal(nextRun.getMonth(),1);
		assert.equal(nextRun.getFullYear(),2024);
	});
};