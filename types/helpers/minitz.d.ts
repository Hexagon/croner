export default minitz;
export type TimePoint = {
    /**
     * - 1970--
     */
    y: number;
    /**
     * - 1-12
     */
    m: number;
    /**
     * - 1-31
     */
    d: number;
    /**
     * - 0-24
     */
    h: number;
    /**
     * - 0-60 Minute
     */
    i: number;
    /**
     * - 0-60
     */
    s: number;
    /**
     * - Time zone in IANA database format 'Europe/Stockholm'
     */
    tz: string;
};
/**
 * @typedef {Object} TimePoint
 * @property {Number} y - 1970--
 * @property {Number} m - 1-12
 * @property {Number} d - 1-31
 * @property {Number} h - 0-24
 * @property {Number} i - 0-60 Minute
 * @property {Number} s - 0-60
 * @property {string} tz - Time zone in IANA database format 'Europe/Stockholm'
 */
/**
 * Converts a date/time from a specific timezone to a normal date object using the system local time
 *
 * Shortcut for minitz.fromTZ(minitz.tp(...));
 *
 * @constructor
 *
 * @param {Number} y - 1970--
 * @param {Number} m - 1-12
 * @param {Number} d - 1-31
 * @param {Number} h - 0-24
 * @param {Number} i - 0-60 Minute
 * @param {Number} s - 0-60
 * @param {string} tz - Time zone in IANA database format 'Europe/Stockholm'
 * @param {boolean} [throwOnInvalid] - Default is to return the adjusted time if the call happens during a Daylight-Saving-Time switch.
 *										E.g. Value "01:01:01" is returned if input time is 00:01:01 while one hour got actually
 *										skipped, going from 23:59:59 to 01:00:00. Setting this flag makes the library throw an exception instead.
 * @returns {date} - Normal date object with correct UTC and system local time
 *
 */
export function minitz(y: number, m: number, d: number, h: number, i: number, s: number, tz: string, throwOnInvalid?: boolean): date;
export class minitz {
    /**
     * @typedef {Object} TimePoint
     * @property {Number} y - 1970--
     * @property {Number} m - 1-12
     * @property {Number} d - 1-31
     * @property {Number} h - 0-24
     * @property {Number} i - 0-60 Minute
     * @property {Number} s - 0-60
     * @property {string} tz - Time zone in IANA database format 'Europe/Stockholm'
     */
    /**
     * Converts a date/time from a specific timezone to a normal date object using the system local time
     *
     * Shortcut for minitz.fromTZ(minitz.tp(...));
     *
     * @constructor
     *
     * @param {Number} y - 1970--
     * @param {Number} m - 1-12
     * @param {Number} d - 1-31
     * @param {Number} h - 0-24
     * @param {Number} i - 0-60 Minute
     * @param {Number} s - 0-60
     * @param {string} tz - Time zone in IANA database format 'Europe/Stockholm'
     * @param {boolean} [throwOnInvalid] - Default is to return the adjusted time if the call happens during a Daylight-Saving-Time switch.
     *										E.g. Value "01:01:01" is returned if input time is 00:01:01 while one hour got actually
     *										skipped, going from 23:59:59 to 01:00:00. Setting this flag makes the library throw an exception instead.
     * @returns {date} - Normal date object with correct UTC and system local time
     *
     */
    constructor(y: number, m: number, d: number, h: number, i: number, s: number, tz: string, throwOnInvalid?: boolean);
}
export namespace minitz {
    /**
     * Converts a date/time from a specific timezone to a normal date object using the system local time
     *
     * @public
     * @static
     *
     * @param {string} localTimeStr - ISO8601 formatted local time string, non UTC
     * @param {string} tz - Time zone in IANA database format 'Europe/Stockholm'
     * @param {boolean} [throwOnInvalid] - Default is to return the adjusted time if the call happens during a Daylight-Saving-Time switch.
     *										E.g. Value "01:01:01" is returned if input time is 00:01:01 while one hour got actually
     *										skipped, going from 23:59:59 to 01:00:00. Setting this flag makes the library throw an exception instead.
     * @return {date} - Normal date object
     *
     */
    export function fromTZISO(localTimeStr: string, tz: string, throwOnInvalid?: boolean): date;
    /**
     * Converts a date/time from a specific timezone to a normal date object using the system local time
     *
     * @public
     * @static
     *
     * @param {TimePoint} tp - Object with specified timezone
     * @param {boolean} [throwOnInvalid] - Default is to return the adjusted time if the call happens during a Daylight-Saving-Time switch.
     *										E.g. Value "01:01:01" is returned if input time is 00:01:01 while one hour got actually
     *										skipped, going from 23:59:59 to 01:00:00. Setting this flag makes the library throw an exception instead.
     * @returns {date} - Normal date object
     */
    export function fromTZ(tp: TimePoint, throwOnInvalid?: boolean): date;
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
     * @param {d} date - Input date
     * @param {string} [tzStr] - Timezone string in Europe/Stockholm format
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
     * //  y: 2022,
     * //  m: 9,
     * //  d: 28,
     * //  h: 13,
     * //  i: 28,
     * //  s: 28,
     * //  tz: "America/New_York"
     * // }
     *
     * @example <caption>Example using vanilla js:</caption>
     * console.log(
     *	// Display current time in America/New_York, using sv-SE locale
     *	new Date().toLocaleTimeString("sv-SE", { timeZone: "America/New_York" }),
     * );
     *
     */
    export function toTZ(d: any, tzStr?: string): TimePoint;
    /**
     * Convenience function which returns a TimePoint object for later use in fromTZ
     *
     * @public
     * @static
     *
     * @param {Number} y - 1970--
     * @param {Number} m - 1-12
     * @param {Number} d - 1-31
     * @param {Number} h - 0-24
     * @param {Number} i - 0-60 Minute
     * @param {Number} s - 0-60
     * @param {string} tz - Time zone in format 'Europe/Stockholm'
     *
     * @returns {TimePoint}
     *
    */
    export function tp(y: number, m: number, d: number, h: number, i: number, s: number, tz: string): TimePoint;
    export { minitz };
}
