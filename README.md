
# Croner

[![Build status](https://travis-ci.org/Hexagon/croner.svg)](https://travis-ci.org/Hexagon/croner) [![npm version](https://badge.fury.io/js/croner.svg)](https://badge.fury.io/js/croner)

Pure JavaScript Isomorphic cron parser and scheduler without dependencies.


# Installation

## Node.js 

```npm install croner```

## Browser (AMD and regular usage) 

Download lib/croner.js and import with script-tag or AMD as usual.


# Usage
```javascript
var o = cron( <string pattern> );
o.next( [ <date previous> ] );
o.msToNext();
var job = o.schedule( [ { startAt: <date>, stopAt: <date>, maxRuns: <integer> } ,] callback);
job.pause();
job.resume();
job.stop();

```


# Examples 

# Parsing only
```javascript

// Parse 14:00:00 at next sunday
var parser = cron('0 0 14 * * 7');

// Log the actual date object of next run
console.log(parser.next());

// Log number of milliseconds to next run
console.log(parser.msToNext());`
```

## Basic scheduling
```javascript

// Run every minute
var scheduler = cron('0 * * * * *');

scheduler.schedule(function() {
	console.log('This will run every minute.');
});
```

## Scheduling with options
```javascript

// Run every minute
var scheduler = cron('0 * * * * *');

// Schedule with options (all options are optional)
scheduler.schedule({ maxRuns: 5 }, function() {
	console.log('This will run every minute.');
});
```


# Pattern
```
┌──────────────── sec (0 - 59)
│ ┌────────────── min (0 - 59)
│ │ ┌──────────── hour (0 - 23)
│ │ │ ┌────────── day of month (1 - 31)
│ │ │ │ ┌──────── month (1 - 12)
│ │ │ │ │ ┌────── day of week (0 - 6) 
│ │ │ │ │ │       (0 to 6 are Sunday to Saturday; 7 is Sunday, the same as 0)
│ │ │ │ │ │
* * * * * *
```


# License

MIT
