---
layout: page
title: "Basics"
parent: "Usage"
nav_order: 1
---

# Basic usage

---

Croner uses the function `Cron()` which takes in three arguments:

```ts
const job = Cron(
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
job.schedule(job, /* optional */ context) => {});
```

The job will be scheduled to run at the next matching time unless you supply the option `{ paused: true }`. The `Cron(...)` constructor will return a Cron instance, later referred to as `job`, which have a few methods and properties.

{% include multiplex.html %}

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