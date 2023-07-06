---
layout: page
title: "Why Croner"
nav_order: 5
---

# Why Croner

I got frustrated with the existing Cron libraries. They have bugs, use bloated dependencies, do not work in all environments, and/or simply do not work as expected. So I started from scratch with the intention to support TypeScript, modern (as well as legacy environments), current standards, and expectations.

Here is a comparison:

|                           | croner              | cronosjs            | node-cron | cron                      | node-schedule       |
|---------------------------|:-------------------:|:-------------------:|:---------:|:-------------------------:|:-------------------:|
| **Platforms**             |                     |                     |           |                           |                     |
| Node.js (CommonJS)        |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Browser (ESMCommonJS)     |          ✓          |          ✓          |           |                           |                     |
| Deno (ESM)                |          ✓          |                     |           |                           |                     |
| **Features**              |                     |                     |           |                           |                     |
| Over-run protection       |          ✓          |                     |           |                           |                     |
| Error handling            |          ✓          |                     |           |                           |          ✓          |
| Typescript typings        |          ✓          |         ✓            |           |                           |                     |
| Unref timers (optional)   |          ✓          |                     |           |          ✓                |                     |
| dom-OR-dow                |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| dom-AND-dow (optional)    |          ✓          |                     |           |                           |                     |
| Next run                  |          ✓          |          ✓          |           |           ✓               |          ✓          |
| Next n runs               |          ✓          |          ✓          |           |           ✓               |                     |
| Timezone                  |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Minimum interval          |          ✓          |                     |           |                           |                     |
| Controls (stop/resume)    |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Range (0-13)              |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Stepping (*/5)            |          ✓          |          ✓          |     ✓     |           ✓               |          ✓          |
| Last day of month (L)     |          ✓          |          ✓          |           |                           |                     |
