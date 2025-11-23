// deno-lint-ignore-file ban-types
/* ------------------------------------------------------------------------------------

  Croner - MIT License - Hexagon <github.com/Hexagon>

  Pure JavaScript Isomorphic cron parser and scheduler without dependencies.

  ------------------------------------------------------------------------------------

  License:

	Copyright (c) 2015-2024 Hexagon <github.com/Hexagon>

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.

  ------------------------------------------------------------------------------------  */
import { CronDate } from "./date.ts";
import { CronPattern } from "./pattern.ts";
import { type CronOptions, CronOptionsHandler } from "./options.ts";
import { isCronCallback, isFunction, unrefTimer } from "./utils.ts";

/**
 * Many JS engines stores the delay as a 32-bit signed integer internally.
 * This causes an integer overflow when using delays larger than 2147483647,
 * resulting in the timeout being executed immediately.
 *
 * All JS engines implements an immediate execution of delays larger that a 32-bit
 * int to keep the behaviour concistent.
 *
 * With this in mind, the absolute maximum value to use is
 *
 * const maxDelay = Math.pow(2, 32 - 1) - 1
 *
 * But due to a problem with certain javascript engines not behaving well when the
 * computer is suspended, we'll never wait more than 30 seconds between each trigger.
 */
const maxDelay: number = 30 * 1000;

/**
 * An array containing all named cron jobs.
 */
// deno-lint-ignore no-explicit-any
const scheduledJobs: Cron<any>[] = [];

/**
 * Encapsulate all internal states in the Cron instance.
 * Duplicate all options that can change to internal states, for example maxRuns and paused.
 */
type CronState<T = undefined> = {
  kill: boolean;
  blocking: boolean;
  /**
   * Start time of previous trigger, updated after each trigger
   *
   * Stored to use as the actual previous run, even while a new trigger
   * is started. Used by the public funtion `.previousRun()`
   */
  previousRun: CronDate<T> | undefined;
  /**
   * Start time of current trigger, this is updated just before triggering
   *
   * This is used internally as "previous run", as we mostly want to know
   * when the previous run _started_
   */
  currentRun: CronDate<T> | undefined;
  once: CronDate<T> | undefined;
  //@ts-ignore Cross Runtime
  currentTimeout: NodeJS.Timeout | number | undefined;
  maxRuns: number | undefined;
  paused: boolean | undefined;
  pattern: CronPattern;
};

/**
 * Callback function type
 *
 * @param self - Reference to the Cron instance that triggered the callback
 * @param context - Optional context value passed through options.context
 *
 * @returns void or Promise<void> for async callbacks
 */
export type CronCallback<T = undefined> = (
  self: InstanceType<typeof Cron<T>>,
  context: T,
) => void | Promise<void>;

/**
 * Cron entrypoint
 *
 * @constructor
 * @param pattern - Input pattern, input date, or input ISO 8601 time string
 * @param [fnOrOptions1] - Options or function to be run each iteration of pattern
 * @param [fnOrOptions2] - Options or function to be run each iteration of pattern
 */
class Cron<T = undefined> {
  name: string | undefined;
  options: CronOptions<T>;
  private _states: CronState<T>;
  private fn?: CronCallback<T>;
  /**
   * Internal helper to get the timezone or UTC offset for date operations.
   * Reduces duplication of `this.options.timezone || this.options.utcOffset` throughout the codebase.
   *
   * @returns The timezone string or UTC offset number
   * @private
   */
  private getTz(): string | number | undefined {
    return this.options.timezone || this.options.utcOffset;
  }

  /**
   * Internal helper to apply dayOffset to a date if configured.
   * Reduces duplication of dayOffset calculation logic.
   *
   * @param date - The base date to apply offset to
   * @returns The date with dayOffset applied, or the original date if no offset is configured
   * @private
   */
  private applyDayOffset(date: Date): Date {
    if (this.options.dayOffset !== undefined && this.options.dayOffset !== 0) {
      const offsetMs = this.options.dayOffset * 24 * 60 * 60 * 1000;
      return new Date(date.getTime() + offsetMs);
    }
    return date;
  }

  constructor(
    pattern: string | Date,
    fnOrOptions1?: CronOptions<T> | CronCallback<T>,
    fnOrOptions2?: CronOptions<T> | CronCallback<T>,
  ) {
    // Make options and func optional and interchangable
    let options: CronOptions<T> | undefined;
    let func: CronCallback<T> | undefined;

    if (isFunction(fnOrOptions1)) {
      func = fnOrOptions1 as CronCallback<T>;
    } else if (typeof fnOrOptions1 === "object") {
      options = fnOrOptions1 as CronOptions<T>;
    } else if (fnOrOptions1 !== void 0) {
      throw new Error(
        "Cron: Invalid argument passed for optionsIn. Should be one of function, or object (options).",
      );
    }

    if (isFunction(fnOrOptions2)) {
      func = fnOrOptions2 as CronCallback<T>;
    } else if (typeof fnOrOptions2 === "object") {
      options = fnOrOptions2 as CronOptions<T>;
    } else if (fnOrOptions2 !== void 0) {
      throw new Error(
        "Cron: Invalid argument passed for funcIn. Should be one of function, or object (options).",
      );
    }

    this.name = options?.name;
    this.options = CronOptionsHandler<T>(options);

    this._states = {
      kill: false,
      blocking: false,
      previousRun: void 0,
      currentRun: void 0,
      once: void 0,
      currentTimeout: void 0,
      maxRuns: options ? options.maxRuns : void 0,
      paused: options ? options.paused : false,
      // Default pattern uses "auto" mode to avoid validation issues
      pattern: new CronPattern("* * * * *", undefined, {
        mode: "auto",
      }),
    };

    // Check if we got a date, or a pattern supplied as first argument
    // Then set either this._states.once or this._states.pattern
    if (
      pattern &&
      (pattern instanceof Date || ((typeof pattern === "string") && pattern.indexOf(":") > 0))
    ) {
      this._states.once = new CronDate<T>(pattern, this.getTz());
    } else {
      this._states.pattern = new CronPattern(pattern as string, this.options.timezone, {
        mode: this.options.mode,
        alternativeWeekdays: this.options.alternativeWeekdays,
        sloppyRanges: this.options.sloppyRanges,
      });
    }

    // Only store the job in scheduledJobs if a name is specified in the options.
    if (this.name) {
      const existing = scheduledJobs.find((j) => j.name === this.name);
      if (existing) {
        throw new Error(
          "Cron: Tried to initialize new named job '" + this.name + "', but name already taken.",
        );
      } else {
        scheduledJobs.push(this as Cron<unknown>);
      }
    }

    // Allow shorthand scheduling
    if (func !== void 0 && isCronCallback(func)) {
      this.fn = func;
      this.schedule();
    }

    return this;
  }

  /**
   * Find next runtime, based on supplied date. Strips milliseconds.
   *
   * @param prev - Optional. Date to start from. Can be a CronDate, Date object, or a string representing a date.
   * @returns The next run time as a Date object, or null if there is no next run.
   */
  public nextRun(prev?: CronDate<T> | Date | string | null): Date | null {
    const next = this._next(prev);
    if (!next) return null;

    return this.applyDayOffset(next.getDate(false));
  }

  /**
   * Find next n runs, based on supplied date. Strips milliseconds.
   *
   * @param n - Number of runs to enumerate
   * @param previous - Date to start from
   * @returns - Next n run times
   */
  public nextRuns(n: number, previous?: Date | string): Date[] {
    if (this._states.maxRuns !== undefined && n > this._states.maxRuns) {
      n = this._states.maxRuns;
    }
    const startingDate = previous || this._states.currentRun || undefined;
    return this._enumerateRuns(n, startingDate, "next");
  }

  /**
   * Find previous n runs, based on supplied date. Strips milliseconds.
   *
   * @param n - Number of runs to enumerate
   * @param reference - Date to start from (defaults to now)
   * @returns - Previous n run times in reverse chronological order (most recent first)
   */
  public previousRuns(n: number, reference?: Date | string): Date[] {
    return this._enumerateRuns(n, reference || undefined, "previous");
  }

  /**
   * Internal helper to enumerate runs in either direction.
   *
   * @param n - Number of runs to enumerate
   * @param startDate - Date to start from
   * @param direction - Direction to enumerate ("next" or "previous")
   * @returns Array of run times with dayOffset applied
   * @private
   */
  private _enumerateRuns(
    n: number,
    startDate: CronDate<T> | Date | string | undefined | null,
    direction: "next" | "previous",
  ): Date[] {
    const enumeration: Date[] = [];
    // Normalize startDate to CronDate or null so type is narrowed before loop
    let currentCron: CronDate<T> | null = startDate
      ? new CronDate<T>(startDate, this.getTz())
      : null;

    const findMethod = direction === "next" ? this._next : this._previous;

    while (n--) {
      const nextCron = findMethod.call(this, currentCron);
      if (!nextCron) break;

      // Apply dayOffset if needed when pushing to result array
      const baseDate = nextCron.getDate(false);
      enumeration.push(this.applyDayOffset(baseDate));

      // Continue enumeration from the unmodified CronDate
      currentCron = nextCron;
    }

    return enumeration;
  }

  /**
   * Check if a given date matches the cron pattern
   *
   * @param date - Date to check. Can be a Date object or a string representing a date.
   * @returns true if the date matches the pattern, false otherwise
   */
  public match(date: Date | string): boolean {
    // Handle one-off jobs (created with a specific date/time)
    if (this._states.once) {
      const checkDate = new CronDate<T>(date, this.getTz());
      // Strip milliseconds for comparison
      checkDate.ms = 0;
      const onceDate = new CronDate<T>(
        this._states.once,
        this.getTz(),
      );
      onceDate.ms = 0;
      return checkDate.getTime() === onceDate.getTime();
    }

    // For pattern-based jobs, check if the date matches the pattern
    const cronDate = new CronDate<T>(date, this.getTz());

    // Strip milliseconds (Croner operates on second precision)
    cronDate.ms = 0;

    return cronDate.match(this._states.pattern, this.options);
  }

  /**
   * Return the original pattern, if there was one
   *
   * @returns Original pattern
   */
  public getPattern(): string | undefined {
    return this._states.pattern ? this._states.pattern.pattern : void 0;
  }

  /**
   * Indicates whether or not the cron job is scheduled and running, e.g. awaiting next trigger
   *
   * @returns Running or not
   */
  public isRunning(): boolean {
    const nextRunTime = this.nextRun(this._states.currentRun);

    const isRunning = !this._states.paused;
    const isScheduled = this.fn !== void 0;
    // msLeft will be null if _states.kill is set to true, so we don't need to check this one, but we do anyway...
    const notIsKilled = !this._states.kill;

    return isRunning && isScheduled && notIsKilled && nextRunTime !== null;
  }

  /**
   * Indicates whether or not the cron job is permanently stopped
   *
   * @returns Running or not
   */
  public isStopped(): boolean {
    return this._states.kill;
  }

  /**
   * Indicates whether or not the cron job is currently working
   *
   * @returns Running or not
   */
  public isBusy(): boolean {
    return this._states.blocking;
  }

  /**
   * Return current/previous run start time
   *
   * @returns Current (if running) or previous run time
   */
  public currentRun(): Date | null {
    return this._states.currentRun ? this._states.currentRun.getDate() : null;
  }

  /**
   * Return previous run start time
   *
   * @returns Previous run time
   */
  public previousRun(): Date | null {
    return this._states.previousRun ? this._states.previousRun.getDate() : null;
  }

  /**
   * Returns number of milliseconds to next run
   *
   * @param prev Starting date, defaults to now - minimum interval
   */
  public msToNext(prev?: CronDate<T> | Date | string): number | null {
    // Get next run time
    const next = this._next(prev);

    if (next) {
      if (prev instanceof CronDate || prev instanceof Date) {
        return (next.getTime() - prev.getTime());
      } else {
        return (next.getTime() - new CronDate<T>(prev).getTime());
      }
    } else {
      return null;
    }
  }

  /**
   * Stop execution
   *
   * Running this will forcefully stop the job, and prevent furter exection. `.resume()` will not work after stopping.
   * It will also be removed from the scheduledJobs array if it were named.
   */
  public stop(): void {
    // If there is a job in progress, it will finish gracefully ...

    // Flag as killed
    this._states.kill = true;

    // Stop any waiting timer
    if (this._states.currentTimeout) {
      clearTimeout(this._states.currentTimeout as number);
    }

    // Remove job from the scheduledJobs array to free up the name, and allow the job to be
    // garbage collected
    const jobIndex = scheduledJobs.indexOf(this as Cron<unknown>);
    if (jobIndex >= 0) {
      scheduledJobs.splice(jobIndex, 1);
    }
  }

  /**
   * Pause execution
   *
   * @returns Wether pause was successful
   */
  public pause(): boolean {
    this._states.paused = true;

    return !this._states.kill;
  }

  /**
   * Resume execution
   *
   * @returns Wether resume was successful
   */
  public resume(): boolean {
    this._states.paused = false;

    return !this._states.kill;
  }

  /**
   * Schedule a new job
   *
   * @param func - Function to be run each iteration of pattern
   */
  public schedule(func?: CronCallback<T>): Cron<T> {
    // If a function is already scheduled, bail out
    if (func && this.fn) {
      throw new Error(
        "Cron: It is not allowed to schedule two functions using the same Croner instance.",
      );

      // Update function if passed
    } else if (func) {
      this.fn = func;
    }

    // Get actual ms to next run, bail out early if any of them is null (no next run)
    let waitMs = this.msToNext();

    // Get the target date based on previous run
    const target = this.nextRun(this._states.currentRun);

    // isNaN added to prevent infinite loop
    if (waitMs === null || waitMs === undefined || isNaN(waitMs) || target === null) return this;

    // setTimeout cant handle more than Math.pow(2, 32 - 1) - 1 ms
    if (waitMs > maxDelay) {
      waitMs = maxDelay;
    }

    // Start the timer loop
    // _checkTrigger will either call _trigger (if it's time, croner isn't paused and whatever),
    // or recurse back to this function to wait for next trigger
    this._states.currentTimeout = setTimeout(() => this._checkTrigger(target), waitMs);

    // If unref option is set - unref the current timeout, which allows the process to exit even if there is a pending schedule
    if (this._states.currentTimeout && this.options.unref) {
      unrefTimer(this._states.currentTimeout);
    }

    return this;
  }

  /**
   * Internal function to trigger a run, used by both scheduled and manual trigger
   */
  private async _trigger(initiationDate?: Date) {
    this._states.blocking = true;

    this._states.currentRun = new CronDate<T>(
      void 0, // We should use initiationDate, but that does not play well with fake timers in third party tests. In real world there is not much difference though */
      this.getTz(),
    );

    if (this.options.catch) {
      try {
        if (this.fn !== undefined) {
          await this.fn(this, this.options.context as T);
        }
      } catch (_e) {
        if (isFunction(this.options.catch)) {
          (this.options.catch as Function)(_e, this);
        }
      }
    } else {
      // Trigger the function without catching
      if (this.fn !== undefined) {
        await this.fn(this, this.options.context as T);
      }
    }

    this._states.previousRun = new CronDate<T>(
      initiationDate,
      this.getTz(),
    );

    this._states.blocking = false;
  }

  /**
   * Trigger a run manually
   */
  public async trigger() {
    await this._trigger();
  }

  /**
   * Returns number of runs left, undefined = unlimited
   */
  public runsLeft(): number | undefined {
    return this._states.maxRuns;
  }

  /**
   * Called when it's time to trigger.
   * Checks if all conditions are currently met,
   * then instantly triggers the scheduled function.
   */
  private _checkTrigger(target: Date) {
    const now = new Date(),
      shouldRun = !this._states.paused && now.getTime() >= target.getTime(),
      isBlocked = this._states.blocking && this.options.protect;

    if (shouldRun && !isBlocked) {
      if (this._states.maxRuns !== undefined) {
        this._states.maxRuns--;
      }

      // We do not await this
      this._trigger();
    } else {
      // If this trigger were blocked, and protect is a function, trigger protect (without awaiting it, even if it's an synchronous function)
      if (shouldRun && isBlocked && isFunction(this.options.protect)) {
        setTimeout(() => (this.options.protect as Function)(this), 0);
      }
    }

    // Always reschedule
    this.schedule();
  }

  /**
   * Internal version of next. Cron needs millseconds internally, hence _next.
   */
  private _next(previousRun?: CronDate<T> | Date | string | null) {
    let hasPreviousRun = (previousRun || this._states.currentRun) ? true : false;

    // If no previous run, and startAt and interval is set, calculate when the last run should have been
    let startAtInFutureWithInterval = false;
    if (!previousRun && this.options.startAt && this.options.interval) {
      [previousRun, hasPreviousRun] = this._calculatePreviousRun(previousRun, hasPreviousRun);
      startAtInFutureWithInterval = (!previousRun) ? true : false;
    }

    // Ensure previous run is a CronDate
    previousRun = new CronDate<T>(previousRun, this.getTz());

    // Previous run should never be before startAt
    if (
      this.options.startAt && previousRun &&
      previousRun.getTime() < (this.options.startAt as CronDate<T>).getTime()
    ) {
      previousRun = this.options.startAt;
    }

    // Calculate next run according to pattern or one-off timestamp, pass actual previous run to increment
    let nextRun: CronDate<T> | null = this._states.once ||
      new CronDate<T>(previousRun, this.getTz());

    // if the startAt is in the future and the interval is set, then the prev is already set to the startAt, so there is no need to increment it
    if (!startAtInFutureWithInterval && nextRun !== this._states.once) {
      nextRun = nextRun.increment(
        this._states.pattern,
        this.options,
        hasPreviousRun, // hasPreviousRun is used to allow
      );
    }

    if (
      this._states.once && this._states.once.getTime() <= (previousRun as CronDate<T>).getTime()
    ) {
      return null;
    } else if (
      (nextRun === null) ||
      (this._states.maxRuns !== undefined && this._states.maxRuns <= 0) ||
      (this._states.kill) ||
      (this.options.stopAt && nextRun.getTime() >= (this.options.stopAt as CronDate<T>).getTime())
    ) {
      return null;
    } else {
      // All seem good, return next run
      return nextRun;
    }
  }

  /**
   * Internal version of previous. Finds the previous scheduled run time.
   *
   * @param referenceDate - Optional reference date to search backwards from (defaults to now)
   * @returns Previous scheduled run time, or null if no previous run exists
   */
  private _previous(referenceDate?: CronDate<T> | Date | string | null): CronDate<T> | null {
    // Ensure reference date is a CronDate
    let reference = new CronDate<T>(referenceDate, this.getTz());

    // Don't return runs that would be after stopAt
    if (
      this.options.stopAt && reference.getTime() > (this.options.stopAt as CronDate<T>).getTime()
    ) {
      reference = this.options.stopAt as CronDate<T>;
    }

    // Calculate previous run according to pattern
    let previousRun: CronDate<T> | null = new CronDate<T>(
      reference,
      this.getTz(),
    );

    // For one-off schedules, check if the scheduled time is before the reference
    if (this._states.once) {
      if (this._states.once.getTime() < reference.getTime()) {
        return this._states.once;
      } else {
        return null;
      }
    }

    // Use decrement to find previous match
    previousRun = previousRun.decrement(
      this._states.pattern,
      this.options,
    );

    // Check if previous run is valid
    if (
      (previousRun === null) ||
      (this.options.startAt &&
        previousRun.getTime() < (this.options.startAt as CronDate<T>).getTime())
    ) {
      return null;
    } else {
      return previousRun;
    }
  }
  /**
   * Calculate the previous run if no previous run is supplied, but startAt and interval are set.
   * This calculation is only necessary if the startAt time is before the current time.
   * Should only be called from the _next function.
   */
  private _calculatePreviousRun(
    prev: CronDate<T> | Date | string | undefined | null,
    hasPreviousRun: boolean,
  ): [CronDate<T> | undefined, boolean] {
    const now = new CronDate<T>(undefined, this.getTz());
    let newPrev: CronDate<T> | undefined | null = prev as CronDate<T>;
    if ((this.options.startAt as CronDate<T>).getTime() <= now.getTime()) {
      newPrev = this.options.startAt as CronDate<T>;
      let prevTimePlusInterval = (newPrev as CronDate<T>).getTime() + this.options.interval! * 1000;
      while (prevTimePlusInterval <= now.getTime()) {
        newPrev = new CronDate<T>(newPrev, this.getTz())
          .increment(
            this._states.pattern,
            this.options,
            true,
          );
        prevTimePlusInterval = (newPrev as CronDate<T>).getTime() + this.options.interval! * 1000;
      }
      hasPreviousRun = true;
    }
    if (newPrev === null) {
      newPrev = undefined;
    }
    return [newPrev, hasPreviousRun];
  }
}

export { Cron, CronDate, type CronOptions, CronPattern, scheduledJobs };
