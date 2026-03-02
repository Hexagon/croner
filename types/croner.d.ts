// --- Callback types ---

/**
 * Callback invoked when a scheduled function throws and `catch` is set to a function.
 *
 * @template T - Type of the context object passed via CronOptions
 */
export type CatchCallbackFn<T = undefined> = (e: unknown, job: Cron<T>) => void;

/**
 * Callback invoked when a trigger is skipped because the previous run is still in progress
 * and `protect` is set to a function.
 *
 * @template T - Type of the context object passed via CronOptions
 */
export type ProtectCallbackFn<T = undefined> = (job: Cron<T>) => void;

/**
 * Function scheduled to run on each cron iteration.
 *
 * @template T - Type of the context object passed via CronOptions
 */
export type CronCallback<T = undefined> = (self: Cron<T>, context: T) => void | Promise<void>;

// --- Options ---

/**
 * Cron scheduler options.
 *
 * @template T - Type of the context object available inside callbacks
 */
export interface CronOptions<T = undefined> {
    /** Name of the job. Named jobs are tracked in `scheduledJobs`. */
    name?: string;

    /** Start the job in a paused state. */
    paused?: boolean;

    /** Immediately kill the job. */
    kill?: boolean;

    /**
     * Error-handling strategy for the scheduled function.
     *
     * - `true`  – silently swallow errors thrown by the scheduled function.
     * - A `CatchCallbackFn` – invoke the callback with the error and the job instance.
     * - `false` (default) – let errors propagate.
     */
    catch?: boolean | CatchCallbackFn<T>;

    /** If `true`, unrefs the internal timer so the process can exit while the job is idle. */
    unref?: boolean;

    /** Maximum number of executions before the job auto-stops. Default: `Infinity`. */
    maxRuns?: number;

    /** Minimum interval between executions, in seconds. */
    interval?: number;

    /**
     * Overrun protection.
     *
     * - `true`  – silently skip a trigger if the previous run is still in progress.
     * - A `ProtectCallbackFn` – invoke the callback when a trigger is skipped.
     * - `false` (default) – allow overlapping runs.
     */
    protect?: boolean | ProtectCallbackFn<T>;

    /** Earliest date/time the job is allowed to run. */
    startAt?: string | Date;

    /** Latest date/time the job is allowed to run. */
    stopAt?: string | Date;

    /** IANA timezone identifier (e.g. `"Europe/Stockholm"`). */
    timezone?: string;

    /** Offset from UTC in minutes. Cannot be combined with `timezone`. */
    utcOffset?: number;

    /**
     * Combine day-of-month and day-of-week using OR (`true`, default) or AND (`false`).
     */
    legacyMode?: boolean;

    /** Arbitrary context object passed as the second argument to the scheduled function. */
    context?: T;
}

// --- CronDate ---

/**
 * Internal date representation used by Croner.
 */
export class CronDate {
    constructor(d?: CronDate | Date | string, tz?: string | number);

    /** Timezone string or UTC offset in minutes. */
    tz: string | number | undefined;

    ms: number;
    second: number;
    minute: number;
    hour: number;
    day: number;
    month: number;
    year: number;

    /**
     * Increment to the next run time according to the given pattern.
     *
     * @returns The incremented date, or `null` if no future match exists.
     */
    increment(pattern: string, options: CronOptions, hasPreviousRun?: boolean): CronDate | null;

    /**
     * Convert to a native `Date` object.
     *
     * @param internal - When `true`, returns the date in the internal (possibly shifted) representation.
     */
    getDate(internal?: boolean): Date;

    /** Return UTC milliseconds of the represented point in time. */
    getTime(): number;
}

// --- CronPattern ---

/** Name for each schedulable part of a cron expression. */
export type CronPatternPart = "second" | "minute" | "hour" | "day" | "month" | "dayOfWeek";

/**
 * Index offset applied during pattern parsing.
 * `0` for seconds/minutes/hours, `-1` for days/months.
 */
export type CronIndexOffset = number;

// --- TimePoint (used by minitz helper) ---

export interface TimePoint {
    /** Full year (1970+) */
    y: number;
    /** Month (1-12) */
    m: number;
    /** Day of month (1-31) */
    d: number;
    /** Hour (0-23) */
    h: number;
    /** Minute (0-59) */
    i: number;
    /** Second (0-59) */
    s: number;
    /** IANA timezone identifier */
    tz: string;
}

// --- Cron class ---

/**
 * Isomorphic cron scheduler.
 *
 * @template T - Type of the `context` value passed via options and forwarded to the callback.
 */
export class Cron<T = undefined> {
    /**
     * Create a new cron job.
     *
     * Can be called with or without `new`.
     *
     * @param pattern - Cron expression, `Date` instance, or ISO 8601 string for one-off scheduling.
     * @param fnOrOptions1 - Scheduled callback **or** options object.
     * @param fnOrOptions2 - Scheduled callback **or** options object (order is flexible).
     */
    constructor(pattern: string | Date, fnOrOptions1?: CronOptions<T> | CronCallback<T>, fnOrOptions2?: CronOptions<T> | CronCallback<T>);

    /** Job name (if provided via options). */
    name: string | undefined;

    /** Resolved options for this job. */
    options: CronOptions<T>;

    /**
     * Find the next run time, based on the supplied date (or now).
     *
     * @param prev - Reference date to start searching from.
     * @returns The next `Date` the job would trigger, or `null` if no future run exists.
     */
    nextRun(prev?: CronDate | Date | string): Date | null;

    /**
     * Enumerate the next _n_ run times.
     *
     * @param n - Number of runs to enumerate.
     * @param previous - Reference date to start searching from.
     */
    nextRuns(n: number, previous?: Date | string): Date[];

    /** Return the original cron pattern string, or `undefined` for one-off (date-based) jobs. */
    getPattern(): string | undefined;

    /** `true` if the job is scheduled, not paused, and not killed. */
    isRunning(): boolean;

    /** `true` if the job has been permanently stopped. */
    isStopped(): boolean;

    /** `true` if the scheduled function is currently executing. */
    isBusy(): boolean;

    /** Start time of the current (in-progress) run, or `null`. */
    currentRun(): Date | null;

    /** Start time of the most recent completed run, or `null`. */
    previousRun(): Date | null;

    /**
     * Milliseconds until the next scheduled run.
     *
     * @param prev - Reference date (defaults to now).
     * @returns Milliseconds, or `null` if there is no upcoming run.
     */
    msToNext(prev?: CronDate | Date | string): number | null;

    /**
     * Permanently stop the job. After calling this, `resume()` will have no effect.
     * Named jobs are removed from `scheduledJobs`.
     */
    stop(): void;

    /**
     * Pause the job. Scheduled triggers are skipped while paused.
     *
     * @returns `true` if the job is still alive (not killed), `false` otherwise.
     */
    pause(): boolean;

    /**
     * Resume a paused job.
     *
     * @returns `true` if the job is still alive (not killed), `false` otherwise.
     */
    resume(): boolean;

    /**
     * Attach a function and start the scheduling loop.
     *
     * @param func - Callback to execute on each trigger.
     * @returns The `Cron` instance for chaining.
     */
    schedule(func?: CronCallback<T>): Cron<T>;

    /**
     * Manually trigger the scheduled function outside the normal schedule.
     */
    trigger(): Promise<void>;
}

// --- Convenience alias ---

/**
 * Convenience type alias for a `Cron` instance.
 * Useful when you need to store or pass job references without importing the class.
 *
 * @template T - Type of the context object.
 */
export type CronJob<T = undefined> = Cron<T>;

// --- Module-level exports ---

/**
 * Array of all currently active named cron jobs.
 */
export const scheduledJobs: Cron[];

/**
 * Create a cron job (function-call style, without `new`).
 */
export function Cron<T = undefined>(
    pattern: string | Date,
    fnOrOptions1?: CronOptions<T> | CronCallback<T>,
    fnOrOptions2?: CronOptions<T> | CronCallback<T>,
): Cron<T>;

export { Cron as default };
