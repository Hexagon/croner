/**
 * Name for each part of the cron pattern
 */
export type CronPatternPart = ("second" | "minute" | "hour" | "day" | "month" | "daysOfWeek");
/**
 * Offset, 0 or -1.
 *
 * 0 for second,minute and hour as they start on 1.
 * -1 on day and month, as the start on 0
 */
export type CronIndexOffset = number;
/**
 * Name for each part of the cron pattern
 * @typedef {("second" | "minute" | "hour" | "day" | "month" | "daysOfWeek")} CronPatternPart
 */
/**
 * Offset, 0 or -1.
 *
 * 0 for second,minute and hour as they start on 1.
 * -1 on day and month, as the start on 0
 *
 * @typedef {Number} CronIndexOffset
 */
/**
 * Create a CronPattern instance from pattern string ('* * * * * *')
 * @constructor
 * @param {string} pattern - Input pattern
 */
export function CronPattern(pattern: string): void;
export class CronPattern {
    /**
     * Name for each part of the cron pattern
     * @typedef {("second" | "minute" | "hour" | "day" | "month" | "daysOfWeek")} CronPatternPart
     */
    /**
     * Offset, 0 or -1.
     *
     * 0 for second,minute and hour as they start on 1.
     * -1 on day and month, as the start on 0
     *
     * @typedef {Number} CronIndexOffset
     */
    /**
     * Create a CronPattern instance from pattern string ('* * * * * *')
     * @constructor
     * @param {string} pattern - Input pattern
     */
    constructor(pattern: string);
    pattern: string;
    second: any[];
    minute: any[];
    hour: any[];
    day: any[];
    month: any[];
    daysOfWeek: any[];
    private parse;
    private partToArray;
    private throwAtIllegalCharacters;
    private handleNumber;
    private handleRange;
    private handleStepping;
    private replaceAlphaDays;
    private replaceAlphaMonths;
}
