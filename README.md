# Croner

[![Build status](https://travis-ci.org/Hexagon/croner.svg)](https://travis-ci.org/Hexagon/croner) [![npm version](https://badge.fury.io/js/croner.svg)](https://badge.fury.io/js/croner) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/4978bdbf495941c087ecb32b120f28ff)](https://www.codacy.com/gh/Hexagon/croner/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Hexagon/croner&amp;utm_campaign=Badge_Grade)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Hexagon/croner/blob/master/LICENSE) [![jsdelivr](https://data.jsdelivr.com/v1/package/npm/croner/badge?style=rounded)](https://www.jsdelivr.com/package/npm/croner)

*   Trigger functions in javascript using [Cron](https://en.wikipedia.org/wiki/Cron#CRON_expression) syntax.
*   Pause, resume or stop execution efter a task is scheduled.
*   Find first date of next month, find date of next tuesday, etc.
*   Supports Node.js from 4.0 to current. Both require (commonjs) and import (module).
*   Supports browser use ([UMD](https://github.com/umdjs/umd) (standalone, requirejs etc.), [ES-module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules))
*   **Experimental:** Schedule in other timezones than default.

Documented with [JSDoc](https://jsdoc.app/) for intellisense, and include [TypeScript](https://www.typescriptlang.org/) typings.

```javascript
// Run a function at the interval set by a cron expression
let job = Cron('* * * * * *', () => {
	console.log('This will run every second');
});

// Control execution
// job.pause();
// job.resume();
// job.stop();

// Get info
let next = job.next();
let previous = job.previous();
```

```javascript
// What date is next sunday?
let nextSunday = Cron('0 0 0 * * 7').next();
console.log(nextSunday.toLocaleDateString());

// How many days left to christmas eve?
let msLeft = Cron('59 59 23 24 DEC *').next() - new Date();
console.log(Math.floor(msLeft/1000/3600/24) + " days left to next christmas eve");
```

## Installation

### Node.js

```npm install croner --save```

```javascript
// ESM Import
import Cron from "croner";

// ... or

// CommonJS Require

const Cron = require("croner");
```

### Browser 

#### Manual

*   Download latest [zipball](http://github.com/Hexagon/croner/zipball/master/)
*   Unpack
*   Grab ```croner.min.js``` ([UMD](https://github.com/umdjs/umd)) or ```croner.min.mjs``` ([ES-module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)) from the [dist/](/dist) folder

#### CDN

To use as a [UMD](https://github.com/umdjs/umd)-module (stand alone, [RequireJS](https://requirejs.org/) etc.)

```html
<script src="https://cdn.jsdelivr.net/npm/croner@4/dist/croner.min.js"></script>
```

To use as a [ES-module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

```html
<script type="module">
	import Cron from "https://cdn.jsdelivr.net/npm/croner@4/dist/croner.min.mjs";

	// ... see usage section ...
</script>
```

... or a ES-module with [import-map](https://github.com/WICG/import-maps)
```html
<script type="importmap">
	{
		"imports": {
			"croner": "https://cdn.jsdelivr.net/npm/croner@4/dist/croner.min.mjs"
		}
	}
</script>
<script type="module">
	import Cron from 'croner';

	// ... see usage section ...
</script>
```

## Examples 

### Minimal
```javascript
// Run a function each second
Cron('* * * * * *', () => {
	console.log('This will run every second');
});
```

### Find dates
```javascript
// Find next month
let nextMonth = Cron('0 0 0 1 * *').next(),
	nextSunday = Cron('0 0 0 * * 7').next(),
	nextSaturday29feb = Cron("0 0 0 29 2 6").next();

console.log("First day of next month: " +  nextMonth.toLocaleDateString());
console.log("Next sunday: " +  nextSunday.toLocaleDateString());
console.log("Next saturday at 29th of february: " +  nextSaturday29feb.toLocaleDateString());  // 2048-02-29
```

### Expressions
```javascript
// Run a function the first five seconds of a minute
Cron('0-4 */5 1,2,3 * JAN-MAR SAT', function () {
	console.log('This will run the first five seconds every fifth minute of hour 1,2 and 3 every saturday in January to March');
});
```

### Options
```javascript

// Run every minute, if you pass 5 sections to croner, seconds will default to 0
// * * * * * is equivalent to 0 * * * * *
var job = Cron(
	'* * * * *', 
	{ 
		maxRuns: Infinity, 
		startAt: "2021-11-01 00:00:00", 
		stopAt: "2021-12-01 00:00:00",
		timezone: "Europe/Stockholm"
	},
	function() {
		console.log('This will run every minute, from 2021-11-01 to 2021-12-01 00:00:00 in Europe/Stockholm.');
	}
);
```

### Job controls
```javascript
let job = Cron('* * * * * *', () => {
	console.log('This will run every second. Pause on second 10. Resume on second 15. And quit on second 20.');
	console.log('Current second: ', new Date().getSeconds());
	console.log('Previous run: ' + job.previous());
	console.log('Next run: ' + job.next());
});

Cron('10 * * * * *', {maxRuns: 1}, () => job.pause());
Cron('15 * * * * *', {maxRuns: 1}, () => job.resume());
Cron('20 * * * * *', {maxRuns: 1}, () => job.stop());
```

## Full API
```javascript

var job = Cron( <string pattern> [, { startAt: <date|string>, stopAt: <date|string>, maxRuns: <integer>, timezone: <string> } ] [, <function job> ] );

job.next( [ <date previous> ] );
job.msToNext( [ <date previous> ] );
job.previous();
job.schedule( <fn job> );
job.pause();
job.resume();
job.stop();

```

## Pattern

```
┌──────────────── (optional) second (0 - 59)
│ ┌────────────── minute (0 - 59)
│ │ ┌──────────── hour (0 - 23)
│ │ │ ┌────────── day of month (1 - 31)
│ │ │ │ ┌──────── month (1 - 12, JAN-DEC)
│ │ │ │ │ ┌────── day of week (0 - 6, SUN-Mon) 
│ │ │ │ │ │       (0 to 6 are Sunday to Saturday; 7 is Sunday, the same as 0)
│ │ │ │ │ │
* * * * * *
```

### Details

| Field        | Required | Allowed values | Allowed special characters | Remarks                               |
|--------------|----------|----------------|----------------------------|---------------------------------------|
| Seconds      | Optional | 0-59           | * , - /                    |                                       |
| Minutes      | Yes      | 0-59           | * , - /                    |                                       |
| Hours        | Yes      | 0-23           | * , - /                    |                                       |
| Day of Month | Yes      | 1-31           | * , - /                    |                                       |
| Month        | Yes      | 1-12 or JAN-DEC| * , - /                    |                                       |
| Day of Week  | Yes      | 0-7 or SUN-MON| * , - /                    | 0 to 6 are Sunday to Saturday; 7 is Sunday, the same as 0 |

**Note**: Weekday and month names are case insensitive. Both MON and mon works.

## License

MIT
