export default Cron;
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
    pattern: CronPattern;
    fn: Function;
    /**
     * Find next runtime, based on supplied date. Strips milliseconds.
     *
     * @param {CronDate|Date|string} [prev] - Date to start from
     * @returns {Date | null} - Next run time
     */
    next(prev?: CronDate | Date | string): Date | null;
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
    private _next;
}
import { CronOptions } from "./options.js";
import { CronDate } from "./date.js";
import { CronPattern } from "./pattern.js";
