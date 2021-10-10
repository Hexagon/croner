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
    /**
     * Parse current pattern, will raise an error on failure
     */
    parse(): void;
    /**
     * Convert current part (seconds/minutes etc) to an array of 1 or 0 depending on if the part is about to trigger a run or not.
     *
     * @param {CronPatternPart} type - Seconds/minutes etc
     * @param {string} conf - Current pattern part - *, 0-1 etc
     * @param {CronIndexOffset} valueIndexOffset - 0 or -1. 0 for seconds,minutes, hours as they start on 1. -1 on days and months, as the start on 0
     */
    partToArray(type: CronPatternPart, conf: string, valueIndexOffset: CronIndexOffset): void;
}
