import { minitz } from "./helpers/minitz.ts";

import type { CronOptions as CronOptions } from "./options.ts";
import {
  ANY_OCCURRENCE,
  type CronPattern,
  LAST_OCCURRENCE,
  OCCURRENCE_BITMASKS,
} from "./pattern.ts";

/**
 * Constant defining the minimum number of days per month where index 0 = January etc.
 *
 * Used to look if a date _could be_ out of bounds. The "could be" part is why february is pinned to 28 days.
 *
 * @private
 *
 * @constant
 * @type {Number[]}
 */
const DaysOfMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Array of work to be done, consisting of subarrays described below:
 *
 * [
 *   First item is which member to process,
 *   Second item is which member to increment if we didn't find a mathch in current item,
 *   Third item is an offset. if months is handled 0-11 in js date object, and we get 1-12 from `this.minute`
 *   from pattern. Offset should be -1
 * ]
 */
type RecursionTarget = "month" | "day" | "hour" | "minute" | "second";
type RecursionTargetNext = RecursionTarget | "year";
type RecursionStep = [RecursionTarget, RecursionTargetNext, number];
const RecursionSteps: RecursionStep[] = [
  ["month", "year", 0],
  ["day", "month", -1],
  ["hour", "day", 0],
  ["minute", "hour", 0],
  ["second", "minute", 0],
];

/**
 * Converts date to CronDate
 *
 * @param d Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
 * @param tz String representation of target timezone in Europe/Stockholm format, or a number representing offset in minutes.
 */
class CronDate {
  tz: string | number | undefined;

  /**
   * Current milliseconds
   * @type {number}
   */
  ms!: number;

  /**
   * Current second (0-59), in local time or target timezone specified by `this.tz`
   * @type {number}
   */
  second!: number;

  /**
   * Current minute (0-59), in local time or target timezone specified by `this.tz`
   * @type {number}
   */
  minute!: number;

  /**
   * Current hour (0-23), in local time or target timezone specified by `this.tz`
   * @type {number}
   */
  hour!: number;

  /**
   * Current day (1-31), in local time or target timezone specified by `this.tz`
   * @type {number}
   */
  day!: number;

  /**
   * Current month (1-12), in local time or target timezone specified by `this.tz`
   * @type {number}
   */
  month!: number;
  /**
   * Current full year, in local time or target timezone specified by `this.tz`
   */
  year!: number;
  constructor(d?: CronDate | Date | string, tz?: string | number) {
    /**
     * TimeZone
     * @type {string|number|undefined}
     */
    this.tz = tz;

    // Populate object using input date, or throw
    if (d && d instanceof Date) {
      if (!isNaN(d as unknown as number)) {
        this.fromDate(d);
      } else {
        throw new TypeError("CronDate: Invalid date passed to CronDate constructor");
      }
    } else if (d === void 0) {
      this.fromDate(new Date());
    } else if (d && typeof d === "string") {
      this.fromString(d);
    } else if (d instanceof CronDate) {
      this.fromCronDate(d);
    } else {
      throw new TypeError(
        "CronDate: Invalid type (" + typeof d + ") passed to CronDate constructor",
      );
    }
  }

  /**
   * Check if the given date is the nth occurrence of a weekday in its month.
   *
   * @param year The year.
   * @param month The month (0 for January, 11 for December).
   * @param day The day of the month.
   * @param nth The nth occurrence (bitmask).
   *
   * @return True if the date is the nth occurrence of its weekday, false otherwise.
   */
  private isNthWeekdayOfMonth(year: number, month: number, day: number, nth: number): boolean {
    const date = new Date(Date.UTC(year, month, day));
    const weekday = date.getUTCDay();

    // Count occurrences of the weekday up to and including the current date
    let count = 0;
    for (let d = 1; d <= day; d++) {
      if (new Date(Date.UTC(year, month, d)).getUTCDay() === weekday) {
        count++;
      }
    }

    // Check for nth occurrence
    if (nth & ANY_OCCURRENCE && OCCURRENCE_BITMASKS[count - 1] & nth) {
      return true;
    }

    // Check for last occurrence
    if (nth & LAST_OCCURRENCE) {
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      for (let d = day + 1; d <= daysInMonth; d++) {
        if (new Date(Date.UTC(year, month, d)).getUTCDay() === weekday) {
          return false; // There's another occurrence of the same weekday later in the month
        }
      }
      return true; // The current date is the last occurrence of the weekday in the month
    }

    return false;
  }

  /**
   * Sets internals using a Date
   */
  private fromDate(inDate: Date) {
    /* If this instance of CronDate has a target timezone set,
	 * use minitz to convert input date object to target timezone
	 * before extracting hours, minutes, seconds etc.
	 *
	 * If not, extract all parts from inDate as-is.
	 */
    if (this.tz !== void 0) {
      if (typeof this.tz === "number") {
        this.ms = inDate.getUTCMilliseconds();
        this.second = inDate.getUTCSeconds();
        this.minute = inDate.getUTCMinutes() + this.tz;
        this.hour = inDate.getUTCHours();
        this.day = inDate.getUTCDate();
        this.month = inDate.getUTCMonth();
        this.year = inDate.getUTCFullYear();
        // Minute could be out of bounds, apply
        this.apply();
      } else {
        const d = minitz.toTZ(inDate, this.tz);
        this.ms = inDate.getMilliseconds();
        this.second = d.s;
        this.minute = d.i;
        this.hour = d.h;
        this.day = d.d;
        this.month = d.m - 1;
        this.year = d.y;
      }
    } else {
      this.ms = inDate.getMilliseconds();
      this.second = inDate.getSeconds();
      this.minute = inDate.getMinutes();
      this.hour = inDate.getHours();
      this.day = inDate.getDate();
      this.month = inDate.getMonth();
      this.year = inDate.getFullYear();
    }
  }

  /**
   * Sets internals by deep copying another CronDate
   *
   * @param {CronDate} d - Input date
   */
  private fromCronDate(d: CronDate) {
    this.tz = d.tz;
    this.year = d.year;
    this.month = d.month;
    this.day = d.day;
    this.hour = d.hour;
    this.minute = d.minute;
    this.second = d.second;
    this.ms = d.ms;
  }

  /**
   * Reset internal parameters (seconds, minutes, hours) if any of them have exceeded (or could have exceeded) their normal ranges
   *
   * Will alway return true on february 29th, as that is a date that _could_ be out of bounds
   */
  private apply() {
    // If any value could be out of bounds, apply
    if (
      this.month > 11 || this.day > DaysOfMonth[this.month] || this.hour > 59 || this.minute > 59 ||
      this.second > 59 || this.hour < 0 || this.minute < 0 || this.second < 0
    ) {
      const d = new Date(
        Date.UTC(this.year, this.month, this.day, this.hour, this.minute, this.second, this.ms),
      );
      this.ms = d.getUTCMilliseconds();
      this.second = d.getUTCSeconds();
      this.minute = d.getUTCMinutes();
      this.hour = d.getUTCHours();
      this.day = d.getUTCDate();
      this.month = d.getUTCMonth();
      this.year = d.getUTCFullYear();
      return true;
    } else {
      return false;
    }
  }

  /**
   * Sets internals by parsing a string
   */
  private fromString(str: string) {
    if (typeof this.tz === "number") {
      // Parse without timezone
      const inDate = minitz.fromTZISO(str, "UTC");
      this.ms = inDate.getUTCMilliseconds();
      this.second = inDate.getUTCSeconds();
      this.minute = inDate.getUTCMinutes();
      this.hour = inDate.getUTCHours();
      this.day = inDate.getUTCDate();
      this.month = inDate.getUTCMonth();
      this.year = inDate.getUTCFullYear();
      this.apply();
    } else if (this.tz === undefined) {
      return this.fromDate(minitz.fromTZISO(str, this.tz === undefined ? "UTC" : this.tz));
    }
  }

  /**
   * Find next match of current part
   */
  private findNext(
    options: CronOptions,
    target: RecursionTarget,
    pattern: CronPattern,
    offset: number,
  ): number {
    const originalTarget = this[target];

    // In the conditions below, local time is not relevant. And as new Date(Date.UTC(y,m,d)) is way faster
    // than new Date(y,m,d). We use the UTC functions to set/get date parts.

    // Pre-calculate last day of month if needed
    let lastDayOfMonth;
    if (pattern.lastDayOfMonth) {
      // This is an optimization for every month except february, which has different number of days different years
      if (this.month !== 1) {
        lastDayOfMonth = DaysOfMonth[this.month]; // About 20% performance increase when using L
      } else {
        lastDayOfMonth = new Date(Date.UTC(this.year, this.month + 1, 0, 0, 0, 0, 0)).getUTCDate();
      }
    }

    // Pre-calculate weekday if needed
    // Calculate offset weekday by ((fDomWeekDay + (targetDate - 1)) % 7)
    const fDomWeekDay = (!pattern.starDOW && target == "day")
      ? new Date(Date.UTC(this.year, this.month, 1, 0, 0, 0, 0)).getUTCDay()
      : undefined;

    for (let i = this[target] + offset; i < pattern[target].length; i++) {
      // this applies to all "levels"
      let match: number = pattern[target][i];

      // Special case for last day of month
      if (target === "day" && pattern.lastDayOfMonth && i - offset == lastDayOfMonth) {
        match = 1;
      }

      // Special case for day of week
      if (target === "day" && !pattern.starDOW) {
        let dowMatch = pattern.dayOfWeek[(fDomWeekDay! + ((i - offset) - 1)) % 7];

        // Extra check for nth weekday of month
        // 0b011111 === All occurences of weekday in month
        // 0b100000 === Last occurence of weekday in month
        if (dowMatch && (dowMatch & ANY_OCCURRENCE)) {
          dowMatch = this.isNthWeekdayOfMonth(this.year, this.month, i - offset, dowMatch) ? 1 : 0;
        } else if (dowMatch) {
          throw new Error(`CronDate: Invalid value for dayOfWeek encountered. ${dowMatch}`);
        }

        // If we use legacyMode, and dayOfMonth is specified - use "OR" to combine day of week with day of month
        // In all other cases use "AND"
        if (options.legacyMode && !pattern.starDOM) {
          match = match || dowMatch;
        } else {
          match = match && dowMatch;
        }
      }

      if (match) {
        this[target] = i - offset;

        // Return 2 if changed, 1 if unchanged
        return (originalTarget !== this[target]) ? 2 : 1;
      }
    }

    // Return 3 if part was not matched
    return 3;
  }

  /**
   * Increment to next run time recursively
   *
   * This function is currently capped at year 3000. Do you have a reason to go further? Open an issue on GitHub!
   *
   * @param pattern The pattern used to increment current state
   * @param options Cron options used for incrementing
   * @param doing Which part to increment, 0 represent first item of RecursionSteps-array etc.
   * @return Returns itthis for chaining, or null if increment wasnt possible
   */
  private recurse(pattern: CronPattern, options: CronOptions, doing: number): CronDate | null {
    // Find next month (or whichever part we're at)
    const res = this.findNext(options, RecursionSteps[doing][0], pattern, RecursionSteps[doing][2]);

    // Month (or whichever part we're at) changed
    if (res > 1) {
      // Flag following levels for reset
      let resetLevel = doing + 1;
      while (resetLevel < RecursionSteps.length) {
        this[RecursionSteps[resetLevel][0]] = -RecursionSteps[resetLevel][2];
        resetLevel++;
      }
      // Parent changed
      if (res === 3) {
        // Do increment parent, and reset current level
        this[RecursionSteps[doing][1]]++;
        this[RecursionSteps[doing][0]] = -RecursionSteps[doing][2];
        this.apply();

        // Restart
        return this.recurse(pattern, options, 0);
      } else if (this.apply()) {
        return this.recurse(pattern, options, doing - 1);
      }
    }

    // Move to next level
    doing += 1;

    // Done?
    if (doing >= RecursionSteps.length) {
      return this;

      // ... or out of bounds ?
    } else if (this.year >= 3000) {
      return null;

      // ... oh, go to next part then
    } else {
      return this.recurse(pattern, options, doing);
    }
  }

  /**
   * Increment to next run time
   *
   * @param pattern The pattern used to increment current state
   * @param options Cron options used for incrementing
   * @param hasPreviousRun If this run should adhere to minimum interval
   * @return Returns itthis for chaining, or null if increment wasnt possible
   */
  public increment(
    pattern: CronPattern,
    options: CronOptions,
    hasPreviousRun: boolean,
  ): CronDate | null {
    // Move to next second, or increment according to minimum interval indicated by option `interval: x`
    // Do not increment a full interval if this is the very first run
    this.second += (options.interval !== undefined && options.interval > 1 && hasPreviousRun)
      ? options.interval
      : 1;

    // Always reset milliseconds, so we are at the next second exactly
    this.ms = 0;

    // Make sure seconds has not gotten out of bounds
    this.apply();

    // Recursively change each part (y, m, d ...) until next match is found, return null on failure
    return this.recurse(pattern, options, 0);
  }

  /**
   * Convert current state back to a javascript Date()
   *
   * @param internal If this is an internal call
   */
  public getDate(internal?: boolean): Date {
    // If this is an internal call, return the date as is
    // Also use this option when no timezone or utcOffset is set
    if (internal || this.tz === void 0) {
      return new Date(
        this.year,
        this.month,
        this.day,
        this.hour,
        this.minute,
        this.second,
        this.ms,
      );
    } else {
      // If .tz is a number, it indicates offset in minutes. UTC timestamp of the internal date objects will be off by the same number of minutes.
      // Restore this, and return a date object with correct time set.
      if (typeof this.tz === "number") {
        return new Date(
          Date.UTC(
            this.year,
            this.month,
            this.day,
            this.hour,
            this.minute - this.tz,
            this.second,
            this.ms,
          ),
        );

        // If .tz is something else (hopefully a string), it indicates the timezone of the "local time" of the internal date object
        // Use minitz to create a normal Date object, and return that.
      } else {
        return minitz.fromTZ(
          minitz.tp(
            this.year,
            this.month + 1,
            this.day,
            this.hour,
            this.minute,
            this.second,
            this.tz,
          ),
          false,
        );
      }
    }
  }

  /**
   * Convert current state back to a javascript Date() and return UTC milliseconds
   */
  public getTime(): number {
    return this.getDate(false).getTime();
  }
}

export { CronDate };
