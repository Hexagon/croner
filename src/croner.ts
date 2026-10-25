// deno-lint-ignore-file ban-types
/* ------------------------------------------------------------------------------------

  Croner - MIT License - Hexagon <github.com/Hexagon>

  Pure JavaScript Isomorphic cron parser and scheduler without dependencies.

  ------------------------------------------------------------------------------------

  License:

	Copyright (c) 2015-2026 Hexagon <github.com/Hexagon>

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
import { type CronMode, CronPattern } from "./pattern.ts";
import {
  type CatchCallbackFn,
  type CronOptions,
  CronOptionsHandler,
  type ProtectCallbackFn,
} from "./options.ts";
import { isCronCallback, isFunction, unrefTimer } from "./utils.ts";
import {
  createTimePoint,
  findOffsetChange,
  foldOf,
  resolveLocal,
  toTZ,
} from "./helpers/timezone.ts";

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
const MS_PER_DAY: number = 24 * 60 * 60 * 1000;
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
   * How far startAt was moved forward to a whole second, in milliseconds. A one-off date is an
   * exact instant, so it is compared with startAt as given.
   */
  private _startAtRoundingMs = 0;
  /**
   * Internal helper to get the timezone or UTC offset for date operations.
   * Reduces duplication of `this.options.timezone || this.options.utcOffset` throughout the codebase.
   *
   * @returns The timezone string or UTC offset number
   * @private
   */
  private getTz(): string | number | undefined {
    return this.options.timezone ?? this.options.utcOffset;
  }

  /**
   * Internal helper to apply dayOffset to a date if configured.
   *
   * @param date - The base date to apply offset to
   * @returns The date with dayOffset applied, or the original date if no offset is configured
   * @private
   */
  private applyDayOffset(date: Date): Date {
    const offsetMs = this._offsetMs();
    return offsetMs ? new Date(date.getTime() + offsetMs) : date;
  }

  /**
   * The dayOffset option in milliseconds
   */
  private _offsetMs(): number {
    return (this.options.dayOffset ?? 0) * MS_PER_DAY;
  }

  /**
   * The startAt and stopAt options, which CronOptionsHandler has made CronDates
   */
  private get _startAt(): CronDate<T> | undefined {
    return this.options.startAt as CronDate<T> | undefined;
  }
  private get _stopAt(): CronDate<T> | undefined {
    return this.options.stopAt as CronDate<T> | undefined;
  }

  /**
   * Find the next time the job runs, after a reference (default: now). With dayOffset, the
   * pattern is searched in shifted time, so the reference, startAt and stopAt are all compared
   * with the actual run time.
   */
  private _nextTarget(
    reference: CronDate<T> | Date | string | null | undefined,
    now: Date,
  ): Date | null {
    const offsetMs = this._offsetMs();
    const next = this._next(this._shift(reference), new Date(now.getTime() - offsetMs), {
      startAt: this._shift(this._startAt),
      stopAt: this._shift(this._stopAt),
    });
    return next ? this.applyDayOffset(next.getDate(false)) : null;
  }

  /**
   * Find the previous time the job ran, before a reference (default: now). See _nextTarget.
   */
  private _previousTarget(
    reference: CronDate<T> | Date | string | null | undefined,
    now: Date,
  ): Date | null {
    const previous = this._previous(this._shift(reference ?? now), {
      startAt: this._shift(this._startAt),
      stopAt: this._shift(this._stopAt),
    });
    return previous ? this.applyDayOffset(previous.getDate(false)) : null;
  }

  /**
   * Move a run time back by dayOffset, to the pattern match it was shifted from
   */
  private _shift(
    date: CronDate<T> | Date | string | null | undefined,
  ): CronDate<T> | undefined {
    if (date === null || date === undefined) return undefined;
    return new CronDate<T>(new Date(this._toMs(date) - this._offsetMs()), this.getTz());
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
    const startAtIn = options?.startAt;
    this.options = CronOptionsHandler<T>(options);
    if (startAtIn && this._startAt) {
      this._startAtRoundingMs = this._startAt.getTime() -
        new CronDate<T>(startAtIn, this.getTz()).getTime();
    }

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
    return this._nextTarget(prev, new Date());
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
   * Create a stateful iterator for sequential date traversal of this schedule.
   *
   * Returns a {@link CronIterator} that implements both the ECMAScript Iterator and
   * Iterable protocols, enabling `for...of` loops and destructuring assignment.
   *
   * @param startAt - Optional. The date to start iterating from. Defaults to current time.
   * @returns A new CronIterator instance
   */
  public enumerate(startAt?: Date | string | null): CronIterator<T> {
    return new CronIterator<T>(this, startAt);
  }

  /**
   * Internal helper to enumerate runs in either direction.
   *
   * @param n - Number of runs to enumerate
   * @param startDate - Date to start from
   * @param direction - Direction to enumerate ("next" or "previous")
   * @returns Array of run times
   * @private
   */
  private _enumerateRuns(
    n: number,
    startDate: CronDate<T> | Date | string | undefined | null,
    direction: "next" | "previous",
  ): Date[] {
    const enumeration: Date[] = [];
    const now = new Date();
    let current: CronDate<T> | Date | string | undefined | null = startDate;
    while (n-- > 0) {
      const run = direction === "next"
        ? this._nextTarget(current, now)
        : this._previousTarget(current, now);
      if (!run) break;
      enumeration.push(run);
      current = run;
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
   * Return the original pattern, if there was one.
   * Returns undefined when the job was created with a Date or ISO 8601 string instead of a cron pattern.
   *
   * @returns Original cron pattern, or undefined for date-based jobs
   */
  public getPattern(): string | undefined {
    // If this is a one-off job (created with a date), there is no pattern
    if (this._states.once) {
      return void 0;
    }
    return this._states.pattern ? this._states.pattern.pattern : void 0;
  }

  /**
   * Return the original run-once date, if there was one
   *
   * @returns Original run-once date, or null if not a run-once job
   */
  public getOnce(): Date | null {
    return this._states.once ? this._states.once.getDate() : null;
  }

  /**
   * Indicates whether or not the cron job is scheduled and running, e.g. awaiting next trigger
   *
   * @returns Running or not
   */
  public isRunning(): boolean {
    return !this._states.paused && !this._states.kill && this.fn !== void 0 &&
      this._nextTarget(this._states.currentRun, new Date()) !== null;
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
    const now = new Date();
    const next = this._nextTarget(prev, now);
    return next ? next.getTime() - this._toMs(prev ?? now) : null;
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
    return this._schedule(func);
  }

  private _schedule(func?: CronCallback<T>, now?: Date): Cron<T> {
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
    const currentTime = now ?? new Date();
    const next = this._nextTarget(undefined, currentTime);
    let waitMs = next ? next.getTime() - currentTime.getTime() : null;

    // Get the target date based on previous run. If the clock has stepped backward
    // (currentRun > now), use the current time instead, so target and waitMs agree.
    let previousRun = this._states.currentRun;
    if (previousRun && previousRun.getTime() > currentTime.getTime()) previousRun = undefined;
    const target = this._nextTarget(previousRun, currentTime);

    // isNaN added to prevent infinite loop
    if (waitMs === null || isNaN(waitMs) || target === null) return this;

    // setTimeout cant handle more than Math.pow(2, 32 - 1) - 1 ms
    if (waitMs > maxDelay) {
      waitMs = maxDelay;
    }

    // Clamp negative delays to 0 - some runtimes (e.g. Deno) treat large negative values
    // as large positive delays due to 32-bit integer overflow, causing jobs with allowPast:true
    // and a far-past date to never fire. Use a backoff when paused to avoid a tight loop.
    if (waitMs < 0) {
      waitMs = this._states.paused ? 1000 : 0;
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
  private async _trigger(initiationDate: Date = new Date()) {
    this._states.blocking = true;

    this._states.currentRun = new CronDate<T>(
      initiationDate,
      this.getTz(),
    );

    try {
      if (this.options.catch) {
        try {
          if (this.fn !== undefined) {
            await this.fn(this, this.options.context as T);
          }
        } catch (_e) {
          if (isFunction(this.options.catch)) {
            try {
              (this.options.catch as Function)(_e, this);
            } catch (_catchError) {
              // Silently ignore errors thrown by the catch callback so they do not disrupt the job execution flow or leave the blocking state stuck (including when protect is enabled).
            }
          }
        }
      } else {
        // Trigger the function without catching
        if (this.fn !== undefined) {
          await this.fn(this, this.options.context as T);
        }
      }
    } finally {
      this._states.previousRun = new CronDate<T>(
        initiationDate,
        this.getTz(),
      );

      this._states.blocking = false;
    }
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
      this._trigger(now);
    } else {
      // If this trigger were blocked, and protect is a function, trigger protect (without awaiting it, even if it's an synchronous function)
      if (shouldRun && isBlocked && isFunction(this.options.protect)) {
        setTimeout(() => (this.options.protect as Function)(this), 0);
      }
    }

    // Always reschedule
    this._schedule(undefined, shouldRun ? undefined : now);
  }

  /**
   * Internal version of next. Cron needs millseconds internally, hence _next.
   */
  private _next(
    previousRun?: CronDate<T> | Date | string | null,
    now?: Date,
    bounds?: { startAt?: CronDate<T>; stopAt?: CronDate<T> },
  ) {
    const startAt = bounds ? bounds.startAt : this._startAt;
    const stopAt = bounds ? bounds.stopAt : this._stopAt;
    const isEnumerating = !!previousRun;
    let hasPreviousRun = !!(previousRun || this._states.currentRun);

    // If no previous run, and startAt and interval is set, calculate when the last run should have been
    let startAtInFutureWithInterval = false;
    if (!previousRun && startAt && this.options.interval) {
      previousRun = this._calculatePreviousRun(startAt, now);
      if (previousRun) hasPreviousRun = true;
      startAtInFutureWithInterval = !previousRun;
    }

    // Search from the exact reference instant
    const reference = previousRun ?? now ?? new Date();
    let referenceMs = this._toMs(reference);
    previousRun = new CronDate<T>(reference, this.getTz());

    // Previous run should never be before startAt
    if (startAt && referenceMs < startAt.getTime()) {
      previousRun = startAtInFutureWithInterval
        ? startAt
        : new CronDate<T>(new Date(startAt.getTime() - 1000), this.getTz());
      referenceMs = previousRun.getTime();
    }

    // Calculate next run according to pattern or one-off timestamp, pass actual previous run to increment
    let nextRun: CronDate<T> | null = this._states.once ||
      new CronDate<T>(previousRun, this.getTz());

    // if the startAt is in the future and the interval is set, then the prev is already set to the startAt, so there is no need to increment it
    if (!startAtInFutureWithInterval && nextRun !== this._states.once) {
      nextRun = this._findOccurrence(previousRun, referenceMs, 1, hasPreviousRun);
    }

    // For "once" jobs, return null if:
    // - the once time is before startAt
    // - the job has already executed (currentRun is the actual fire time, so include dayOffset)
    // - searching from a reference at or after the once time
    // - the once time is more than 1 second in the past, unless allowPast is set
    if (this._states.once) {
      const onceMs = this._states.once.getTime();
      const pastMs = referenceMs - onceMs;
      if (
        (startAt && onceMs < startAt.getTime() - this._startAtRoundingMs) ||
        (this._states.currentRun &&
          this.applyDayOffset(this._states.once.getDate()).getTime() <=
            this._states.currentRun.getTime()) ||
        (isEnumerating ? pastMs >= 0 : pastMs > 1000 && !this.options.allowPast)
      ) {
        return null;
      }
    }

    if (
      nextRun === null || this._states.maxRuns !== undefined && this._states.maxRuns <= 0 ||
      this._states.kill || stopAt && nextRun.getTime() >= stopAt.getTime()
    ) {
      return null;
    }
    return nextRun;
  }

  /**
   * Internal version of previous. Finds the previous scheduled run time.
   *
   * @param referenceDate - Optional reference date to search backwards from (defaults to now)
   * @returns Previous scheduled run time, or null if no previous run exists
   */
  private _previous(
    referenceDate: CronDate<T> | Date | string | null | undefined,
    bounds: { startAt?: CronDate<T>; stopAt?: CronDate<T> },
  ): CronDate<T> | null {
    let referenceMs = this._toMs(referenceDate ?? new Date());

    // Don't return runs that would be after stopAt
    if (bounds.stopAt && referenceMs > bounds.stopAt.getTime()) {
      referenceMs = bounds.stopAt.getTime();
    }

    // For one-off schedules, check if the scheduled time is before the reference
    if (this._states.once) {
      return this._states.once.getTime() < referenceMs ? this._states.once : null;
    }

    const previousRun = this._findOccurrence(
      new CronDate<T>(new Date(referenceMs), this.getTz()),
      referenceMs,
      -1,
    );

    // Check if previous run is valid
    if (
      previousRun === null || (bounds.startAt && previousRun.getTime() < bounds.startAt.getTime())
    ) {
      return null;
    }
    return previousRun;
  }

  /**
   * The exact instant of a reference date. Strings are read in the timezone of the job.
   */
  private _toMs(reference: CronDate<T> | Date | string): number {
    return reference instanceof Date
      ? reference.getTime()
      : new CronDate<T>(reference, this.getTz()).getTime();
  }

  /**
   * Find the first occurrence after (direction 1) or before (direction -1) referenceMs,
   * walking the wall clock from `start`. Same algorithm as find_occurrence in croner-rust.
   *
   * When the clock goes back (DST fall back), a range of wall clock times repeats, and one
   * walk covers only one pass of it. If the reference is on the pass the search meets first,
   * the other pass still lies ahead, so it is walked too, and the nearer match wins.
   */
  private _findOccurrence(
    start: CronDate<T>,
    referenceMs: number,
    direction: 1 | -1,
    hasPreviousRun = false,
  ): CronDate<T> | null {
    const found = this._walk(start, referenceMs, direction, hasPreviousRun);

    // A fixed-time job never runs on the later pass, and a fixed UTC offset has no DST
    const tz = this.getTz();
    if ((this._states.pattern.isFixedTime && direction === 1) || typeof tz === "number") {
      return found;
    }
    if (foldOf(referenceMs, tz) !== (direction === 1 ? "earlier" : "later")) return found;

    // The other pass starts when the clock goes back, and ends just before it
    const ms = Math.floor(referenceMs / 1000) * 1000;
    const edgeMs = direction === 1
      ? findOffsetChange(ms, ms + MS_PER_DAY, tz)
      : findOffsetChange(ms - MS_PER_DAY, ms, tz) - 1000;

    // A match before the edge beats anything on the other pass
    if (found && (edgeMs - found.getTime()) * direction > 0) return found;

    const other = this._walk(
      new CronDate<T>(new Date(edgeMs), tz),
      edgeMs - direction,
      direction,
      false,
      true,
    );
    if (!found || !other) return found ?? other;
    return (found.getTime() - other.getTime()) * direction > 0 ? other : found;
  }

  /**
   * Walk the wall clock from `start` until a time matches the pattern, and runs after
   * (direction 1) or before (direction -1) referenceMs. Same algorithm as walk in croner-rust.
   */
  private _walk(
    start: CronDate<T>,
    referenceMs: number,
    direction: 1 | -1,
    hasPreviousRun: boolean,
    inclusive = false,
  ): CronDate<T> | null {
    const pattern = this._states.pattern;
    const step = (date: CronDate<T>, hasPrevious: boolean) =>
      direction === 1
        ? date.increment(pattern, this.options, hasPrevious)
        : date.decrement(pattern, this.options);

    let candidate: CronDate<T> | null = new CronDate<T>(start, this.getTz());
    if (!inclusive || !candidate.match(pattern, this.options)) {
      candidate = step(candidate, hasPreviousRun);
    }
    while (candidate) {
      const runAt = this._runAt(candidate, referenceMs, direction);
      if (runAt) return new CronDate<T>(runAt, this.getTz());
      candidate = step(candidate, false);
    }
    return null;
  }

  /**
   * When a matching wall clock time runs, if that is after (direction 1) or
   * before (direction -1) referenceMs. DST rules, shared with croner-rust:
   * - A time that occurs twice (fall back) runs once, at its first occurrence, for
   *   fixed-time jobs, and on both occurrences for interval jobs.
   * - A time that doesn't exist (spring forward) is skipped by interval jobs, and runs
   *   when the clock has jumped forward for fixed-time jobs, if that is on the same day.
   */
  private _runAt(candidate: CronDate<T>, referenceMs: number, direction: 1 | -1): Date | null {
    const isAhead = (date: Date) => (date.getTime() - referenceMs) * direction > 0;
    const tz = candidate.tz;
    if (typeof tz === "number") {
      const date = candidate.getDate();
      return isAhead(date) ? date : null;
    }

    const local = createTimePoint(
      candidate.year,
      candidate.month + 1,
      candidate.day,
      candidate.hour,
      candidate.minute,
      candidate.second,
      tz,
    );
    const resolved = resolveLocal(local);
    const isFixedTime = this._states.pattern.isFixedTime;

    if (resolved.kind === "single") {
      return isAhead(resolved.date) ? resolved.date : null;
    }
    if (resolved.kind === "ambiguous") {
      const { earlier, later } = resolved;
      const order = isFixedTime ? [earlier] : direction === 1 ? [earlier, later] : [later, earlier];
      return order.find(isAhead) ?? null;
    }
    if (!isFixedTime) return null;
    const gapEnd = new Date(
      findOffsetChange(resolved.before.getTime(), resolved.after.getTime(), tz),
    );
    const gapEndLocal = toTZ(gapEnd, tz);
    const sameDay = gapEndLocal.y === local.y && gapEndLocal.m === local.m &&
      gapEndLocal.d === local.d;
    return sameDay && isAhead(gapEnd) ? gapEnd : null;
  }

  /**
   * When startAt and interval are set and there is no previous run, find the last run there
   * would have been between startAt and now. Returns undefined if startAt is in the future.
   */
  private _calculatePreviousRun(startAt: CronDate<T>, now?: Date): CronDate<T> | undefined {
    const nowMs = new CronDate<T>(now, this.getTz()).getTime();
    if (startAt.getTime() > nowMs) return undefined;

    const intervalMs = this.options.interval! * 1000;
    let previous = startAt;
    while (previous.getTime() + intervalMs <= nowMs) {
      const next = new CronDate<T>(previous, this.getTz())
        .increment(this._states.pattern, this.options, true);
      if (next === null) break;
      previous = next;
    }
    return previous;
  }
}

/**
 * Stateful iterator for sequential date traversal of a Cron schedule.
 *
 * Implements both the ECMAScript Iterator and Iterable protocols, which means it can be
 * used directly in `for...of` loops and with destructuring assignment.
 *
 * Obtain an instance via {@link Cron#enumerate}.
 */
class CronIterator<T = undefined> implements Iterator<Date, undefined>, Iterable<Date> {
  private cron: Cron<T>;
  /** Last returned date, or the user supplied start date */
  private cursor!: Date | string | undefined;
  /** Time of creation or reset, used as reference while there is no cursor */
  private now!: Date;
  private done!: boolean;
  private initialMaxRuns: number;
  private remainingRuns!: number;

  /**
   * @param cron - The Cron instance to iterate over
   * @param startAt - Optional starting date for iteration. Defaults to current time if omitted.
   */
  constructor(cron: Cron<T>, startAt?: Date | string | null) {
    this.cron = cron;
    this.initialMaxRuns = cron.options.maxRuns ?? Infinity;
    this.reset(startAt);
  }

  /**
   * Returns the next scheduled date and advances the cursor.
   * Implements the ECMAScript Iterator protocol.
   *
   * @returns `{ value: Date, done: false }` for the next occurrence,
   *          or `{ value: undefined, done: true }` when the schedule is exhausted.
   */
  public next(): IteratorResult<Date, undefined> {
    if (this.done || this.remainingRuns <= 0) {
      this.done = true;
      return { value: undefined, done: true };
    }
    const nextDate = this.cron["_nextTarget"](this.cursor, this.now);
    if (nextDate === null) {
      this.done = true;
      return { value: undefined, done: true };
    }
    this.cursor = nextDate;
    this.remainingRuns--;
    return { value: nextDate, done: false };
  }

  /**
   * Returns the next scheduled date without advancing the cursor.
   *
   * @returns The next scheduled date, or null if the schedule is exhausted.
   */
  public peek(): Date | null {
    if (this.done || this.remainingRuns <= 0) {
      return null;
    }
    return this.cron["_nextTarget"](this.cursor, this.now);
  }

  /**
   * Resets the cursor, optionally to a new starting date.
   *
   * @param newStartAt - New starting date. Defaults to current time if omitted.
   */
  public reset(newStartAt?: Date | string | null): void {
    // Clone Date objects to prevent external mutation. Strings are kept, so that they are
    // parsed in the timezone of the Cron instance, like nextRun() does.
    this.cursor = newStartAt instanceof Date
      ? new Date(newStartAt.getTime())
      : newStartAt ?? undefined;
    this.now = new Date();
    this.done = false;
    this.remainingRuns = this.initialMaxRuns;
  }

  /**
   * Implements the ECMAScript Iterable protocol, enabling `for...of` and destructuring.
   */
  [Symbol.iterator](): CronIterator<T> {
    return this;
  }
}

export {
  type CatchCallbackFn,
  Cron,
  CronDate,
  CronIterator,
  type CronMode,
  type CronOptions,
  CronPattern,
  type ProtectCallbackFn,
  scheduledJobs,
};
