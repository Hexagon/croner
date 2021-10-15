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
     * - Job is about to be killed or killed
     */
    kill?: boolean;
    /**
     * - Maximum nuber of executions
     */
    maxRuns?: number;
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
 *
 * @signature
 * @constructor
 * @param {string} pattern - Input pattern
 * @param {CronOptions | Function} [options] - Options
 * @param {Function} [fn] - Function to be run each iteration of pattern
 * @returns {Cron}
 *
 * @signature
 * @constructor
 * @param {string} pattern - Input pattern
 * @param {CronOptions | Function} [options] - Options
 * @param {Function} [fn] - Function to be run each iteration of pattern
 * @returns {CronJob}
 */
export function Cron(pattern: string, options?: CronOptions | Function, fn?: Function): Cron;
export class Cron {
    /**
     * Cron entrypoint
     *
     *
     * @signature
     * @constructor
     * @param {string} pattern - Input pattern
     * @param {CronOptions | Function} [options] - Options
     * @param {Function} [fn] - Function to be run each iteration of pattern
     * @returns {Cron}
     *
     * @signature
     * @constructor
     * @param {string} pattern - Input pattern
     * @param {CronOptions | Function} [options] - Options
     * @param {Function} [fn] - Function to be run each iteration of pattern
     * @returns {CronJob}
     */
    constructor(pattern: string, options?: CronOptions | Function, fn?: Function);
    /** @type {CronPattern} */
    pattern: CronPattern;
    /** @type {CronOptions} */
    options: CronOptions;
    /**
     *
     * @param {CronOptions} options
     * @returns {CronOptions}
     */
    processOptions(options: CronOptions): CronOptions;
    /**
     * Find next runtime, based on supplied date. Strips milliseconds.
     *
     * @param {Date} [prev] - Input pattern
     * @returns {Date | null} - Next run time
     */
    next(prev?: Date): Date | null;
    /**
     * Return previous run time
     *
     * @returns {Date | null} - Previous run time
     */
    previous(): Date | null;
    private _next;
    /**
     * Returns number of milliseconds to next run
     *
     * @param {CronNextResult} [prev=new CronDate()] - Starting date, defaults to now
     * @returns {number | null}
     */
    msToNext(prev?: CronNextResult): number | null;
    /**
     * Stop execution
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
     * Pause execution
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
     * @returns {CronJob}
     */
    public schedule(func: Function): CronJob;
}
import { CronDate } from "./date.js";
import { CronPattern } from "./pattern.js";
