---
layout: page
title: "Pattern"
parent: "Usage"
nav_order: 2
---

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

{: .note }
> Weekday and month names are case-insensitive. Both `MON` and `mon` work.
> When using `L` in the Day of Week field, it affects all specified weekdays. For example, `L5,6` means the last Friday and Saturday in the month.
