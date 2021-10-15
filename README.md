# Croner

[![Build status](https://travis-ci.org/Hexagon/croner.svg)](https://travis-ci.org/Hexagon/croner) [![npm version](https://badge.fury.io/js/croner.svg)](https://badge.fury.io/js/croner) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/4978bdbf495941c087ecb32b120f28ff)](https://www.codacy.com/gh/Hexagon/croner/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Hexagon/croner&amp;utm_campaign=Badge_Grade)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Hexagon/croner/blob/master/LICENSE) [![jsdelivr](https://data.jsdelivr.com/v1/package/npm/croner/badge?style=rounded)](https://www.jsdelivr.com/package/npm/croner)

*   Trigger functions in javascript using [Cron](https://en.wikipedia.org/wiki/Cron#CRON_expression) syntax.
*   Pause, resume or stop exection efter a task is scheduled.
*   Find first date of next month, find date of next tuesday, etc.
*   Supports Node.js from 4.0 to current. Both require (commonjs) and import (module).
*   Supports browser use ([UMD](https://github.com/umdjs/umd) (standalone, requirejs etc.), [ES-module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules))
*   *Experimental:* Schedule in other timezone than default.

Documented with [JSDoc](https://jsdoc.app/) for intellisense, and include [TypeScript](https://www.typescriptlang.org/) typings.

```html
<script src="https://cdn.jsdelivr.net/npm/croner@4/dist/croner.min.js"></script>
```

```javascript
// Run a function each second
Cron('* * * * * *', function () {
	console.log('This will run every second');
});

// What date is next sunday?
console.log(Cron('0 0 0 * * 7').next().toLocaleDateString());
```

## Installation

### Manual

*   Download latest [zipball](http://github.com/Hexagon/croner/zipball/master/)
*   Unpack
*   Grab ```croner.min.js``` ([UMD](https://github.com/umdjs/umd)) or ```croner.min.mjs``` ([ES-module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)) from the [dist/](/dist) folder

### Node.js

```npm install croner --save```

```javascript
// ESM Import
import Cron from "croner";

// ... or

// CommonJS Require

const Cron = require("croner");
```

### CDN

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

### Minimalist scheduling
```javascript
// Run a function each second
Cron('* * * * * *', function () {
	console.log('This will run every second');
});
```

### Find dates
```javascript
// Find next month
let nextMonth = Cron('0 0 0 1 * *').next(),
	nextSunday = Cron('0 0 0 * * 7').next();

console.log("First day of next month: " +  nextMonth.toLocaleDateString());
console.log("Next sunday: " +  nextSunday.toLocaleDateString());
```

### Minimalist scheduling with stepping and custom timezone
```javascript
// Run a function every fifth second
Cron('*/5 * * * * *', { timezone: 'Europe/Stockholm' }, function () {
	console.log('This will run every fifth second');
});
```

### Minimalist scheduling with range
```javascript
// Run a function the first five seconds of a minute
Cron('0-4 * * * * *', function () {
	console.log('This will run the first five seconds every minute');
});
```

### Minimalist scheduling with options
```javascript
// Run a function each second, limit to five runs
Cron('* * * * * *', { maxRuns: 5 }, function () {
	console.log('This will run each second, but only five times.');
});
```

### Minimalist scheduling with job controls
```javascript
// Run a function each second, get reference to job
var job = Cron('* * * * * *', function () {
	console.log('This will run each second.');
});

// Pause job
job.pause();

// Resume job
job.resume();

// Stop job
job.stop();

```

### Basic scheduling
```javascript

// Run every minute
var scheduler = Cron('0 * * * * *');

scheduler.schedule(function() {
	console.log('This will run every minute');
});
```

### Scheduling with options
```javascript

// Run every minute
var scheduler = Cron('0 * * * * *', { maxRuns: 5 });

// Schedule with options (all options are optional)
scheduler.schedule(function() {
	console.log('This will run every minute.');
});
```
### Scheduling with controls
```javascript
let scheduler = Cron('* * * * * *')

scheduler.schedule(function () {
	console.log('This will run every second. Pause on second 10. Resume on second 15. And quit on second 20.');
	console.log('Current second: ', new Date().getSeconds());
	console.log('Previous run: ' + scheduler.previous());
	console.log('Next run: ' + scheduler.next());
});

Cron('10 * * * * *', {maxRuns: 1}, () => scheduler.pause());
Cron('15 * * * * *', {maxRuns: 1}, () => scheduler.resume());
Cron('20 * * * * *', {maxRuns: 1}, () => scheduler.stop());
```

## Full API
```javascript

var scheduler = Cron( <string pattern> [, { startAt: <date|string>, stopAt: <date|string>, maxRuns: <integer>, timezone: <string> } ] [, <function job> ] )

scheduler.next( [ <date previous> ] );
scheduler.msToNext( [ <date previous> ] );
scheduler.previous();
scheduler.schedule( <fn job> );
scheduler.pause();
scheduler.resume();
scheduler.stop();

```

## Pattern

```
┌──────────────── (optional) second (0 - 59)
│ ┌────────────── minute (0 - 59)
│ │ ┌──────────── hour (0 - 23)
│ │ │ ┌────────── day of month (1 - 31)
│ │ │ │ ┌──────── month (1 - 12)
│ │ │ │ │ ┌────── day of week (0 - 6) 
│ │ │ │ │ │       (0 to 6 are Sunday to Saturday; 7 is Sunday, the same as 0)
│ │ │ │ │ │
* * * * * *
```

## License

MIT
