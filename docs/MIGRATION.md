# Migration

## Table of content

*  [Upgrading croner](#upgrading-croner)
*  [Migrationg from cron](#migrating-from-cron)
*  [Migrationg from node-cron](#migrating-from-node-cron)

## Upgrading croner

Croner follows the Semantic Versioning (SemVer) standard. SemVer is a versioning system that specifies how version numbers should be assigned and incremented in software projects. The system uses a three-part number scheme, consisting of MAJOR.MINOR.PATCH, which is used to communicate changes in the project's API and functionality.

  * MAJOR version changes indicate breaking changes to the project's API or functionality.
  * MINOR version changes indicate new functionality that is backwards-compatible with the previous version.
  * PATCH version changes indicate bug fixes or other minor changes that are backwards-compatible with the previous version.

Croner strictly follows the above, which means you can be fairly certain that a minor or patch bump will not cause any issues with your software. However, a major bump will likely require some level of manual intervention.

### Upgrading from 4.x to 5.x

If upgrading from a previous version of Croner, the most important breaking change to know about is from `4.x` to `5.x`, where the way day-of-month and day-of-week are combined has changed. Versions `1.x`-`4.x` used "AND," while version `5.0` or later uses "OR" to comply with Vixie-cron. You can read more about this in issue #53. The new mode is, oddly enough, called `legacyMode` and can be disabled using the options.

### Upgrading from 5.x to 6.x

In version `6.x`, CommonJS and UMD builds were separated in the dist folder. If you're using a package manager, the transition should be seamless. However, if you're referencing a specific file using a CDN, you may need to adjust the URL slightly.

Several methods are also renamed, to make them more descriptive.

*   `next()` -> `nextRun()`
*   `enumerate()` -> `nextRuns()`
*   `current()` -> `currentRun()`
*   `previous()`-> `previousRun()`
*   `running()` -> `isRunning()`
*   `busy()` -> `isBusy()`

## Migrating from Cron

If you're currently using the cron package and want to migrate to croner, here are the steps you can follow:

### Step 1: Install Croner

The first step is to install the croner package. You can do this by running the following command in your terminal:

```
npm install croner
```

### Step 2: Update your code to use Croner

The croner package has a slightly different API compared to the cron package. Here's an example of how to create a new `CronJob` using croner:

```js
// CronJob constructor is called just Cron in Croner
const { Cron } = require('croner');

// If you have a lot of code using the CrobJob constructor, you can re-use the name like this
// const { Cron as CronJob } = require('croner');

const job = new Cron('0 0 12 * * *', { /* options */ }, () => {
  console.log('This job will run at 12:00 PM every day.');
});

job.start();
```

The main differences between `cron` and `croner` are that croner uses an object for options, whereas cron uses parameters. Please have a look att [/README.md#options](/README.md#options) to find the equivalents.

Another difference is the method names. Below is a list of `cron` methods with their `croner` equivalents

| Cron | Croner | Note |
| ---- | ------ | ---- |
| stop() | pause() | stop() in croner block further usage of the job, whereas pause() just pause it |
| start() | resume() | |
| lastDate() | previous() | |
| nextDate() | next() | |
| nextDates(n) | enumerate(n) | |

### Step 3: Update your tests

If you have tests for your code, you'll need to update them to use croner instead of cron. Make sure to test that your jobs are still running as expected after the migration.

## Migrating from node-cron

Migrating from node-cron to croner

`node-cron` is a popular npm package for scheduling cron jobs in Node.js applications. However, `croner` is a more modern alternative with additional features, options and improved performance. If you're currently using node-cron and want to migrate to croner, here's what you need to do:

### Install croner package:

First, you need to install the croner package in your project. You can do this by running the following command in your terminal:

```npm install croner```

### Replace the import statement:

Next, you'll need to update the import statement for cron to croner. In the file where you use the node-cron package, replace the line that reads:

```javascript
const cron = require('node-cron');
```

with:

```javascript
const cron = require('croner');
```

### Update your cron job:

The syntax for setting up cron jobs is very similar, however the function and the options needs to be swapped. Here's an example of how to migrate a cron job that runs every minute 14 o'clock in Oslo:

```javascript
// node-cron
cron.schedule('0 * 14 * * *', () => {
  console.log('Running a task every minute');
}, { timezone: "Europe/Oslo" });

// croner
Cron('0 * 14 * * *', { timezone: "Europe/Oslo" }, () => {
  console.log('Running a task every minute');
});
```

Croner supports some additional options that node-cron does not. See [/README.md#options](/README.md#options) for a full list.

The method names for controlling a job are also different, or function differently. See below:

| Cron | Croner | Note |
| ---- | ------ | ---- |
| stop() | pause() | |
| start() | resume() | |
| -      | stop() | Completely stops a job by clearing the internal timeout and by blocking further execution. | 

That's it! By following these steps, you should be able to migrate from `node-cron` to `croner` without any issues.