/**
 * - Cron scheduler options
 */
export type CronOptions = {
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
export type CatchCallbackFn = (e: unknown, job: Cron) => any;
export type ProtectCallbackFn = (job: Cron) => any;
/**
 * @callback CatchCallbackFn
 * @param {unknown} e
 * @param {Cron} job
 */
/**
 * @callback ProtectCallbackFn
 * @param {Cron} job
 */
/**
 * @typedef {Object} CronOptions - Cron scheduler options
 * @property {string} [name] - Name of a job
 * @property {boolean} [paused] - Job is paused
 * @property {boolean} [kill] - Job is about to be killed or killed
 * @property {boolean | CatchCallbackFn} [catch] - Continue exection even if a unhandled error is thrown by triggered function
 * 										  - If set to a function, execute function on catching the error.
 * @property {boolean} [unref] - Abort job instantly if nothing else keeps the event loop running.
 * @property {number} [maxRuns] - Maximum nuber of executions
 * @property {number} [interval] - Minimum interval between executions, in seconds
 * @property {boolean | ProtectCallbackFn} [protect] - Skip current run if job is already running
 * @property {string | Date} [startAt] - When to start running
 * @property {string | Date} [stopAt] - When to stop running
 * @property {string} [timezone] - Time zone in Europe/Stockholm format
 * @property {number} [utcOffset] - Offset from UTC in minutes
 * @property {boolean} [legacyMode] - Combine day-of-month and day-of-week using true = OR, false = AND. Default is true = OR.
 * @property {?} [context] - Used to pass any object to scheduled function
 */
/**
 * Internal function that validates options, and sets defaults
 * @private
 *
 * @param {CronOptions} options
 * @returns {CronOptions}
 */
export function CronOptions(options: CronOptions): CronOptions;
import { Cron } from "./croner.js";
