export default Cron;
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
     * - Continue exection even if a unhandled error is thrown by triggered function
     */
    catch?: boolean;
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
    /**
     * - Used to pass any object to scheduled function
     */
    context?: unknown;
};
/**
 * Cron entrypoint
 *
 * @constructor
 * @param {string|Date} pattern - Input pattern, input date, or input ISO 8601 time string
 * @param {CronOptions|Function} [options] - Options
 * @param {Function} [func] - Function to be run each iteration of pattern
 * @returns {Cron}
 */
export function Cron(pattern: string | Date, options?: CronOptions | Function, func?: Function): Cron;
export class Cron {
    /**
     * Cron entrypoint
     *
     * @constructor
     * @param {string|Date} pattern - Input pattern, input date, or input ISO 8601 time string
     * @param {CronOptions|Function} [options] - Options
     * @param {Function} [func] - Function to be run each iteration of pattern
     * @returns {Cron}
     */
    constructor(pattern: string | Date, options?: CronOptions | Function, func?: Function);
    /** @type {CronOptions} */
    options: CronOptions;
    once: CronDate;
    /** @type {CronPattern} */
    pattern: CronPattern;
    fn: Function;
    private processOptions;
    /**
     * Find next runtime, based on supplied date. Strips milliseconds.
     *
     * @param {Date|string} [prev] - Date to start from
     * @returns {Date | null} - Next run time
     */
    next(prev?: Date | string): Date | null;
    /**
     * Find next n runs, based on supplied date. Strips milliseconds.
     *
     * @param {number} n - Number of runs to enumerate
     * @param {Date|string} [previous] - Date to start from
     * @returns {Date[]} - Next n run times
     */
    enumerate(n: number, previous?: Date | string): Date[];
    /**
     * Is running?
     * @public
     *
     * @returns {boolean} - Running or not
     */
    public running(): boolean;
    /**
     * Return previous run time
     * @public
     *
     * @returns {Date | null} - Previous run time
     */
    public previous(): Date | null;
    private _next;
    /**
     * Returns number of milliseconds to next run
     * @public
     *
     * @param {Date} [prev] - Starting date, defaults to now
     * @returns {number | null}
     */
    public msToNext(prev?: Date): number | null;
    /**
     * Stop execution
     * @public
     */
    public stop(): void;
    /**
     * Pause executionR
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
     * @returns {Cron}
     */
    public schedule(func: Function): Cron;
    currentTimeout: number;
    previousrun: CronDate;
}
import { CronDate } from "./date.js";
import { CronPattern } from "./pattern.js";
