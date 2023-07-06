---
layout: page
title: " 3. Usage"
---

# 3. Usage

---

Croner uses the function `Cron()` which takes in three arguments:

1. [Pattern](#pattern)
2. [Options](#options) (optional)
3. Scheduled function (optional)

    const job = Cron("* * * * * *", { maxRuns: 1 }, () => {} );

If the function is omitted in the constructor, it can be scheduled later:

    job.schedule(job, /* optional */ context) => {});

The job will be scheduled to run at the next matching time unless you supply the option `{ paused: true }`. The `Cron(...)` constructor will return a Cron instance, later referred to as `job`, which have a few methods and properties.

## Status

Check the status of the job using the following methods:

    job.nextRun( /*optional*/ startFromDate );    // Get a Date object representing the next run.
    job.nextRuns(10, /*optional*/ startFromDate ); // Get an array of Dates, containing the next n runs.
    job.msToNext( /*optional*/ startFromDate ); // Get the milliseconds left until the next execution.
    job.currentRun();         // Get a Date object showing when the current (or last) run was started.
    job.previousRun( );         // Get a Date object showing when the previous job was started.

    job.isRunning();     // Indicates if the job is scheduled and not paused or killed (true or false).
    job.isStopped();     // Indicates if the job is permanently stopped using `stop()` (true or false).
    job.isBusy();         // Indicates if the job is currently busy doing work (true or false).

    job.getPattern();     // Returns the original pattern string

## Control Functions

Control the job using the following methods:

    job.trigger();        // Force a trigger instantly
    job.pause();        // Pause trigger
    job.resume();        // Resume trigger
    job.stop();        // Stop the job completely. It is not possible to resume after this.
                        // Note that this also removes named jobs from the exported `scheduledJobs` array.

## Properties

    job.name             // Optional job name, populated if a name were passed to options

## Options

| Key          | Default value  | Data type      | Remarks                               |
|--------------|----------------|----------------|---------------------------------------|
| name         | undefined      | String         | If you specify a name for the job, Croner will keep a reference to the job in the exported array `scheduledJobs`. The reference will be removed on `.stop()`. |
| maxRuns      | Infinite       | Number         |                                       |
| catch        | false          | Boolean\|Function        | Catch unhandled errors in triggered function. Passing `true` will silently ignore errors. Passing a callback function will trigger this callback on error. |
| timezone     | undefined      | String         | Timezone in Europe/Stockholm format   |
| startAt      | undefined      | String         | ISO 8601 formatted datetime (2021-10-17T23:43:00)<br>in local time (according to timezone parameter if passed) |
| stopAt       | undefined      | String         | ISO 8601 formatted datetime (2021-10-17T23:43:00)<br>in local time (according to timezone parameter if passed) |
| interval     | 0              | Number         | Minimum number of seconds between triggers. |
| paused       | false          | Boolean        | If the job should be paused from start. |
| context      | undefined      | Any            | Passed as the second parameter to triggered function |
| legacyMode   | true           | boolean        | Combine day-of-month and day-of-week using true = OR, false = AND |
| unref        | false          | boolean        | Setting this to true unrefs the internal timer, which allows the process to exit even if a cron job is running. |
| utcOffset    | undefined      | number        | Schedule using a specific utc offset in minutes. This does not take care of daylight savings time, you probably want to use option `timezone` instead. |
| protect      | undefined      | boolean\|Function | Enabled over-run protection. Will block new triggers as long as an old trigger is in progress. Pass either `true` or a callback function to enable |

> **Warning**
> Unreferencing timers (option `unref`) is only supported by Node.js and Deno. 
> Browsers have not yet implemented this feature, and it does not make sense to use it in a browser environment.

## Pattern

Croner uses a cron-style string to set the schedule pattern:

    // ┌──────────────── (optional) second (0 - 59)
    // │ ┌────────────── minute (0 - 59)
    // │ │ ┌──────────── hour (0 - 23)
    // │ │ │ ┌────────── day of month (1 - 31)
    // │ │ │ │ ┌──────── month (1 - 12, JAN-DEC)
    // │ │ │ │ │ ┌────── day of week (0 - 6, SUN-Mon) 
    // │ │ │ │ │ │       (0 to 6 are Sunday to Saturday; 7 is Sunday, the same as 0)
    // │ │ │ │ │ │
    // * * * * * *

You can also use the following "nicknames" as pattern:

| Nickname | Description |
| -------- | ----------- |
| \@yearly | Run once a year, ie.  "0 0 1 1 *". |
| \@annually | Run once a year, ie.  "0 0 1 1 *". |
| \@monthly | Run once a month, ie. "0 0 1 * *". |
| \@weekly | Run once a week, ie.  "0 0 * * 0". |
| \@daily | Run once a day, ie.   "0 0 * * *". |
| \@hourly | Run once an hour, ie. "0 * * * *". |

> **Note**
> Weekday and month names are case-insensitive. Both `MON` and `mon` work.
> When using `L` in the Day of Week field, it affects all specified weekdays. For example, `L5,6` means the last Friday and Saturday in the month.
