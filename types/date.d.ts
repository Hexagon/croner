/**
 * Converts date to CronDate
 * @constructor
 *
 * @param {date|string} [date] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
 * @param {string} [timezone] - String representation of timezone in Europe/Stockholm format.
 */
export function CronDate(date?: any, timezone?: string): void;
export class CronDate {
    /**
     * Converts date to CronDate
     * @constructor
     *
     * @param {date|string} [date] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
     * @param {string} [timezone] - String representation of timezone in Europe/Stockholm format.
     */
    constructor(date?: any, timezone?: string);
    timezone: string;
    private fromDate;
    UTCmsOffset: any;
    milliseconds: any;
    seconds: any;
    minutes: any;
    hours: any;
    days: any;
    months: any;
    years: any;
    private fromCronDate;
    private fromString;
    /**
     * Increment to next run time
     * @public
     *
     * @param {string} pattern - The pattern used to increment current state
     * @param {boolean} [rerun=false] - If this is an internal incremental run
     * @return {CronDate|null} - Returns itself for chaining, or null if increment wasnt possible
     */
    public increment(pattern: string, rerun?: boolean): CronDate | null;
    /**
     * Convert current state back to a javascript Date()
     * @public
     *
     * @param {boolean} internal - If this is an internal call
     * @returns {date}
     *
     */
    public getDate(internal: boolean): any;
    /**
     * Convert current state back to a javascript Date() and return UTC milliseconds
     * @public
     * @param {boolean} internal - If this is an internal call
     * @returns {date}
     *
     */
    public getTime(internal: boolean): any;
    private parseISOLocal;
}
