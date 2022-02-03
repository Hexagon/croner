/**
 * Name for each part of the cron pattern
 */
export type CronPatternPart = ("seconds" | "minutes" | "hours" | "days" | "months" | "daysOfWeek");
/**
 * Offset, 0 or -1.
 *
 * 0 for seconds,minutes and hours as they start on 1.
 * -1 on days and months, as the start on 0
 */
export type CronIndexOffset = number;
/**
 * Name for each part of the cron pattern
 * @typedef {("seconds" | "minutes" | "hours" | "days" | "months" | "daysOfWeek")} CronPatternPart
 */
/**
 * Offset, 0 or -1.
 *
 * 0 for seconds,minutes and hours as they start on 1.
 * -1 on days and months, as the start on 0
 *
 * @typedef {Number} CronIndexOffset
 */
/**
 * Create a CronPattern instance from pattern string ('* * * * * *')
 * @constructor
 * @param {string} pattern - Input pattern
 * @param {string} timezone - Input timezone, used for '?'-substitution
 */
export function CronPattern(pattern: string, timezone: string): void;
export class CronPattern {
    /**
     * Name for each part of the cron pattern
     * @typedef {("seconds" | "minutes" | "hours" | "days" | "months" | "daysOfWeek")} CronPatternPart
     */
    /**
     * Offset, 0 or -1.
     *
     * 0 for seconds,minutes and hours as they start on 1.
     * -1 on days and months, as the start on 0
     *
     * @typedef {Number} CronIndexOffset
     */
    /**
     * Create a CronPattern instance from pattern string ('* * * * * *')
     * @constructor
     * @param {string} pattern - Input pattern
     * @param {string} timezone - Input timezone, used for '?'-substitution
     */
    constructor(pattern: string, timezone: string);
    pattern: string;
    timezone: string;
    seconds: any;
    minutes: any;
    hours: any;
    days: any;
    months: any;
    daysOfWeek: any;
    lastDayOfMonth: boolean;
    private parse;
    private partToArray;
    private throwAtIllegalCharacters;
    private handleNumber;
    private handleRangeWithStepping;
    private handleRange;
    private handleStepping;
    private replaceAlphaDays;
    private replaceAlphaMonths;
}
