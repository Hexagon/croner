<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/hexagon/croner@master/croner.png" alt="Croner" width="150" height="108"><br>
  Trigger functions in javascript using Cron syntax.<br><br>Try it live on <a href="https://jsfiddle.net/hexag0n/hoa8kwsb/">jsfiddle</a>.<br>
</p>

# Croner

![Node.js CI](https://github.com/Hexagon/croner/workflows/Node.js%20CI/badge.svg?branch=master) [![npm version](https://badge.fury.io/js/croner.svg)](https://badge.fury.io/js/croner) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/4978bdbf495941c087ecb32b120f28ff)](https://www.codacy.com/gh/Hexagon/croner/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Hexagon/croner&amp;utm_campaign=Badge_Grade)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Hexagon/croner/blob/master/LICENSE) [![jsdelivr](https://data.jsdelivr.com/v1/package/npm/croner/badge?style=rounded)](https://www.jsdelivr.com/package/npm/croner)

*   Trigger functions in JavaScript using [Cron](https://en.wikipedia.org/wiki/Cron#CRON_expression) syntax
*   Pause, resume or stop execution efter a task is scheduled
*   Find first date of next month, find date of next tuesday, etc.
*   Works in Node.js >=4.0 (both require and import)
*   Works in Deno >=1.16
*   Works in browsers as standalone, UMD or ES-module.
*   **Experimental feature:** Schedule in specific target timezones
*   Includes [TypeScript](https://www.typescriptlang.org/) typings

Quick examples:

```javascript
// Run a function at the interval set by a cron expression
let job = Cron('* * * * * *', () => {
	console.log('This will run every second');
});

// What date is next sunday?
let nextSunday = Cron('0 0 0 * * 7').next();
console.log(nextSunday.toLocaleDateString());

// How many days left to christmas eve?
let msLeft = Cron('59 59 23 24 DEC *').next() - new Date();
console.log(Math.floor(msLeft/1000/3600/24) + " days left to next christmas eve");
```

More [examples](#examples)...

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

*Note that only default export is available in Node.js TypeScript, as the commonjs module is used internally.*

```typescript
import Cron from "croner";

const scheduler : Cron = new Cron("* * * * * *", () => {
    console.log("This will run every second.");
});
```


### Deno

JavaScript

```javascript
import Cron from "https://cdn.jsdelivr.net/gh/hexagon/croner@4/src/croner.js";

Cron("* * * * * *", () => {
    console.log("This will run every second.");
});
```

TypeScript

```typescript
import { Cron } from "https://cdn.jsdelivr.net/gh/hexagon/croner@4/src/croner.js";

const _scheduler : Cron = new Cron("* * * * * *", () => {
    console.log("This will run every second.");
});
```

### Browser 

#### Manual

*   Download latest [zipball](https://github.com/Hexagon/croner/archive/refs/heads/master.zip)
*   Unpack
*   Grab ```croner.min.js``` (UMD and standalone) or ```croner.min.mjs``` (ES-module) from the [dist/](/dist) folder

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
## Documentation

Full documentation available at [hexagon.github.io/croner](https://hexagon.github.io/croner/Cron.html).

The short version:

### Signature

Cron takes three arguments

*   [pattern](#pattern)
*   [options](#options) (optional) 
*   scheduled function (optional)

```javascript
var job = Cron("* * * * * *" , /*optional*/ { maxRuns: 1 } , /*optional*/ () => {} );

// If function is omitted in constructor, it can be scheduled later
job.schedule(() => {});		

// States
let nextRun = job.next( /*optional*/ previousRun );	// Get a Date object representing next run
let prevRun = job.previous( );	
let msToNext = job.msToNext( /*optional*/ previousRun ); // Milliseconds left to next execution
let isRunning = job.running();

// Control scheduled execution
job.pause();				
job.resume();
job.stop();

```

#### Options

| Key          | Default value  | Data type      | Remarks                               |
|--------------|----------------|----------------|---------------------------------------|
| maxRuns      | Infinite       | Number         |                                       |
| catch	       | false          | Boolean        | Catch and ignore unhandled errors in triggered function |
| timezone     | undefined      | String         | Timezone in Europe/Stockholm format   |
| startAt      | undefined      | String         | ISO 8601 formatted datetime (2021-10-17T23:43:00)<br>in local or specified timezone |
| stopAt       | undefined      | String         | ISO 8601 formatted datetime (2021-10-17T23:43:00)<br>in local or specified timezone |
| paused       | false          | Boolean        | If the job should be paused from start. |

#### Pattern

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
| Seconds      | Optional | 0-59           | * , - /                    |                                       |
| Minutes      | Yes      | 0-59           | * , - /                    |                                       |
| Hours        | Yes      | 0-23           | * , - /                    |                                       |
| Day of Month | Yes      | 1-31           | * , - /                    |                                       |
| Month        | Yes      | 1-12 or JAN-DEC| * , - /                    |                                       |
| Day of Week  | Yes      | 0-7 or SUN-MON | * , - /                    | 0 to 6 are Sunday to Saturday<br>7 is Sunday, the same as 0            |

**Note**: Weekday and month names are case insensitive. Both MON and mon works.

### Examples 

#### Expressions
```javascript
// Run a function according to pattern
Cron('15-45/15 */5 1,2,3 * JAN-MAR SAT', function () {
	console.log('This will run every fifteenth second between second 15-45');
	console.log('every fifth minuteof hour 1,2 and 3');
	console.log('every saturday in January to March.');
});
```

#### Find dates
```javascript
// Find next month
let nextMonth = Cron('0 0 0 1 * *').next(),
	nextSunday = Cron('0 0 0 * * 7').next(),
	nextSat29feb = Cron("0 0 0 29 2 6").next();

console.log("First day of next month: " +  nextMonth.toLocaleDateString());
console.log("Next sunday: " +  nextSunday.toLocaleDateString());
console.log("Next saturday at 29th of february: " +  nextSat29feb.toLocaleDateString());  // 2048-02-29
```

#### With options
```javascript

var job = Cron(
	'* * * * *', 
	{ 
		maxRuns: Infinity, 
		startAt: "2021-11-01T00:00:00", 
		stopAt: "2021-12-01T00:00:00",
		timezone: "Europe/Stockholm"
	},
	function() {
		console.log('This will run every minute, from 2021-11-01 to 2021-12-01 00:00:00 in Europe/Stockholm.');
	}
);
```

#### Job controls
```javascript
let job = Cron('* * * * * *', (self) => {
	console.log('This will run every second. Pause on second 10. Resume on second 15. And quit on second 20.');
	console.log('Current second: ', new Date().getSeconds());
	console.log('Previous run: ' + self.previous());
	console.log('Next run: ' + self.next());
});

Cron('10 * * * * *', {maxRuns: 1}, () => job.pause());
Cron('15 * * * * *', {maxRuns: 1}, () => job.resume());
Cron('20 * * * * *', {maxRuns: 1}, () => job.stop());
```

## License

MIT
