<p align="center">
<img src="https://cdn.jsdelivr.net/gh/hexagon/croner@master/croner.png" alt="Croner" width="150" height="150"><br>
Trigger functions or evaluate cron expressions in JavaScript or TypeScript. No dependencies. Most features. Node. Deno. Bun. Browser. <br><br>Try it live on <a href="https://jsfiddle.net/hexag0n/hoa8kwsb/">jsfiddle</a>.<br>
</p>

# Croner

![Node.js CI](https://github.com/Hexagon/croner/workflows/Node.js%20CI/badge.svg?branch=master) ![Deno CI](https://github.com/Hexagon/croner/workflows/Deno%20CI/badge.svg?branch=master) ![Bun CI](https://github.com/Hexagon/croner/workflows/Bun%20CI/badge.svg?branch=master) [![npm version](https://badge.fury.io/js/croner.svg)](https://badge.fury.io/js/croner) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/4978bdbf495941c087ecb32b120f28ff)](https://www.codacy.com/gh/Hexagon/croner/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Hexagon/croner&amp;utm_campaign=Badge_Grade) [![NPM Downloads](https://img.shields.io/npm/dw/croner.svg)](https://www.npmjs.org/package/croner)
![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen) [![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Hexagon/croner/blob/master/LICENSE)

*   Trigger functions in JavaScript using [Cron](https://en.wikipedia.org/wiki/Cron#CRON_expression) syntax.
*   Find the first date of the next month, the date of the next Tuesday, etc.
*   Pause, resume, or stop execution after a task is scheduled.
*   Works in Node.js >=7.6 (both require and import).
*   Works in Deno >=1.16.
*   Works in Bun >=0.2.2
*   Works in browsers as standalone, UMD or ES-module.
*   Works with both JavaScriptCore and V8.
*   Schedule using specific target time zones.
*   Includes [TypeScript](https://www.typescriptlang.org/) typings.

Quick examples:

```javascript
// Basic: Run a function at the interval defined by a cron expression
const job = Cron('*/5 * * * * *', () => {
	console.log('This will run every fifth second');
});

// Enumeration: What dates do the next 100 sundays occur at?
const nextSundays = Cron('0 0 0 * * 7').enumerate(100);
console.log(nextSundays);

// Days left to a specific date
const msLeft = Cron('59 59 23 24 DEC *').next() - new Date();
console.log(Math.floor(msLeft/1000/3600/24) + " days left to next christmas eve");

// Run a function at a specific date/time using a non-local timezone (time is ISO 8601 local time)
// This will run 2023-01-23 00:00:00 according to the time in Asia/Kolkata
Cron('2023-01-23T00:00:00', { timezone: 'Asia/Kolkata' }, () => { console.log('Yay') });

```

More [examples](#examples)...

## Why another JavaScript cron implementation

Because the existing ones are not good enough. They have serious bugs, use bloated dependencies, do not work in all environments, and/or simply do not work as expected.

|                           | croner              | cronosjs            | node-cron | cron                      | node-schedule       |
|---------------------------|:-------------------:|:-------------------:|:---------:|:-------------------------:|:-------------------:|
| **Platforms**                                                                                                                        |
| Node.js (CommonJS)                   |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Browser (ESMCommonJS)                  |          ✓          |          ✓          |           |                           |                     |
| Deno (ESM)                     |          ✓          |                     |           |                           |                     |
| **Features**                                                                                                                        |
| Typescript typings        |          ✓          |         ✓            |           |                           |                     |
| dom-AND-dow               |          ✓          |                     |           |                           |                     |
| dom-OR-dow                |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Next run                  |          ✓          |          ✓          |           |           ✓              |           ✓         |
| Next n runs               |          ✓          |          ✓          |           |           ✓               |                     |
| Timezone                  |          ✓          |           ✓         |     ✓       |        ✓                   |         ✓            |
| Minimum interval          |          ✓          |                     |              |                            |                      |
| Controls (stop/resume)    |          ✓          |           ✓         |     ✓        |        ✓                   |         ✓           |   
| Range (0-13)   |          ✓          |          ✓          |     ✓        |        ✓                   |         ✓           |
| Stepping (*/5)   |          ✓          |          ✓          |     ✓        |        ✓                   |         ✓           |
| Last day of month (L)  |          ✓          |          ✓          |              |                            |                    |

<details>
  <summary>In depth comparison of various libraries</summary>
  
|                           | croner              | cronosjs            | node-cron | cron                      | node-schedule       |
|---------------------------|:-------------------:|:-------------------:|:---------:|:-------------------------:|:-------------------:|
| **Size**                                                                                                                        |
| Minified size (KB)        | 15.5                | 16.3            | 16.5      | -                      | -                |
| Bundlephobia  minzip (KB) | 3.6                 | 5.1                 | 5.7       |                   23.9 | 32.4              |
| Dependencies              |                   0 |                   0 |         1 |                         1 |                   3 |
| **Popularity**                                                                                                                        |
| Downloads/week [^1]        | 672K                | 30K                 | 376K      | 1574K                     | 804K                |
| **Quality**                                                                                                                        |
| Issues [^1]                |                   0 |                   2 |   118 :warning: |                 119 :warning: |    135 :warning: |
| Code coverage              |                   99%  | 98%                    | 100%                | 81%                              | 94%                 |
| **Performance**                                                                                                                        |
| Ops/s `1 2 3 4 5 6`         | 99 952                    | 49 308                    | N/A :x:          | Test failed :x:      | 2 299 :warning:                    |
| Ops/s `0 0 0 29 2 *`         | 65 392                    | 17 138                    | N/A :x:          | Test failed :x:      | 1 450 :warning:                    |
| **Tests**                 | **8/8**             | **7/8**             | **0/8** [^4] :question:    |  **1/8** :warning:                  | **7/8**             |
| Test `0 0 23 * * *`         | 2022-10-09 00:40    | 2022-10-09 00:40    | N/A       | 2022-10-09 00:40          | 2022-10-09 00:40    |
| Test `0 0 0 L 2 *` [^2]      | 2023-02-28 00:00 |          2023-02-28 00:00 | N/A       | N/A                       |          2023-02-28 00:00 |
| Test `0 0 0 29 2 *`         |          2024-02-29 00:00 |          2024-02-29 00:00 | N/A       | 2023-03-29 00:00  :x:           |          2024-02-29 00:00 |
| Test `0 0 0 29 2 6` [^3]     |          2048-02-09 00:00| N/A                 | N/A       | N/A                       | N/A                 |
| Test `0 0 0 15 2 *`         |          2023-02-16 00:00 |          2023-02-16 00:00 | N/A       | 2023-03-15 00:00  :x:           |          2023-02-16 00:00 |
| Test `0 0 0 * 10 1`         |          2022-10-10 00:00 |          2022-10-10 00:00 | N/A       | 2022-11-07 00:00 :x:           |          2022-10-10 00:00 |
| Test `0 0 23 31 3 *`        | 2023-03-31 23:00    | 2023-03-31 23:00    | N/A       | 2023-04-01 23:00 :x:    | 2023-03-31 23:00    |
| Test `1 2 3 4 5 6`          | 2023-05-04 03:02 | 2023-05-04 03:02 | N/A          | 2023-06-03 03:02 :x:  | 2023-05-04 03:02 |

> **Note**
> *   Table last updated at 2022-10-23
> *   node-cron has no interface to predict when the function will run, so tests cannot be carried out.
> *   All tests and benchmarks were carried out using [https://github.com/Hexagon/cron-comparison](https://github.com/Hexagon/cron-comparison)

[^1]: As of 2022-10-08
[^2]: Requires support for L-modifier
[^3]: In dom-AND-dow mode, only supported by croner at the moment.
[^4]: Node-cron has no way of showing next run time.

</details>

## Installation

### Node.js

```npm install croner --save```

JavaScript

```javascript
// ESM Import ...
import Cron from "croner";

// ... or CommonJS Require
const Cron = require("croner");
```

TypeScript

Notes for TypeScript:

* If using strict eslint rules, specifically new-cap combined with no-new, you need to import and use lowercase `cron` instead of `{ Cron }`.

```typescript
import { Cron } from "croner";

const job : Cron = new Cron("* * * * * *", () => {
	console.log("This will run every second.");
});
```

### Bun

```bun add croner```

> **Note** If you encounter problems during installation, try using `bun add croner --backend=copyfile`.

```javascript
import Cron from "croner";
```

### Deno

JavaScript

```javascript
import Cron from "https://deno.land/x/croner@5.5.1/src/croner.js";

Cron("* * * * * *", () => {
	console.log("This will run every second.");
});
```

TypeScript

```typescript
import { Cron } from "https://deno.land/x/croner@5.5.1/src/croner.js";

const _scheduler : Cron = new Cron("* * * * * *", () => {
	console.log("This will run every second.");
});
```

### Browser 

#### Manual

*   Download the latest [zipball](https://github.com/Hexagon/croner/archive/refs/heads/master.zip).
*   Unpack the zip file.
*   Grab ```croner.min.js``` (UMD and standalone) or ```croner.min.mjs``` (ES-module) from the [dist/](/dist) folder.

#### CDN

To use as a [UMD](https://github.com/umdjs/umd)-module (stand alone, [RequireJS](https://requirejs.org/) etc.)

```html
<script src="https://cdn.jsdelivr.net/npm/croner@5/dist/croner.min.js"></script>
```

To use as an [ES-module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

```html
<script type="module">
	import Cron from "https://cdn.jsdelivr.net/npm/croner@5/dist/croner.min.mjs";

	// ... see usage section ...
</script>
```

## Documentation

Full documentation available at [hexagon.github.io/croner](https://hexagon.github.io/croner/Cron.html).

The short version:

### Signature

Cron takes three arguments

*   [pattern](#pattern)
*   [options](#options) (optional) 
*   scheduled function (optional)

```javascript
const job = Cron("* * * * * *" /* Or a date object, or ISO 8601 local time */ , /*optional*/ { maxRuns: 1 } , /*optional*/ () => {} );

// If function is omitted in constructor, it can be scheduled later
job.schedule((/* optional */ job, /* optional */ context) => {});		

// States
const nextRun = job.next( /*optional*/ previousRun );	// Get a Date object representing next run
const nextRuns = job.enumerate(10, /*optional*/ startFrom ); // Get a array of Dates, containing next 10 runs according to pattern
const prevRun = job.previous( );	
const msToNext = job.msToNext( /*optional*/ previousRun ); // Milliseconds left to next execution
const isRunning = job.running();

// Control scheduled execution
job.pause();				
job.resume();
job.stop();

```

#### Options

| Key          | Default value  | Data type      | Remarks                               |
|--------------|----------------|----------------|---------------------------------------|
| name         | undefined      | String         | If you specify a name for the job, Croner will keep a reference to the job in exported array `scheduledJobs` |
| maxRuns      | Infinite       | Number         |                                       |
| catch	       | false          | Boolean        | Catch unhandled errors in triggered function. Passing `true` will silently ignore errors. Passing a callback function will trigger this callback on error. |
| timezone     | undefined      | String         | Timezone in Europe/Stockholm format   |
| startAt      | undefined      | String         | ISO 8601 formatted datetime (2021-10-17T23:43:00)<br>in local time (according to timezone parameter if passed) |
| stopAt       | undefined      | String         | ISO 8601 formatted datetime (2021-10-17T23:43:00)<br>in local time (according to timezone parameter if passed) |
| interval     | 0              | Number         | Minimum number of seconds between triggers. |
| paused       | false          | Boolean        | If the job should be paused from start. |
| context      | undefined      | Any            | Passed as the second parameter to triggered function |
| legacyMode   | true           | boolean        | Combine day-of-month and day-of-week using true = OR, false = AND |

#### Pattern

The expressions used by Croner are very similar to those of Vixie Cron, but with a few additions and changes as outlined below:

*   Croner expressions have the following additional modifiers:
	-   *?* A question mark is substituted with the time of Croner's initialization. For example `? ? * * * *` would be substituted with `25 8 * * * *` if the time is `<any hour>:08:25` at the time of `new Cron('? ? * * * *', <...>)`. The question mark can be used in any field.
	-   *L* L can be used in the day of the month field to specify the last day of the month.

*   Croner allows you to pass a JavaScript Date object or an ISO 8601 formatted string as a pattern. The scheduled function will trigger at the specified date/time and only once. If you use a timezone different from the local timezone, you should pass the ISO 8601 local time in the target location and specify the timezone using the options (2nd parameter).

*   Croner also allows you to change how the day-of-week and day-of-month conditions are combined. By default, Croner (and Vixie cron) will trigger when either the day-of-month OR the day-of-week conditions match. For example, `0 20 1 * MON` will trigger on the first of the month as well as each Monday. If you want to use AND (so that it only triggers on Mondays that are also the first of the month), you can pass `{ legacyMode: false }`. For more information, see issue [#53](https://github.com/Hexagon/croner/issues/53).

```javascript
// ┌──────────────── (optional) second (0 - 59)
// │ ┌────────────── minute (0 - 59)
// │ │ ┌──────────── hour (0 - 23)
// │ │ │ ┌────────── day of month (1 - 31)
// │ │ │ │ ┌──────── month (1 - 12, JAN-DEC)
// │ │ │ │ │ ┌────── day of week (0 - 6, SUN-Mon) 
// │ │ │ │ │ │       (0 to 6 are Sunday to Saturday; 7 is Sunday, the same as 0)
// │ │ │ │ │ │
// * * * * * *
```

| Field        | Required | Allowed values | Allowed special characters | Remarks                               |
|--------------|----------|----------------|----------------------------|---------------------------------------|
| Seconds      | Optional | 0-59           | * , - / ?                  |                                       |
| Minutes      | Yes      | 0-59           | * , - / ?                  |                                       |
| Hours        | Yes      | 0-23           | * , - / ?                  |                                       |
| Day of Month | Yes      | 1-31           | * , - / ? L                |                                       |
| Month        | Yes      | 1-12 or JAN-DEC| * , - / ?                  |                                       |
| Day of Week  | Yes      | 0-7 or SUN-MON | * , - / ?                  | 0 to 6 are Sunday to Saturday<br>7 is Sunday, the same as 0            |

> **Note**
> Weekday and month names are case-insensitive. Both `MON` and `mon` work.

It is also possible to use the following "nicknames" as pattern.

| Nickname | Description |
| -------- | ----------- |
| \@yearly | Run once a year, ie.  "0 0 1 1 *". |
| \@annually | Run once a year, ie.  "0 0 1 1 *". |
| \@monthly | Run once a month, ie. "0 0 1 * *". |
| \@weekly | Run once a week, ie.  "0 0 * * 0". |
| \@daily | Run once a day, ie.   "0 0 * * *". |
| \@hourly | Run once an hour, ie. "0 * * * *". |

### Examples 

#### Expressions
```javascript
// Run a function according to pattern
Cron('15-45/10 */5 1,2,3 ? JAN-MAR SAT', { legacyMode: false }, function () {
	console.log('This will run every tenth second between second 15-45');
	console.log('every fifth minute of hour 1,2 and 3 when day of month');
	console.log('is the same as when Cron started, every saturday in January to March.');
});
```

#### Interval
```javascript
// Trigger on specific interval combined with cron expression
Cron('* * * 7-16 * MON-FRI', { interval: 90, legacyMode: false }, function () {
	console.log('This will trigger every 90th second at 7-16 on mondays to fridays.');
});
```

#### Find dates
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

#### With options
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

#### Job controls
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

#### Passing a context
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

#### Fire on a specific date/time
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

#### Naming jobs

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

#### Act at completion

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

## Contributing

See [Contribution Guide](/CONTRIBUTING.md)

... or ...

<a href='https://ko-fi.com/C1C7IEEYF' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## License

MIT License
