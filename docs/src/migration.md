---
title: "Migration"
nav_order: 4
---

# Migration

---

<!-- TOC -->

{% include multiplex.html %}

## Upgrading Croner

This section covers upgrading to Croner from previous versions. Croner follows the Semantic Versioning (SemVer) standard. Be mindful that major updates may cause breaking changes.

### Upgrading from 4.x to 5.x

If upgrading from version `4.x` to `5.x`, the most significant change is the way day-of-month and day-of-week are combined. You can read more about this in issue #53. The new mode is called `legacyMode` and can be disabled using the options.

### Upgrading from 5.x to 6.x

For upgrading from version `5.x` to `6.x`, CommonJS and UMD builds were separated in the dist folder. Several method names were also changed to make them more descriptive:

*   `next()` -> `nextRun()`
*   `enumerate()` -> `nextRuns()`
*   `current()` -> `currentRun()`
*   `previous()`-> `previousRun()`
*   `running()` -> `isRunning()`
*   `busy()` -> `isBusy()`

### Upgrading from 6.x to 7.x

Version `7.x` introduces significant changes, including the introduction of the nth weekday specifier `#`. Furthermore, there's a modification in the way `L` functions in the day-of-week field. In version `6.x`, `L` had flexibility in its positioning: both `LSUN` and `SUNL` were valid expressions to denote the last Sunday of the month. However, starting from version `7.x`, `L` must be used in conjunction with the nth weekday specifier `#`, like so: `SUN#L`.

### Upgrading from 7.x to 8.x

Version `8.x` introduces no significant changes in the API for Croner. However, a major change is the discontinuation of support for Node.js versions prior to `18.0`. It is crucial to ensure that your environment is running Node.js `18.0` or higher before upgrading to `8.x`. If you rely on Node <= `16` you should stick with `7.x`.

## Switching from Cron

If you're currently using the cron package and want to migrate to Croner, the following steps can guide you:

### Step 1: Install Croner

To install the croner package, run the following command in your terminal:

```bash
npm install croner
```

### Step 2: Update your code to use Croner

The croner package has a different API compared to the cron package. Here's an example of how to create a new `CronJob` using croner:

```ts
// CronJob constructor is called just Cron in Croner
const { Cron } = require('croner');

// If you have a lot of code using the CrobJob constructor, you can re-use the name like this
// const { Cron as CronJob } = require('croner');

const job = new Cron('0 0 12 * * *', { /* options */ }, () => {
    console.log('This job will run at 12:00 PM every day.');
});

job.start();
```

### Step 3: Update your tests

If you have tests for your code, you'll need to update them to use Croner instead of Cron. Make sure to test that your jobs are still running as expected after the migration.

## Switching from node-cron

Here's how to migrate from the node-cron package to Croner:

### Install croner package:

First, install the croner package in your project:

```bash
npm install croner
```

### Replace the import statement:

Next, update the import statement for cron to croner. Replace the line that reads:

```ts
const cron = require('node-cron');
```

with:

```ts
const cron = require('croner');
```

### Update your cron job:

Here's an example of how to migrate a cron job:

```ts
// node-cron
cron.schedule('0 * 14 * * *', () => {
    console.log('Running a task every minute');
}, { timezone: "Europe/Oslo" });

// croner
Cron('0 * 14 * * *', { timezone: "Europe/Oslo" }, () => {
    console.log('Running a task every minute');
});
```

By following these steps, you should be able to migrate from `node-cron` to `croner` without any issues.
