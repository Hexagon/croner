---
title: "Pattern"
parent: "Usage"
nav_order: 2
---

# Pattern

---

{% include multiplex.html %}

The expressions used by Croner are very similar to those of Vixie Cron, but with a few additions and changes as outlined below:

```ts
// ┌──────────────── (optional) second (0 - 59)
// │ ┌────────────── minute (0 - 59)
// │ │ ┌──────────── hour (0 - 23)
// │ │ │ ┌────────── day of month (1 - 31)
// │ │ │ │ ┌──────── month (1 - 12, JAN-DEC)
// │ │ │ │ │ ┌────── day of week (0 - 6, SUN-Mon) 
// │ │ │ │ │ │       (0 to 6 are Sunday to Saturday; 7 is Sunday, the same as 0)
// │ │ │ │ │ │
// * * * * * *
```

*   Croner expressions have the following additional modifiers:
	-   *?*: The question mark is substituted with the time of initialization. For example, ? ? * * * * would be substituted with 25 8 * * * * if the time is <any hour>:08:25 at the time of new Cron('? ? * * * *', <...>). The question mark can be used in any field.
	-   *L*: The letter 'L' can be used in the day of the month field to indicate the last day of the month. When used in the day of the week field in conjunction with the # character, it denotes the last specific weekday of the month. For example, `5#L` represents the last Friday of the month.
	-	*#*: The # character specifies the "nth" occurrence of a particular day within a month. For example, supplying 
	`5#2` in the day of week field signifies the second Friday of the month. This can be combined with ranges and supports day names. For instance, MON-FRI#2 would match the Monday through Friday of the second week of the month.

*   Croner allows you to pass a JavaScript Date object or an ISO 8601 formatted string as a pattern. The scheduled function will trigger at the specified date/time and only once. If you use a timezone different from the local timezone, you should pass the ISO 8601 local time in the target location and specify the timezone using the options (2nd parameter).

*   Croner also allows you to change how the day-of-week and day-of-month conditions are combined. By default, Croner (and Vixie cron) will trigger when either the day-of-month OR the day-of-week conditions match. For example, `0 20 1 * MON` will trigger on the first of the month as well as each Monday. If you want to use AND (so that it only triggers on Mondays that are also the first of the month), you can pass `{ legacyMode: false }`. For more information, see issue [#53](https://github.com/Hexagon/croner/issues/53).

| Field        | Required | Allowed values | Allowed special characters | Remarks                               |
|--------------|----------|----------------|----------------------------|---------------------------------------|
| Seconds      | Optional | 0-59           | * , - / ?                  |                                       |
| Minutes      | Yes      | 0-59           | * , - / ?                  |                                       |
| Hours        | Yes      | 0-23           | * , - / ?                  |                                       |
| Day of Month | Yes      | 1-31           | * , - / ? L                |                                       |
| Month        | Yes      | 1-12 or JAN-DEC| * , - / ?                  |                                       |
| Day of Week  | Yes      | 0-7 or SUN-MON | * , - / ? L #               | 0 to 6 are Sunday to Saturday<br>7 is Sunday, the same as 0<br># is used to specify nth occurrence of a weekday            |

> Weekday and month names are case-insensitive. Both `MON` and `mon` work.
> When using `L` in the Day of Week field, it affects all specified weekdays. For example, `5-6#L` means the last Friday and Saturday in the month."
> The # character can be used to specify the "nth" weekday of the month. For example, 5#2 represents the second Friday of the month.
{ .note }

It is also possible to use the following "nicknames" as pattern.

| Nickname | Description |
| -------- | ----------- |
| \@yearly | Run once a year, ie.  "0 0 1 1 *". |
| \@annually | Run once a year, ie.  "0 0 1 1 *". |
| \@monthly | Run once a month, ie. "0 0 1 * *". |
| \@weekly | Run once a week, ie.  "0 0 * * 0". |
| \@daily | Run once a day, ie.   "0 0 * * *". |
| \@hourly | Run once an hour, ie. "0 * * * *". |
