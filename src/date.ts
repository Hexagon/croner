import { createTimePoint, fromTZ, fromTZISO, toTZ } from "./helpers/timezone.ts";

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
class CronDate<T = undefined> {
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

  constructor(d?: CronDate<T> | Date | string | null, tz?: string | number) {
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
   * Calculates the nearest weekday (Mon-Fri) to a given day of the month.
   * Handles month boundaries.
   *
   * @param year The target year.
   * @param month The target month (0-11).
   * @param day The target day (1-31).
   * @returns The day of the month (1-31) that is the nearest weekday.
   */
  private getNearestWeekday(year: number, month: number, day: number): number {
    const date = new Date(Date.UTC(year, month, day));
    const weekday = date.getUTCDay(); // 0=Sun, 6=Sat

    if (weekday === 0) { // Sunday
      // If it's the last day of the month, go back to Friday
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      if (day === daysInMonth) {
        return day - 2;
      }
      // Otherwise, go forward to Monday
      return day + 1;
    }

    if (weekday === 6) { // Saturday
      // If it's the 1st, go forward to Monday
      if (day === 1) {
        return day + 2;
      }
      // Otherwise, go back to Friday
      return day - 1;
    }

    // It's already a weekday
    return day;
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
	 * use timezone utilities to convert input date object to target timezone
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
        try {
          const d = toTZ(inDate, this.tz);
          this.ms = inDate.getMilliseconds();
          this.second = d.s;
          this.minute = d.i;
          this.hour = d.h;
          this.day = d.d;
          this.month = d.m - 1;
          this.year = d.y;
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          throw new TypeError(
            `CronDate: Failed to convert date to timezone '${this.tz}'. ` +
              `This may happen with invalid timezone names or dates. Original error: ${errorMessage}`,
          );
        }
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
  private fromCronDate(d: CronDate<T>) {
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
      const inDate = fromTZISO(str);
      this.ms = inDate.getUTCMilliseconds();
      this.second = inDate.getUTCSeconds();
      this.minute = inDate.getUTCMinutes();
      this.hour = inDate.getUTCHours();
      this.day = inDate.getUTCDate();
      this.month = inDate.getUTCMonth();
      this.year = inDate.getUTCFullYear();
      this.apply();
    } else {
      return this.fromDate(fromTZISO(str, this.tz));
    }
  }

  /**
   * Find next match of current part
   */
  private findNext(
    options: CronOptions<T>,
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

      // Special case for nearest weekday
      // Special case for nearest weekday
      if (
        target === "day" && !match
      ) {
        // Iterate through all possible 'W' days in the pattern
        for (let dayWithW = 0; dayWithW < pattern.nearestWeekdays.length; dayWithW++) {
          // Check if the pattern specifies the 'W' modifier for this day
          if (pattern.nearestWeekdays[dayWithW]) {
            // Calculate the actual execution day for this 'W' day
            const executionDay = this.getNearestWeekday(this.year, this.month, dayWithW - offset);

            // Check if the day currently being evaluated by the outer loop is that execution day
            if (executionDay === (i - offset)) {
              match = 1;
              break; // Match found, no need to check other 'W' days
            }
          }
        }
      }

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

        // OCPS 1.4: If + modifier is used (useAndLogic), always use AND logic
        // Otherwise: If domAndDow is false (legacy OR mode), and dayOfMonth is specified - use "OR" to combine day of week with day of month
        // In all other cases use "AND"
        if (pattern.useAndLogic) {
          match = match && dowMatch;
        } else if (!options.domAndDow && !pattern.starDOM) {
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
   * Increment to next run time recursively.
   *
   * This function traverses the date components (year, month, day, hour, minute, second)
   * to find the next date and time that matches the cron pattern. It uses a recursive
   * approach to handle the dependencies between different components. For example,
   * if the day changes, the hour, minute, and second need to be reset.
   *
   * The recursion is limited to the year 10000 to prevent potential
   * infinite loops or excessive stack depth, and to match the maximum supported
   * year in OCPS 1.2 (years 1-9999).
   *
   * @param pattern The cron pattern used to determine the next run time.
   * @param options The cron options that influence the incrementing behavior.
   * @param doing The index of the `RecursionSteps` array indicating the current
   *              date component being processed. 0 represents "month", 1 represents "day", etc.
   *
   * @returns This `CronDate` instance for chaining, or null if incrementing
   *          was not possible (e.g., reached year 10000 limit or no matching date).
   *
   * @private
   */
  private recurse(
    pattern: CronPattern,
    options: CronOptions<T>,
    doing: number,
  ): CronDate<T> | null {
    // OCPS 1.2: Check if current year matches the year pattern at the start
    // Only check when year constraints exist and we're at month level
    if (doing === 0 && !pattern.starYear) {
      // If current year doesn't match, find the next matching year
      if (
        this.year >= 0 &&
        this.year < pattern.year.length &&
        pattern.year[this.year] === 0
      ) {
        // Find next matching year
        let foundYear = -1;
        for (let y = this.year + 1; y < pattern.year.length && y < 10000; y++) {
          if (pattern.year[y] === 1) {
            foundYear = y;
            break;
          }
        }

        if (foundYear === -1) {
          return null;
        }

        // Jump to the found year and reset to start of year
        this.year = foundYear;
        this.month = 0;
        this.day = 1;
        this.hour = 0;
        this.minute = 0;
        this.second = 0;
        this.ms = 0;
      }

      // Check if we've gone out of bounds
      if (this.year >= 10000) {
        return null;
      }
    }

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

        // OCPS 1.2: If we just incremented the year and have year constraints, check if it matches
        if (doing === 0 && !pattern.starYear) {
          // Keep incrementing year until we find a matching one
          while (
            this.year >= 0 &&
            this.year < pattern.year.length &&
            pattern.year[this.year] === 0 &&
            this.year < 10000
          ) {
            this.year++;
          }

          // Check if we've gone out of bounds
          if (this.year >= 10000 || this.year >= pattern.year.length) {
            return null;
          }
        }

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
      // Use a higher limit when year constraints exist, lower limit otherwise for performance
    } else if (pattern.starYear ? this.year >= 3000 : this.year >= 10000) {
      return null;

      // ... oh, go to next part then
    } else {
      return this.recurse(pattern, options, doing);
    }
  }

  /**
   * Increment to next run time
   *
   * @param pattern The pattern used to increment the current date.
   * @param options Cron options used for incrementing.
   * @param hasPreviousRun True if there was a previous run, false otherwise. This is used to determine whether to apply the minimum interval.
   * @returns This CronDate instance for chaining, or null if incrementing was not possible (e.g., reached year 3000 limit).
   */
  public increment(
    pattern: CronPattern,
    options: CronOptions<T>,
    hasPreviousRun: boolean,
  ): CronDate<T> | null {
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
   * Decrement to previous run time
   *
   * @param pattern The pattern used to decrement the current date.
   * @param options Cron options used for decrementing.
   * @returns This CronDate instance for chaining, or null if decrementing was not possible (e.g., reached year 0).
   */
  public decrement(
    pattern: CronPattern,
    options: CronOptions<T>,
  ): CronDate<T> | null {
    // Move to previous second, or decrement according to minimum interval indicated by option `interval: x`
    this.second -= (options.interval !== undefined && options.interval > 1) ? options.interval : 1;

    // Always reset milliseconds, so we are at the exact second
    this.ms = 0;

    // Make sure seconds has not gotten out of bounds (can be negative)
    this.apply();

    // Recursively change each part (y, m, d ...) until previous match is found, return null on failure
    return this.recurseBackward(pattern, options, 0);
  }

  /**
   * Find previous match by recursively checking pattern parts in reverse.
   *
   * This is the backward equivalent of the recurse() method. It searches backwards
   * through time to find the previous date/time that matches the cron pattern.
   *
   * @param pattern The cron pattern used to determine the previous run time.
   * @param options The cron options that influence the decrementing behavior.
   * @param doing The index of the `RecursionSteps` array indicating the current
   *              date component being processed.
   *
   * @returns This `CronDate` instance for chaining, or null if decrementing
   *          was not possible (e.g., reached year 0 or no matching date).
   *
   * @private
   */
  private recurseBackward(
    pattern: CronPattern,
    options: CronOptions<T>,
    doing: number,
  ): CronDate<T> | null {
    // OCPS 1.2: Check if current year matches the year pattern at the start
    // Only check when year constraints exist and we're at month level
    if (doing === 0 && !pattern.starYear) {
      // If current year doesn't match, find the previous matching year
      if (
        this.year >= 0 &&
        this.year < pattern.year.length &&
        pattern.year[this.year] === 0
      ) {
        // Find previous matching year
        let foundYear = -1;
        for (let y = this.year - 1; y >= 0; y--) {
          if (pattern.year[y] === 1) {
            foundYear = y;
            break;
          }
        }

        if (foundYear === -1) {
          return null;
        }

        // Jump to the found year and reset to end of year
        this.year = foundYear;
        this.month = 11;
        this.day = 31;
        this.hour = 23;
        this.minute = 59;
        this.second = 59;
        this.ms = 0;
      }

      // Check if we've gone out of bounds
      if (this.year < 0) {
        return null;
      }
    }

    // Find previous match for current component
    const res = this.findPrevious(
      options,
      RecursionSteps[doing][0],
      pattern,
      RecursionSteps[doing][2],
    );

    // Component changed
    if (res > 1) {
      // Flag following levels for reset to their maximum values
      let resetLevel = doing + 1;
      while (resetLevel < RecursionSteps.length) {
        // Reset to maximum valid value for each component
        const target = RecursionSteps[resetLevel][0];
        const offset = RecursionSteps[resetLevel][2];

        // Find the maximum valid value in the pattern
        const maxValue = this.getMaxPatternValue(target, pattern, offset);
        this[target] = maxValue;

        resetLevel++;
      }

      // Parent changed
      if (res === 3) {
        // Decrement parent
        this[RecursionSteps[doing][1]]--;

        // Apply to normalize the date (e.g., month -1 becomes December of previous year)
        this.apply();

        // Now reset current level to max based on the normalized date
        const target = RecursionSteps[doing][0];
        const offset = RecursionSteps[doing][2];
        const maxValue = this.getMaxPatternValue(target, pattern, offset);
        this[target] = maxValue;

        // Apply again to ensure the day is valid for the month
        this.apply();

        // OCPS 1.2: If we just decremented the year and have year constraints, check if it matches
        if (doing === 0 && !pattern.starYear) {
          // Keep decrementing year until we find a matching one
          while (
            this.year >= 0 &&
            this.year < pattern.year.length &&
            pattern.year[this.year] === 0
          ) {
            this.year--;
          }

          // Check if we've gone out of bounds
          if (this.year < 0) {
            return null;
          }
        }

        // Restart
        return this.recurseBackward(pattern, options, 0);
      } else if (this.apply()) {
        return this.recurseBackward(pattern, options, doing - 1);
      }
    }

    // Move to next level
    doing += 1;

    // Done?
    if (doing >= RecursionSteps.length) {
      return this;

      // ... or out of bounds ?
    } else if (this.year < 0) {
      return null;

      // ... oh, go to next part then
    } else {
      return this.recurseBackward(pattern, options, doing);
    }
  }

  /**
   * Get the maximum value in a pattern for a given target.
   * Used when resetting components during backward recursion.
   *
   * @param target The target component (second, minute, hour, day, month)
   * @param pattern The cron pattern
   * @param offset The offset to apply
   * @returns The maximum valid value for the target component
   *
   * @private
   */
  private getMaxPatternValue(
    target: RecursionTarget,
    pattern: CronPattern,
    offset: number,
  ): number {
    // Special handling for day when lastDayOfMonth is set
    if (target === "day" && pattern.lastDayOfMonth) {
      // Return the actual last day of the current month
      let lastDay;
      if (this.month !== 1) {
        lastDay = DaysOfMonth[this.month];
      } else {
        lastDay = new Date(Date.UTC(this.year, this.month + 1, 0, 0, 0, 0, 0)).getUTCDate();
      }
      return lastDay;
    }

    // Special handling for day with day-of-week patterns
    if (target === "day" && !pattern.starDOW) {
      // Get the actual last day of the current month as we need to check all days
      const lastDay = new Date(Date.UTC(this.year, this.month + 1, 0, 0, 0, 0, 0)).getUTCDate();
      return lastDay;
    }

    // Find the highest value in the pattern array that equals 1
    for (let i = pattern[target].length - 1; i >= 0; i--) {
      if (pattern[target][i]) {
        return i - offset;
      }
    }

    // Fallback: return the pattern length minus offset
    // This ensures we at least try searching from a reasonable upper bound
    return pattern[target].length - 1 - offset;
  }

  /**
   * Find previous match for a specific component going backwards in time.
   * This is the backward equivalent of the findNext() method.
   *
   * @param options Cron options
   * @param target Target property (second, minute, hour, day, month)
   * @param pattern Pattern to use
   * @param offset Offset to use
   * @returns Status code: 1 = same value matches, 2 = value changed to earlier value, 3 = no match found
   *
   * @private
   */
  private findPrevious(
    options: CronOptions<T>,
    target: RecursionTarget,
    pattern: CronPattern,
    offset: number,
  ): number {
    const originalTarget = this[target];

    // Pre-calculate last day of month if needed
    let lastDayOfMonth;
    if (pattern.lastDayOfMonth) {
      if (this.month !== 1) {
        lastDayOfMonth = DaysOfMonth[this.month];
      } else {
        lastDayOfMonth = new Date(Date.UTC(this.year, this.month + 1, 0, 0, 0, 0, 0)).getUTCDate();
      }
    }

    // Pre-calculate weekday if needed
    const fDomWeekDay = (!pattern.starDOW && target == "day")
      ? new Date(Date.UTC(this.year, this.month, 1, 0, 0, 0, 0)).getUTCDay()
      : undefined;

    // Search backwards from current value
    for (let i = this[target] + offset; i >= 0; i--) {
      let match: number = pattern[target][i];

      // Special case for nearest weekday
      if (target === "day" && !match) {
        for (let dayWithW = 0; dayWithW < pattern.nearestWeekdays.length; dayWithW++) {
          if (pattern.nearestWeekdays[dayWithW]) {
            const executionDay = this.getNearestWeekday(this.year, this.month, dayWithW - offset);
            if (executionDay === (i - offset)) {
              match = 1;
              break;
            }
          }
        }
      }

      // Special case for last day of month
      if (target === "day" && pattern.lastDayOfMonth && i - offset == lastDayOfMonth) {
        match = 1;
      }

      // Special case for day of week
      if (target === "day" && !pattern.starDOW) {
        let dowMatch = pattern.dayOfWeek[(fDomWeekDay! + ((i - offset) - 1)) % 7];

        // Extra check for nth weekday of month
        if (dowMatch && (dowMatch & ANY_OCCURRENCE)) {
          dowMatch = this.isNthWeekdayOfMonth(this.year, this.month, i - offset, dowMatch) ? 1 : 0;
        } else if (dowMatch) {
          throw new Error(`CronDate: Invalid value for dayOfWeek encountered. ${dowMatch}`);
        }

        // Apply logic based on pattern settings
        if (pattern.useAndLogic) {
          match = match && dowMatch;
        } else if (!options.domAndDow && !pattern.starDOM) {
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
        // Use timezone utilities to create a normal Date object, and return that.
      } else {
        return fromTZ(
          createTimePoint(
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
