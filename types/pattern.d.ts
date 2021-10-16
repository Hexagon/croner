export type CronPatternPart = "seconds" | "minutes" | "hours" | "days" | "months" | "daysOfWeek";
export type CronIndexOffset = 0 | -1;
/**
 * @typedef {"seconds" | "minutes" | "hours" | "days" | "months" | "daysOfWeek"} CronPatternPart
 * @typedef {0 | -1} CronIndexOffset
 */
/**
 * Create a CronPattern instance from pattern string ('* * * * * *')
 * @constructor
 * @param {string} pattern - Input pattern
 */
export function CronPattern(pattern: string): void;
export class CronPattern {
    /**
     * @typedef {"seconds" | "minutes" | "hours" | "days" | "months" | "daysOfWeek"} CronPatternPart
     * @typedef {0 | -1} CronIndexOffset
     */
    /**
     * Create a CronPattern instance from pattern string ('* * * * * *')
     * @constructor
     * @param {string} pattern - Input pattern
     */
    constructor(pattern: string);
    pattern: string;
    seconds: any[];
    minutes: any[];
    hours: any[];
    days: any[];
    months: any[];
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
