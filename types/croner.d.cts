export = Cron;
/**
 * Cron entrypoint
 *
 * @constructor
 * @param {string|Date} pattern - Input pattern, input date, or input ISO 8601 time string
 * @param {CronOptions|Function} [fnOrOptions1] - Options or function to be run each iteration of pattern
 * @param {CronOptions|Function} [fnOrOptions2] - Options or function to be run each iteration of pattern
 * @returns {Cron}
 */
declare function Cron(pattern: string | Date, fnOrOptions1?: CronOptions | Function, fnOrOptions2?: CronOptions | Function): Cron;
declare class Cron {
    /**
     * Cron entrypoint
     *
     * @constructor
     * @param {string|Date} pattern - Input pattern, input date, or input ISO 8601 time string
     * @param {CronOptions|Function} [fnOrOptions1] - Options or function to be run each iteration of pattern
     * @param {CronOptions|Function} [fnOrOptions2] - Options or function to be run each iteration of pattern
     * @returns {Cron}
     */
    constructor(pattern: string | Date, fnOrOptions1?: CronOptions | Function, fnOrOptions2?: CronOptions | Function);
    /**
     * @public
     * @type {string|undefined} */
    public name: string | undefined;
    /**
     * @public
     * @type {CronOptions} */
    public options: CronOptions;
    /**
     * Encapsulate all internal states in an object.
     * Duplicate all options that can change to internal states, for example maxRuns and paused.
     * @private
     */
    private _states;
    fn: Function | CronOptions;
    /**
     * Find next runtime, based on supplied date. Strips milliseconds.
     *
     * @param {CronDate|Date|string} [prev] - Date to start from
     * @returns {Date | null} - Next run time
     */
    nextRun(prev?: CronDate | Date | string): Date | null;
    /**
     * Find next n runs, based on supplied date. Strips milliseconds.
     *
     * @param {number} n - Number of runs to enumerate
     * @param {Date|string} [previous] - Date to start from
     * @returns {Date[]} - Next n run times
     */
    nextRuns(n: number, previous?: Date | string): Date[];
    /**
     * Return the original pattern, if there was one
     *
     * @returns {string|undefined} - Original pattern
     */
    getPattern(): string | undefined;
    /**
     * Indicates whether or not the cron job is scheduled and running, e.g. awaiting next trigger
     * @public
     *
     * @returns {boolean} - Running or not
     */
    public isRunning(): boolean;
    /**
     * Indicates whether or not the cron job is permanently stopped
     * @public
     *
     * @returns {boolean} - Running or not
     */
    public isStopped(): boolean;
    /**
     * Indicates whether or not the cron job is currently working
     * @public
     *
     * @returns {boolean} - Running or not
     */
    public isBusy(): boolean;
    /**
     * Return current/previous run start time
     * @public
     *
     * @returns {Date | null} - Previous run time
     */
    public currentRun(): Date | null;
    /**
     * Return previous run start time
     * @public
     *
     * @returns {Date | null} - Previous run time
     */
    public previousRun(): Date | null;
    /**
     * Returns number of milliseconds to next run
     * @public
     *
     * @param {CronDate|Date|string} [prev] - Starting date, defaults to now - minimum interval
     * @returns {number | null}
     */
    public msToNext(prev?: CronDate | Date | string): number | null;
    /**
     * Stop execution
     *
     * Running this will forcefully stop the job, and prevent furter exection. `.resume()` will not work after stopping.
     * It will also be removed from the scheduledJobs array if it were named.
     *
     * @public
     */
    public stop(): void;
    /**
     * Pause execution
     * @public
     *
     * @returns {boolean} - Wether pause was successful
     */
    public pause(): boolean;
    /**
     * Resume execution
     * @public
     *
     * @returns {boolean} - Wether resume was successful
     */
    public resume(): boolean;
    /**
     * Schedule a new job
     * @public
     *
     * @param {Function} func - Function to be run each iteration of pattern
     * @returns {Cron}
     */
    public schedule(func: Function): Cron;
    private _trigger;
    /**
     * Trigger a run manually
     * @public
     */
    public trigger(): Promise<void>;
    private _checkTrigger;
    private _next;
    private _calculatePreviousRun;
}
declare namespace Cron {
    export { Cron, scheduledJobs, TimePoint, CatchCallbackFn, ProtectCallbackFn, CronOptions, CronPatternPart, CronIndexOffset };
}
/**
 * Converts date to CronDate
 * @constructor
 *
 * @param {CronDate|Date|string} [d] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
 * @param {string|number} [tz] - String representation of target timezone in Europe/Stockholm format, or a number representing offset in minutes.
*/
declare function CronDate(d?: CronDate | Date | string, tz?: string | number): void;
declare class CronDate {
    /**
     * Converts date to CronDate
     * @constructor
     *
     * @param {CronDate|Date|string} [d] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
     * @param {string|number} [tz] - String representation of target timezone in Europe/Stockholm format, or a number representing offset in minutes.
    */
    constructor(d?: CronDate | Date | string, tz?: string | number);
    /**
     * TimeZone
     * @type {string|number|undefined}
     */
    tz: string | number | undefined;
    private isNthWeekdayOfMonth;
    private fromDate;
    ms: number;
    second: number;
    minute: number;
    hour: number;
    day: number;
    month: number;
    year: number;
    private fromCronDate;
    private apply;
    private fromString;
    private findNext;
    private recurse;
    /**
     * Increment to next run time
     * @public
     *
     * @param {string} pattern - The pattern used to increment current state
     * @param {CronOptions} options - Cron options used for incrementing
     * @param {boolean} [hasPreviousRun] - If this run should adhere to minimum interval
     * @return {CronDate|null} - Returns itthis for chaining, or null if increment wasnt possible
     */
    public increment(pattern: string, options: CronOptions, hasPreviousRun?: boolean): CronDate | null;
    /**
     * Convert current state back to a javascript Date()
     * @public
     *
     * @param {boolean} internal - If this is an internal call
     * @returns {Date}
     */
    public getDate(internal: boolean): Date;
    /**
     * Convert current state back to a javascript Date() and return UTC milliseconds
     * @public
     *
     * @returns {Date}
     */
    public getTime(): Date;
}
/**
 * An array containing all named cron jobs.
 *
 * @constant
 * @type {Cron[]}
 */
declare const scheduledJobs: Cron[];
type TimePoint = {
    /**
     * - 1970--
     */
    y: number;
    /**
     * - 1-12
     */
    m: number;
    /**
     * - 1-31
     */
    d: number;
    /**
     * - 0-24
     */
    h: number;
    /**
     * - 0-60 Minute
     */
    i: number;
    /**
     * - 0-60
     */
    s: number;
    /**
     * - Time zone in IANA database format 'Europe/Stockholm'
     */
    tz: string;
};
type CatchCallbackFn = (e: unknown, job: Cron) => any;
type ProtectCallbackFn = (job: Cron) => any;
/**
 * - Cron scheduler options
 */
type CronOptions = {
    /**
     * - Name of a job
     */
    name?: string;
    /**
     * - Job is paused
     */
    paused?: boolean;
    /**
     * - Job is about to be killed or killed
     */
    kill?: boolean;
    /**
     * - Continue exection even if a unhandled error is thrown by triggered function
     * - If set to a function, execute function on catching the error.
     */
    catch?: boolean | CatchCallbackFn;
    /**
     * - Abort job instantly if nothing else keeps the event loop running.
     */
    unref?: boolean;
    /**
     * - Maximum nuber of executions
     */
    maxRuns?: number;
    /**
     * - Minimum interval between executions, in seconds
     */
    interval?: number;
    /**
     * - Skip current run if job is already running
     */
    protect?: boolean | ProtectCallbackFn;
    /**
     * - When to start running
     */
    startAt?: string | Date;
    /**
     * - When to stop running
     */
    stopAt?: string | Date;
    /**
     * - Time zone in Europe/Stockholm format
     */
    timezone?: string;
    /**
     * - Offset from UTC in minutes
     */
    utcOffset?: number;
    /**
     * - Combine day-of-month and day-of-week using true = OR, false = AND. Default is true = OR.
     */
    legacyMode?: boolean;
    /**
     * - Used to pass any object to scheduled function
     */
    context?: unknown;
};
/**
 * Name for each part of the cron pattern
 */
type CronPatternPart = ("second" | "minute" | "hour" | "day" | "month" | "dayOfWeek");
/**
 * Offset, 0 or -1.
 *
 * 0 offset is used for seconds,minutes and hours as they start on 1.
 * -1 on days and months, as they start on 0
 */
type CronIndexOffset = number;
