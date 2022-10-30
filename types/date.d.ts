/**
 * Converts date to CronDate
 * @constructor
 *
 * @param {CronDate|Date|string} [d] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
 * @param {string} [tz] - String representation of target timezone in Europe/Stockholm format.
*/
export function CronDate(d?: CronDate | Date | string, tz?: string): void;
export class CronDate {
    /**
     * Converts date to CronDate
     * @constructor
     *
     * @param {CronDate|Date|string} [d] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
     * @param {string} [tz] - String representation of target timezone in Europe/Stockholm format.
    */
    constructor(d?: CronDate | Date | string, tz?: string);
    /**
     * TimeZone
     * @type {string|undefined}
     */
    tz: string | undefined;
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
import { CronOptions } from "./options.js";
