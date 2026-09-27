---
title: "Basics"
parent: "Usage"
nav_order: 1
---

# Basic usage

---

Croner uses the function `new Cron()` which takes in three arguments:

```ts
const job = new Cron(
    /* The pattern */
    "* * * * * *",
    /* Options (optional) */
    { maxRuns: 1 },
    /* Function (optional) */
    () => {}
);
```

If the function is omitted in the constructor, it can be scheduled later:

```ts
job.schedule(() => { /* ... */ });
```

The job will be scheduled to run at the next matching time unless you supply the option `{ paused: true }`. The `Cron(...)` constructor will return a Cron instance, later referred to as `job`, which have a few methods and properties.

## Status

Check the status of the job using the following methods:

```ts
job.nextRun( /*optional*/ startFromDate );    // Get a Date object representing the next run.
job.nextRuns(10, /*optional*/ startFromDate ); // Get an array of Dates, containing the next n runs.
job.previousRuns(10, /*optional*/ referenceDate ); // Get an array of Dates, containing previous n scheduled runs.
job.enumerate( /*optional*/ startFromDate );  // Get a stateful CronIterator for use in for...of / destructuring.
job.msToNext( /*optional*/ startFromDate ); // Get the milliseconds left until the next execution.
job.currentRun();         // Get a Date object showing when the current (or last) run was started.
job.previousRun( );         // Get a Date object showing when the previous job was started.

job.match( date );     // Check if a Date object or date string matches the cron pattern (true or false).

job.isRunning();     // Indicates if the job is scheduled and not paused or killed (true or false).
job.isStopped();     // Indicates if the job is permanently stopped using `stop()` (true or false).
job.isBusy();         // Indicates if the job is currently busy doing work (true or false).

job.getPattern();     // Returns the original cron pattern string, or undefined for date-based jobs
job.getOnce();     // Returns the original run-once date (Date or null)
```

`nextRun()` and `schedule()` also accept an optional `now` date as their last parameter — `nextRun(undefined, now)` — which pins the calculation to that clock reading instead of the current time. The anchor only applies when no start date is supplied and the job has no current run. Croner uses this internally to derive the trigger target and its delay from a single clock read, so a forward clock step (NTP correction, host resync) between arming reads cannot silently skip an occurrence. The anchored form returns the exact target the internal timer would use — for `dayOffset` schedules, the shifted schedule's next wall-clock occurrence rather than `nextRun(startFromDate)`'s presentation date — so `target - now` is always a valid delay. Supply it yourself only if you need the same guarantee when calculating delays from `nextRun()`.

## Control Functions

Control the job using the following methods:

```ts
job.trigger();     // Force a trigger instantly
job.pause();       // Pause trigger
job.resume();      // Resume trigger
job.stop();        // Stop the job completely. It is not possible to resume after this.
                   // Note that this also removes named jobs from the exported `scheduledJobs` array.
```

## Properties

```ts
job.name             // Optional job name, populated if a name were passed to options
```