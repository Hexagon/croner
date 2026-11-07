---
title: "Comparison (JavaScript)"
nav_order: 5
---

# Feature comparison

---

In this comparison, we outline the key differences between Croner for JavaScript and four other popular scheduling libraries: cronosjs, node-cron, cron, and node-schedule. The libraries are compared across various features such as platform compatibility, functionality, error handling, and Typescript support.

The table below provides a brief overview of each library's features.

|                           | croner              | cronosjs            | node-cron | cron                      | node-schedule       |
|---------------------------|:-------------------:|:-------------------:|:---------:|:-------------------------:|:-------------------:|
| **Platforms**             |                     |                     |           |                           |                     |
| Node.js (CommonJS)        |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Browser (ESMCommonJS)     |          ✓          |          ✓          |           |                           |                     |
| Deno (ESM)                |          ✓          |                     |           |                           |                     |
| **Features**              |                     |                     |           |                           |                     |
| Over-run protection       |          ✓          |                     |           |                           |                     |
| Error handling            |          ✓          |                     |           |                           |          ✓          |
| Typescript typings        |          ✓          |         ✓            |           |            ✓              |                     |
| Unref timers (optional)   |          ✓          |                     |           |          ✓                |                     |
| dom-OR-dow*                |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| dom-AND-dow* (optional)    |          ✓          |                     |           |                           |                     |
| Next run                  |          ✓          |          ✓          |           |           ✓               |          ✓          |
| Next n runs               |          ✓          |          ✓          |           |           ✓               |                     |
| Timezone                  |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Minimum interval          |          ✓          |                     |           |                           |                     |
| Controls (stop/resume)    |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Range (0-13)              |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Stepping (*/5)            |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Seconds field (OCPS 1.2)  |          ✓          |                     |           |                           |                     |
| Year field (OCPS 1.2)     |          ✓          |                     |           |                           |                     |
| Last day of month (L)     |          ✓          |          ✓          |           |                           |                     |
| Nth weekday of month (#)  |          ✓          |          ✓          |           |                           |                     |
| Nearest weekday (W)       |          ✓          |                     |           |                           |                     |
| AND logic modifier (+)    |          ✓          |                     |           |                           |                     |

> **DOM and DOW?**<br>
> DOM stands for Day of Month, and DOW stands for Day of Week.
{ .note }

