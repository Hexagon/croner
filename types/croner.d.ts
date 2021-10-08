export default Cron;
export type CronPatternPart = "seconds" | "minutes" | "hours" | "days" | "months" | "daysOfWeek";
export type CronIndexOffset = 0 | -1;
export type CronNextResult = Date | undefined;
/**
 * - Cron scheduler options
 */
export type CronOptions = {
    /**
     * - Job is paused
     */
    paused?: boolean;
    /**
     * - Job is about to be killed
     */
    kill?: boolean;
    /**
     * - Internal: Milliseconds left from previous run
     */
    rest?: boolean;
    /**
     * - Internal: setTimeout "id"
     */
    currentTimeout?: number;
    /**
     * - Previous run time
     */
    previous?: CronNextResult;
    /**
     * - When to start running
     */
    startAt?: string | Date;
    /**
     * - When to stop running
     */
    stopAt?: string | Date;
};
/**
 * - Stop current job
 */
export type CronJobStop = Function;
/**
 * - Resume current job
 */
export type CronJobResume = Function;
/**
 * - Cron job control functions
 */
export type CronJob = {
    stop: CronJobStop;
    pause: CronJobResume;
    resume: Function;
};
/**
 * Cron entrypoint
 *
 * @constructor
 * @param {string} pattern - Input pattern
 * @param {CronOptions | Function} [options] - Options
 * @param {Function} [fn] - Function to be run each iteration of pattern
 * @returns {Cron | CronJob}
 */
export function Cron(pattern: string, options?: CronOptions | Function, fn?: Function): Cron | CronJob;
export class Cron {
    /**
     * Cron entrypoint
     *
     * @constructor
     * @param {string} pattern - Input pattern
     * @param {CronOptions | Function} [options] - Options
     * @param {Function} [fn] - Function to be run each iteration of pattern
     * @returns {Cron | CronJob}
     */
    constructor(pattern: string, options?: CronOptions | Function, fn?: Function);
    /** @type {CronPattern} */
    pattern: CronPattern;
    /** @type {CronOptions} */
    schedulerDefaults: CronOptions;
    /** @type {CronOptions} */
    opts: CronOptions;
    /**
     * Find next runtime, based on supplied date. Strips milliseconds.
     *
     * @param {Date} prev - Input pattern
     * @returns {CronNextResult} - Next run time
     */
    next(prev: Date): CronNextResult;
    /**
     * Return previos run time
     *
     * @returns {Date?} - Previous run time
     */
    previous(): Date | null;
    /**
     * Internal version of next. Cron needs millseconds internally, hence _next.
     *
     * @param {Date} prev - Input pattern
     * @returns {CronNextResult} - Next run time
     */
    _next(prev: Date): CronNextResult;
    /**
     * Validate (and cleans) options. Raises error on failure.
     *
     * @param {CronOptions} opts - Input options
     * @returns {CronOptions} - Clean and validated options.
     */
    validateOpts(opts: CronOptions): CronOptions;
    /**
     * Returns number of milliseconds to next run
     *
     * @param {CronNextResult} [prev=new Date()] - Starting date, defaults to now
     * @returns {number | CronNextResult}
     */
    msToNext(prev?: CronNextResult): number | CronNextResult;
    /**
     * Schedule a new job
     *
     * @constructor
     * @param {CronOptions | Function} [options] - Options
     * @param {Function} [func] - Function to be run each iteration of pattern
     * @returns {CronJob}
     */
    schedule(opts: any, func?: Function): CronJob;
}
/**
 * Create a CronPattern instance from pattern string ('* * * * * *')
 * @constructor
 * @param {string} pattern - Input pattern
 */
declare function CronPattern(pattern: string): void;
declare class CronPattern {
    /**
     * Create a CronPattern instance from pattern string ('* * * * * *')
     * @constructor
     * @param {string} pattern - Input pattern
     */
    constructor(pattern: string);
    pattern: string;
    seconds: any;
    minutes: any;
    hours: any;
    days: any;
    months: any;
    daysOfWeek: any;
    /**
     * Parse current pattern, will raise an error on failure
     */
    parse(): void;
    /**
     * Convert current part (seconds/minutes etc) to an array of 1 or 0 depending on if the part is about to trigger a run or not.
     *
     * @param {CronPatternPart} type - Seconds/minutes etc
     * @param {string} conf - Current pattern part - *, 0-1 etc
     * @param {CronIndexOffset} valueIndexOffset - 0 or -1. 0 for seconds,minutes, hours as they start on 1. -1 on days and months, as the start on 0
     */
    partToArray(type: CronPatternPart, conf: string, valueIndexOffset: CronIndexOffset): void;
}
