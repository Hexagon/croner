---
title: "Pattern"
parent: "Usage"
nav_order: 2
---

# Pattern

---

Croner is fully compliant with the [Open Cron Pattern Specification (OCPS)](https://github.com/open-source-cron/ocps) versions 1.0 through 1.4. The expressions are based on Vixie Cron with powerful extensions:

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

*   **OCPS 1.2**: Optional second and year fields for enhanced precision:
	-   6-field format: `SECOND MINUTE HOUR DAY-OF-MONTH MONTH DAY-OF-WEEK`
	-   7-field format: `SECOND MINUTE HOUR DAY-OF-MONTH MONTH DAY-OF-WEEK YEAR`
	-   Supported year range: 1-9999

*   **OCPS 1.3**: Advanced calendar modifiers:
	-   *L*: Last day of month or last occurrence of a weekday. `L` in day-of-month = last day of month; `5#L` or `FRI#L` = last Friday of the month.
	-	*W*: Nearest weekday. `15W` triggers on the weekday closest to the 15th (moves to Friday if 15th is Saturday, Monday if 15th is Sunday). Won't cross month boundaries.
	-	*#*: Nth occurrence of a weekday. `5#2` = second Friday; `MON#1` = first Monday of the month.

*   **OCPS 1.4**: Enhanced logical control:
	-   *+*: Explicit AND logic modifier. Prefix the day-of-week field with `+` to require both day-of-month AND day-of-week to match. Example: `0 12 1 * +MON` only triggers when the 1st is also a Monday.
	-   *?*: Wildcard alias (behaves identically to `*`). **Non-portable**: Its use is discouraged in patterns intended for cross-system use. Supported in all fields for compatibility, but primarily meaningful in day-of-month and day-of-week fields.
	-   Proper DST handling: Jobs scheduled during DST gaps are skipped; jobs in DST overlaps run once at first occurrence.

*   Croner allows you to pass a JavaScript Date object or an ISO 8601 formatted string as a pattern. The scheduled function will trigger at the specified date/time and only once. If you use a timezone different from the local timezone, you should pass the ISO 8601 local time in the target location and specify the timezone using the options (2nd parameter).

*   By default, Croner uses OR logic for day-of-month and day-of-week (OCPS 1.0 compliant). Example: `0 20 1 * MON` triggers on the 1st of the month OR on Mondays. Use the `+` modifier (`0 20 1 * +MON`) or `{ domAndDow: true }` for AND logic (OCPS 1.4 compliant). For more information, see issue [#53](https://github.com/Hexagon/croner/issues/53).

| Field        | Required | Allowed values | Allowed special characters | Remarks                               |
|--------------|----------|----------------|----------------------------|---------------------------------------|
| Seconds      | Optional | 0-59           | * , - / ?                  | OCPS 1.2: Optional, defaults to 0    |
| Minutes      | Yes      | 0-59           | * , - / ?                  |                                       |
| Hours        | Yes      | 0-23           | * , - / ?                  |                                       |
| Day of Month | Yes      | 1-31           | * , - / ? L W              | L = last day, W = nearest weekday     |
| Month        | Yes      | 1-12 or JAN-DEC| * , - / ?                  |                                       |
| Day of Week  | Yes      | 0-7 or SUN-MON | * , - / ? L # +            | 0 and 7 = Sunday (standard mode)<br>1-7 = Sunday-Saturday (Quartz mode with `alternativeWeekdays: true`)<br># = nth occurrence (e.g. MON#2)<br>+ = AND logic modifier (OCPS 1.4) |
| Year         | Optional | 1-9999         | * , - /                    | OCPS 1.2: Optional, defaults to *    |

> Weekday and month names are case-insensitive. Both `MON` and `mon` work.
> When using `L` in the Day of Week field with a range, it affects all specified weekdays. For example, `5-6#L` means the last Friday and Saturday in the month.
> The `#` character specifies the "nth" weekday of the month. For example, `5#2` = second Friday, `MON#1` = first Monday.
> The `W` character operates within the current month and won't cross month boundaries. If the 1st is a Saturday, `1W` matches Monday the 3rd.
> The `+` modifier (OCPS 1.4) enforces AND logic: `0 12 1 * +MON` only runs when the 1st is also a Monday.
> **Quartz mode**: Enable `alternativeWeekdays: true` to use Quartz-style weekday numbering (1=Sunday, 2=Monday, ..., 7=Saturday) instead of the standard format (0=Sunday, 1=Monday, ..., 6=Saturday). This is useful for compatibility with Quartz cron expressions.

{ .note }

**OCPS 1.1**: Predefined schedule nicknames are supported:

| Nickname | Description |
| -------- | ----------- |
| \@yearly / \@annually | Run once a year, i.e.  "0 0 1 1 *". |
| \@monthly | Run once a month, i.e. "0 0 1 * *". |
| \@weekly | Run once a week, i.e.  "0 0 * * 0". |
| \@daily / \@midnight | Run once a day, i.e.   "0 0 * * *". |
| \@hourly | Run once an hour, i.e. "0 * * * *". |
