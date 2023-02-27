import Cron from "../../../";

// Test basic
const test1 : Cron = new Cron("* * * * * *", () => {
	console.log("This will run every second.");
});

// With options
const test2 : Cron = new Cron("* * * * * *", { timezone: "Europe/Stockholm"}, () => {
	console.log("This will run every second.");
});

// ISO string with options, without function. Plus
const test3 : Cron = new Cron("2023-01-01T00:00:00", { timezone: "Europe/Stockholm"});
test3.schedule(() => {
	console.log("This will run every second.");
});
test3.nextRuns(10);
test3.pause();
test3.resume();
test3.stop();

// Date without options AND scheduled function
const test4 : Cron = new Cron(new Date(2023,0,1,0,0,0));
test4.stop();
