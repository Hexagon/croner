# Migration

## Table of contents

### Expressions
```javascript
// Run a function according to pattern
Cron('15-45/10 */5 1,2,3 ? JAN-MAR SAT', { legacyMode: false }, function () {
	console.log('This will run every tenth second between second 15-45');
	console.log('every fifth minute of hour 1,2 and 3 when day of month');
	console.log('is the same as when Cron started, every saturday in January to March.');
});
```

### Interval
```javascript
// Trigger on specific interval combined with cron expression
Cron('* * * 7-16 * MON-FRI', { interval: 90, legacyMode: false }, function () {
	console.log('This will trigger every 90th second at 7-16 on mondays to fridays.');
});
```

### Find dates
```javascript
// Find next month
const nextMonth = Cron("@monthly").next(),
	nextSunday = Cron("@weekly").next(),
	nextSat29feb = Cron("0 0 0 29 2 6", { legacyMode: false }).next(),
	nextSunLastOfMonth = Cron("0 0 0 L * 7", { legacyMode: false }).next();

console.log("First day of next month: " +  nextMonth.toLocaleDateString());
console.log("Next sunday: " +  nextSunday.toLocaleDateString());
console.log("Next saturday at 29th of february: " +  nextSat29feb.toLocaleDateString());  // 2048-02-29
console.log("Next month ending with a sunday: " +  nextSunLastOfMonth.toLocaleDateString()); 
```

### With options
```javascript

const job = Cron(
	'* * * * *', 
	{ 
		maxRuns: Infinity, 
		startAt: "2021-11-01T00:00:00", 
		stopAt: "2021-12-01T00:00:00",
		timezone: "Europe/Stockholm"
	},
	function() {
		console.log('This will run every minute, from 2021-11-01 to 2021-12-01 00:00:00');
	}
);
```

### Job controls
```javascript
const job = Cron('* * * * * *', (self) => {
	console.log('This will run every second. Pause on second 10. Resume on 15. And quit on 20.');
	console.log('Current second: ', new Date().getSeconds());
	console.log('Previous run: ' + self.previous());
	console.log('Next run: ' + self.next());
});

Cron('10 * * * * *', {maxRuns: 1}, () => job.pause());
Cron('15 * * * * *', {maxRuns: 1}, () => job.resume());
Cron('20 * * * * *', {maxRuns: 1}, () => job.stop());
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

if (job.next() === null) {
	// The job will not fire for some reason
} else {
	console.log("Job will fire at " + job.next());
}
```

### Time zone
```javascript
let job = Cron("0 0 14 * * *",{ timezone: "Europe/Stockholm" },() => {
	console.log('This will every day at 14:00 in time zone Europe/Stockholm');
});


if (job.next() === null) {
	// The job will not fire for some reason
} else {
	console.log("Job will fire at " + job.next());
}
```

### Naming jobs

If you provide a name for the job using the option { name: '...' }, a reference to the job will be stored in the exported array `scheduledJobs`. Naming a job makes it accessible throughout your application.

> **Note**
> If a job is stopped using `.stop()`, and goes out of scope, it will normally be eligible for garbage collection and will be deleted during the next garbage collection cycle. Keeping a reference by specifying option `name` prevents this from happening.


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
			console.log("Job found, but could not be restarted. The job were probably stopped using `.stop()` which prevents resuming.");
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
    if (!job.next()) {
        console.log('Last execution');
    }

});
 
// Will there be no executions? 
// This would trigger if you change maxRuns to 0, or manage to compose 
// an impossible cron expression.
if (!job.next() && !job.previous()) {
    console.log('No executions scheduled');
}
```

### Over-run protection

```javascript
// Demo blocking function
const blockForAWhile = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// (Optional) Callback to be triggered on a blocked call
const protectCallback = (job) => console.log(`Call at ${new Date().toISOString()} were blocked by call started at ${job.started().toISOString()}`);

// protect: can be set to ether true or a callback function, to enable over-run protection
Cron("* * * * * *", { protect: protectCallback }, async (job) => {
    console.log(`Call started at ${job.started().toISOString()} started`);
    await blockForAWhile(4000);
    console.log(`Call started at ${job.started().toISOString()} finished ${new Date().toISOString()}`);
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