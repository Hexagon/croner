export default Cron;
export type CronNextResult = CronDate | null;
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
    /**
     * Store and validate options
     * @type {CronOptions}
     */
    opts: CronOptions;
    /**
     * Find next runtime, based on supplied date. Strips milliseconds.
     *
     * @param {Date} prev - Input pattern
     * @returns {Date | null} - Next run time
     */
    next(prev: Date): Date | null;
    /**
     * Return previous run time
     *
     * @returns {Date | null} - Previous run time
     */
    previous(): Date | null;
    /**
     * Internal version of next. Cron needs millseconds internally, hence _next.
     *
     * @param {Date} prev - Input pattern
     * @returns {CronNextResult | null} - Next run time
     */
    _next(prev: Date): CronNextResult | null;
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
     * @param {CronNextResult} [prev=new CronDate()] - Starting date, defaults to now
     * @returns {number | null}
     */
    msToNext(prev?: CronNextResult): number | null;
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
import { CronDate } from "./date.js";
import { CronPattern } from "./pattern.js";
