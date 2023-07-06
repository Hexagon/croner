---
layout: page
title: " 5. Examples"
---

# Examples

## Table of Content

*  [Find dates](#find-dates)
*  [Job controls](#job-controls)
*  [Options](#options)
*  [Interval](#interval)
*  [Passing a context](#passing-a-context)
*  [Fire on a specific date/time](#fire-on-a-specific-datetime)
*  [Time zone](#time-zone)
*  [Naming jobs](#naming-jobs)
*  [Act at completion](#act-at-completion)
*  [Error handling](#error-handling)
*  [Overrun protection](#over-run-protection)

Below are some examples of how to use Croner.

### Find dates
```javascript
// Find next month
const nextMonth = Cron("@monthly").nextRun(),
	nextSunday = Cron("@weekly").nextRun(),
	nextSat29feb = Cron("0 0 0 29 2 6", { legacyMode: false }).nextRun(),
	nextSunLastOfMonth = Cron("0 0 0 L * 7", { legacyMode: false }).nextRun(),
    nextLastSundayOfMonth = Cron("0 0 0 * * L7").nextRun();

console.log("First day of next month: " +  nextMonth.toLocaleDateString());
console.log("Next sunday: " +  nextSunday.toLocaleDateString());
console.log("Next saturday at 29th of february: " +  nextSat29feb.toLocaleDateString());  // 2048-02-29
console.log("Next month ending with a sunday: " +  nextSunLastOfMonth.toLocaleDateString());
console.log("Next last sunday of month: " +  nextLastSundayOfMonth.toLocaleDateString());
```

### Job controls
```javascript
const job = Cron('* * * * * *', (self) => {
	console.log('This will run every second. Pause on second 10. Resume on 15. And quit on 20.');
	console.log('Current second: ', new Date().getSeconds());
	console.log('Previous run: ' + self.previousRun());
	console.log('Next run: ' + self.nextRun());
});

Cron('10 * * * * *', {maxRuns: 1}, () => job.pause());
Cron('15 * * * * *', {maxRuns: 1}, () => job.resume());
Cron('20 * * * * *', {maxRuns: 1}, () => job.stop());
```

### Options
```javascript
import { Cron } from "./dist/croner.js";

const job = Cron(
	'* * * * *', 
	{
		startAt: "2023-11-01T00:00:00", 
		stopAt: "2023-12-01T00:00:00",
		timezone: "Europe/Stockholm"
	},
	function() {
		console.log('This will run every minute, from 2023-11-01 to 2023-12-01 00:00:00');
	}
);

console.log('Will run first time at', job.nextRun().toLocaleString());
```

### Interval
```javascript
// Trigger on specific interval combined with cron expression
Cron('* * 7-16 * * MON-FRI', { interval: 90 }, function () {
	console.log('This will trigger every 90th second at 7-16 on mondays to fridays.');
});
```

### Passing a context
```javascript
const data = {
	what: "stuff"
};

Cron('* * * * * *', { context: data }, (_self, context) => {
	console.log('This will print stuff: ' + context.what);
});

Cron('*/5 * * * * *', { context: data }, (self, context) => {
	console.log('After this, other stuff will be printed instead');
	context.what = "other stuff";
	self.stop();
});
```

### Fire on a specific date/time
```javascript
// A javascript date, or a ISO 8601 local time string can be passed, to fire a function once. 
// Always specify which timezone the ISO 8601 time string has with the timezone option.
let job = Cron("2025-01-01T23:00:00",{timezone: "Europe/Stockholm"},() => {
	console.log('This will run at 2025-01-01 23:00:00 in timezone Europe/Stockholm');
});

if (job.nextRun() === null) {
	// The job will not fire for some reason
} else {
	console.log("Job will fire at " + job.nextRun());
}
```

### Time zone
```javascript
let job = Cron("0 0 14 * * *", { timezone: "Europe/Stockholm" }, () => {
	console.log('This will every day at 14:00 in time zone Europe/Stockholm');
});


if (job.nextRun() === null) {
	// The job will not fire for some reason
} else {
	console.log("Job will fire at " + job.nextRun());
}
```

### Naming jobs

If you provide a name for the job using the option { name: '...' }, a reference to the job will be stored in the exported array `scheduledJobs`. Naming a job makes it accessible throughout your application.

> **Note**
> If a job is stopped using `.stop()`, it will be removed from the scheduledJobs array.


```javascript
// import { Cron, scheduledJobs } ...

// Scoped job
(() => {

	// As we specify a name for the job, a reference will be kept in `scheduledJobs`
	const job = Cron("* * * * * *", { name: "Job1" }, function () {
		console.log("This will run every second");
	});

	job.pause();
	console.log("Job paused");

})();

// Another scope, delayed 5 seconds
setTimeout(() => {

	// Find our job
	// - scheduledJobs can either be imported separately { Cron, scheduledJobs }
	//   or access through Cron.scheduledJobs
	const job = scheduledJobs.find(j => j.name === "Job1");

	// Resume it
	if (job) {
		if(job.resume()) {
			// This will happen
			console.log("Job resumed successfully");
		} else {
			console.log("Job found, but could not be restarted. This should never happen, as the named jobs is _removed_ when using `.stop()`.");
		}
	} else {
		console.error("Job not found");
	}

}, 5000);

```

### Act at completion

```javascript
// Start a job firing once each 5th second, run at most 3 times
const job = new Cron("0/5 * * * * *", { maxRuns: 3 }, (job) => {
    
    // Do work
    console.log('Job Running');

    // Is this the last execution?
    if (!job.nextRun()) {
        console.log('Last execution');
    }

});
 
// Will there be no executions? 
// This would trigger if you change maxRuns to 0, or manage to compose 
// an impossible cron expression.
if (!job.nextRun() && !job.previousRun()) {
    console.log('No executions scheduled');
}
```

### Error handling

```javascript

// Prepare an error handler
const errorHandler = (e) => {
	console.error(e);
};

// Start a job firing every second
const job = new Cron("* * * * * *", { catch: errorHandler }, (job) => {
	console.log('This will print!');
	throw new Error("This will be catched and printed by the error handler");
	console.log('This will not print, but the job will keep on triggering');
});

```

### Overrun protection

```javascript
// Demo blocking function
const blockForAWhile = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// (Optional) Callback to be triggered on a blocked call
const protectCallback = (job) => console.log(`Call at ${new Date().toISOString()} were blocked by call started at ${job.currentRun().toISOString()}`);

// protect: can be set to ether true or a callback function, to enable over-run protection
Cron("* * * * * *", { protect: protectCallback }, async (job) => {
    console.log(`Call started at ${job.currentRun().toISOString()} started`);
    await blockForAWhile(4000);
    console.log(`Call started at ${job.currentRun().toISOString()} finished ${new Date().toISOString()}`);
});

/* Output
Call started at 2023-02-16T20:47:07.005Z started
Call at 2023-02-16T20:47:08.014Z were blocked by call started at 2023-02-16T20:47:07.005Z
Call at 2023-02-16T20:47:09.012Z were blocked by call started at 2023-02-16T20:47:07.005Z
Call at 2023-02-16T20:47:10.009Z were blocked by call started at 2023-02-16T20:47:07.005Z
Call at 2023-02-16T20:47:11.007Z were blocked by call started at 2023-02-16T20:47:07.005Z
Call started at 2023-02-16T20:47:07.005Z finished 2023-02-16T20:47:11.039Z
*/
```