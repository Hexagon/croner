/**
 * Converts date to CronDate
 * @constructor
 *
 * @param {date|string} [date] - Input date
 */
export function CronDate(date?: any): void;
export class CronDate {
    /**
     * Converts date to CronDate
     * @constructor
     *
     * @param {date|string} [date] - Input date
     */
    constructor(date?: any);
    private fromDate;
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
     * @return {CronPattern} - Returns itself for chaining
     */
    public increment(pattern: string): any;
    /**
     * Convert current state back to a javascript Date()
     * @public
     *
     * @returns {date}
     *
     */
    public getDate(): any;
    /**
     * Convert current state back to a javascript Date()
     * @public
     *
     * @returns {date}
     *
     */
    public getTime(): any;
}
