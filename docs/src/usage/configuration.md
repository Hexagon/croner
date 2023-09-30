---
title: "Configuration"
parent: "Usage"
nav_order: 3
---

# Configuration

---

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

