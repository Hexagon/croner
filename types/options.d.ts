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
     * - Combine day-of-month and day-of-week using OR. Default is AND.
     */
    legacyMode?: boolean;
    /**
     * - Used to pass any object to scheduled function
     */
    context?: unknown;
};
/**
 * @typedef {Object} CronOptions - Cron scheduler options
 * @property {boolean} [paused] - Job is paused
 * @property {boolean} [kill] - Job is about to be killed or killed
 * @property {boolean} [catch] - Continue exection even if a unhandled error is thrown by triggered function
 * @property {number} [maxRuns] - Maximum nuber of executions
 * @property {string | Date} [startAt] - When to start running
 * @property {string | Date} [stopAt] - When to stop running
 * @property {string} [timezone] - Time zone in Europe/Stockholm format
 * @property {boolean} [legacyMode] - Combine day-of-month and day-of-week using OR. Default is AND.
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
