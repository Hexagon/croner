/**
 * Converts date to CronDate
 * @constructor
 *
 * @param {CronDate|date|string} [date] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
 * @param {string} [timezone] - String representation of target timezone in Europe/Stockholm format.
*/
export function CronDate(date?: any, timezone?: string): void;
export class CronDate {
    /**
     * Converts date to CronDate
     * @constructor
     *
     * @param {CronDate|date|string} [date] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
     * @param {string} [timezone] - String representation of target timezone in Europe/Stockholm format.
    */
    constructor(date?: any, timezone?: string);
    timezone: string;
    private fromDate;
    milliseconds: any;
    seconds: any;
    minutes: any;
    hours: any;
    days: any;
    months: any;
    years: any;
    private fromCronDate;
    private apply;
    private fromString;
    /**
     * Increment to next run time
     * @public
     *
     * @param {string} pattern - The pattern used to increment current state
     * @param {CronOptions} options - Cron options used for incrementing
     * @param {boolean} [hasPreviousRun] - If this run should adhere to minimum interval
     * @return {CronDate|null} - Returns itself for chaining, or null if increment wasnt possible
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
