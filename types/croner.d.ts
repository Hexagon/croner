export default Cron;
/**
 * Cron entrypoint
 *
 * @constructor
 * @param {string|Date} pattern - Input pattern, input date, or input ISO 8601 time string
 * @param {CronOptions|Function} [fnOrOptions1] - Options or function to be run each iteration of pattern
 * @param {CronOptions|Function} [fnOrOptions2] - Options or function to be run each iteration of pattern
 * @returns {Cron}
 */
export function Cron(pattern: string | Date, fnOrOptions1?: CronOptions | Function, fnOrOptions2?: CronOptions | Function): Cron;
export class Cron {
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
    /** @type {string|undefined} */
    name: string | undefined;
    /** @type {CronOptions} */
    options: CronOptions;
    /** @type {boolean} */
    blocking: boolean;
    once: CronDate;
    pattern: CronPattern;
    fn: Function | CronOptions;
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
     * Indicates wether or not the cron job is active, e.g. awaiting next trigger
     * @public
     *
     * @returns {boolean} - Running or not
     */
    public running(): boolean;
    /**
     * Indicates wether or not the cron job is currently working
     * @public
     *
     * @returns {boolean} - Running or not
     */
    public busy(): boolean;
    /**
     * Return current/previous run start time
     * @public
     *
     * @returns {Date | null} - Previous run time
     */
    public started(): Date | null;
    /**
     * Return previous run start time
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
     *
     * Running this will forcefully stop the job, and prevent furter exection. `.resume()` will not work after stopping.
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
     * @param {Date} [partial] - Internal function indicating a partial run
     * @returns {Cron}
     */
    public schedule(func: Function, partial?: Date): Cron;
    currentTimeout: number;
    private _trigger;
    runstarted: CronDate;
    previousrun: CronDate;
    /**
     * Trigger a run manually
     * @public
     */
    public trigger(): Promise<void>;
    private _checkTrigger;
    private _next;
}
export namespace Cron {
    export { Cron };
    export { scheduledJobs };
}
/**
 * An array containing all named cron jobs.
 *
 * @constant
 * @type {Cron[]}
 */
export const scheduledJobs: Cron[];
import { CronOptions } from "./options.js";
import { CronDate } from "./date.js";
import { CronPattern } from "./pattern.js";
