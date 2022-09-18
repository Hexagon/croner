export default minitz;
export type TimePoint = {
    /**
     * - 1970--
     */
    year: number;
    /**
     * - 1-12
     */
    month: number;
    /**
     * - 1-31
     */
    day: number;
    /**
     * - 0-24
     */
    hour: number;
    /**
     * - 0-60
     */
    minute: number;
    /**
     * - 0-60
     */
    second: number;
    /**
     * - Time zone in IANA database format 'Europe/Stockholm'
     */
    timezone: string;
};
/**
 * @typedef {Object} TimePoint
 * @property {Number} year - 1970--
 * @property {Number} month - 1-12
 * @property {Number} day - 1-31
 * @property {Number} hour - 0-24
 * @property {Number} minute - 0-60
 * @property {Number} second - 0-60
 * @property {string} timezone - Time zone in IANA database format 'Europe/Stockholm'
 */
/**
 * Converts a date/time from a specific timezone to a normal date object using the system local time
 *
 * Shortcut for minitz.fromTZ(minitz.tp(...));
 *
 * @constructor
 *
 * @param {Number} year - 1970--
 * @param {Number} month - 1-12
 * @param {Number} day - 1-31
 * @param {Number} hour - 0-24
 * @param {Number} minute - 0-60
 * @param {Number} second - 0-60
 * @param {string} timezone - Time zone in IANA database format 'Europe/Stockholm'
 * @param {boolean} [throwOnInvalidTime] - Default is to return the adjusted time if the call happens during a Daylight-Saving-Time switch.
 *										E.g. Value "01:01:01" is returned if input time is 00:01:01 while one hour got actually
 *										skipped, going from 23:59:59 to 01:00:00. Setting this flag makes the library throw an exception instead.
 * @returns {date} - Normal date object with correct UTC and system local time
 *
 */
export function minitz(year: number, month: number, day: number, hour: number, minute: number, second: number, timezone: string, throwOnInvalidTime?: boolean): date;
export class minitz {
    /**
     * @typedef {Object} TimePoint
     * @property {Number} year - 1970--
     * @property {Number} month - 1-12
     * @property {Number} day - 1-31
     * @property {Number} hour - 0-24
     * @property {Number} minute - 0-60
     * @property {Number} second - 0-60
     * @property {string} timezone - Time zone in IANA database format 'Europe/Stockholm'
     */
    /**
     * Converts a date/time from a specific timezone to a normal date object using the system local time
     *
     * Shortcut for minitz.fromTZ(minitz.tp(...));
     *
     * @constructor
     *
     * @param {Number} year - 1970--
     * @param {Number} month - 1-12
     * @param {Number} day - 1-31
     * @param {Number} hour - 0-24
     * @param {Number} minute - 0-60
     * @param {Number} second - 0-60
     * @param {string} timezone - Time zone in IANA database format 'Europe/Stockholm'
     * @param {boolean} [throwOnInvalidTime] - Default is to return the adjusted time if the call happens during a Daylight-Saving-Time switch.
     *										E.g. Value "01:01:01" is returned if input time is 00:01:01 while one hour got actually
     *										skipped, going from 23:59:59 to 01:00:00. Setting this flag makes the library throw an exception instead.
     * @returns {date} - Normal date object with correct UTC and system local time
     *
     */
    constructor(year: number, month: number, day: number, hour: number, minute: number, second: number, timezone: string, throwOnInvalidTime?: boolean);
}
export namespace minitz {
    /**
     * Converts a date/time from a specific timezone to a normal date object using the system local time
     *
     * @public
     * @static
     *
     * @param {string} localTimeString - ISO8601 formatted local time string, non UTC
     * @param {string} timezone - Time zone in IANA database format 'Europe/Stockholm'
     * @param {boolean} [throwOnInvalidTime] - Default is to return the adjusted time if the call happens during a Daylight-Saving-Time switch.
     *										E.g. Value "01:01:01" is returned if input time is 00:01:01 while one hour got actually
     *										skipped, going from 23:59:59 to 01:00:00. Setting this flag makes the library throw an exception instead.
     * @return {date} - Normal date object
     *
     */
    export function fromTZISO(localTimeString: string, timezone: string, throwOnInvalidTime?: boolean): date;
    /**
     * Converts a date/time from a specific timezone to a normal date object using the system local time
     *
     * @public
     * @static
     *
     * @param {TimePoint} date - Object with specified timezone
     * @param {boolean} [throwOnInvalidTime] - Default is to return the adjusted time if the call happens during a Daylight-Saving-Time switch.
     *										E.g. Value "01:01:01" is returned if input time is 00:01:01 while one hour got actually
     *										skipped, going from 23:59:59 to 01:00:00. Setting this flag makes the library throw an exception instead.
     * @returns {date} - Normal date object
     */
    export function fromTZ(timePoint: any, throwOnInvalidTime?: boolean): date;
    /**
     * Converts a date to a specific time zone and returns an object containing year, month,
     * day, hour, (...) and timezone used for the conversion
     *
     * **Please note**: If you just want to _display_ date/time in another
     * time zone, use vanilla JS. See the example below.
     *
     * @public
     * @static
     *
     * @param {date} date - Input date
     * @param {string} [tzString] - Timezone string in Europe/Stockholm format
     *
     * @returns {TimePoint}
     *
     * @example <caption>Example using minitz:</caption>
     * let normalDate = new Date(); // d is a normal Date instance, with local timezone and correct utc representation
     *
     * tzDate = minitz.toTZ(d, 'America/New_York');
     *
     * // Will result in the following object:
     * // {
     * //  year: 2022,
     * //  month: 9,
     * //  day: 28,
     * //  hour: 13,
     * //  minute: 28,
     * //  second: 28,
     * //  timezone: "America/New_York"
     * // }
     *
     * @example <caption>Example using vanilla js:</caption>
     * console.log(
     *	// Display current time in America/New_York, using sv-SE locale
     *	new Date().toLocaleTimeString("sv-SE", { timeZone: "America/New_York" }),
     * );
     *
     */
    export function toTZ(date: any, tzString?: string): TimePoint;
    /**
     * Convenience function which returns a TimePoint object for later use in fromTZ
     *
     * @public
     * @static
     *
     * @param {Number} year - 1970--
     * @param {Number} month - 1-12
     * @param {Number} day - 1-31
     * @param {Number} hour - 0-24
     * @param {Number} minute - 0-60
     * @param {Number} second - 0-60
     * @param {string} timezone - Time zone in format 'Europe/Stockholm'
     *
     * @returns {TimePoint}
     *
    */
    export function tp(y: any, m: any, d: any, h: any, i: any, s: any, t: any): TimePoint;
    export { minitz };
}
