---
layout: page
title: "Overview"
nav_order: 1
---

<p align="center">
<img src="https://cdn.jsdelivr.net/gh/hexagon/croner@master/croner.png" alt="Croner" width="150" height="150"><br>
Trigger functions or evaluate cron expressions in JavaScript or TypeScript. No dependencies. All features. Node. Deno. Bun. Browser. <br><br>Try it live on <a href="https://jsfiddle.net/hexag0n/hoa8kwsb/">jsfiddle</a>.<br>
</p>


## Features


*   Trigger functions in JavaScript using [Cron](https://en.wikipedia.org/wiki/Cron#CRON_expression) syntax.
*   Evaluate cron expressions and get a list of upcoming run times.
*   Uses Vixie-cron [pattern](usage/pattern.md), with additional features such as `L` for last day and weekday of month.
*   Works in Node.js >=7.6 (both require and import), Deno >=1.16 and Bun >=0.2.2.
*   Works in browsers as standalone, UMD or ES-module.
*   Target different [time zones](usage/examples.md#time-zone).
*   Built-in [overrun protection](usage/examples.md#overrun-protection)
*   Built-in [error handling](usage/examples.md#error-handling)
*   Includes [TypeScript](https://www.typescriptlang.org/) typings.
*   Support for asynchronous functions.
*   Pause, resume, or stop execution after a task is scheduled.
*   Operates in-memory, with no need for a database or configuration files.
*   Zero dependencies.
*   Tried and tested, depended on by well known projects such as [pm2](https://github.com/unitech/pm2), [Uptime Kuma](https://github.com/louislam/uptime-kuma), [ZWave JS](https://github.com/zwave-js/zwave-js-ui) and [TrueNAS](https://github.com/truenas/webui).

## Quick examples

**Run a function at the interval defined by a cron expression**

```javascript
const job = new Cron('*/5 * * * * *', () => {
	console.log('This will run every five seconds');
});
```

** Enumeration: What dates do the next 100 sundays occur on? **

```javascript
const nextSundays = Cron('0 0 0 * * 7').nextRuns(100);
console.log(nextSundays);
```

**Days left to a specific date**

```javascript
const msLeft = Cron('59 59 23 24 DEC *').nextRun() - new Date();
console.log(Math.floor(msLeft/1000/3600/24) + " days left to next christmas eve");
```

**Run a function at a specific date/time using a non-local timezone**

Time is ISO 8601 local time, this will run 2024-01-23 00:00:00 according to the time in Asia/Kolkata

```javascript
Cron('2024-01-23T00:00:00', { timezone: 'Asia/Kolkata' }, () => { console.log('Yay!') });
```

More examples at [usage/examples.md]([usage/examples.md])

{:toc}

