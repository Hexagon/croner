
# Croner

[![Build status](https://travis-ci.org/Hexagon/croner.svg)](https://travis-ci.org/Hexagon/thinker-fts) [![npm version](https://badge.fury.io/js/croner.svg)](https://badge.fury.io/js/croner)

Pure JavaScript Isomorphic cron parser without dependencies.


# Installation

## Node.js 

```npm install croner```

## Browser (AMD and regular usage) 

Download croner.js and import with script-tag or AMD.


# Usage
```javascript
// Parse 14:00:00 at next sunday
var scheduler = cron('0 0 14 * * 7');

// Log the actual date object of next run
console.log(scheduler.next());

// Log number of milliseconds to next run
console.log(scheduler.msToNext());`
```


# Pattern
```
┌──────────────── sec (0 - 59)
| ┌────────────── min (0 - 59)
| │ ┌──────────── hour (0 - 23)
| │ │ ┌────────── day of month (1 - 31)
| │ │ │ ┌──────── month (1 - 12)
| │ │ │ │ ┌────── day of week (0 - 6) 
| │ │ │ │ │       (0 to 6 are Sunday to Saturday; 7 is Sunday, the same as 0)
| │ │ │ │ │
* * * * * *
```


# License

MIT
