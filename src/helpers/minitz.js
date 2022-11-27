/* ------------------------------------------------------------------------------------

	minitz - MIT License - Hexagon <hexagon@56k.guru>

	Version 4.0.4
	
	------------------------------------------------------------------------------------

	License:

	Copyright (c) 2022 Hexagon <hexagon@56k.guru>

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.

  ------------------------------------------------------------------------------------  */

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
 function minitz(y, m, d, h, i, s, tz, throwOnInvalid) {
	return minitz.fromTZ(minitz.tp(y, m, d, h, i, s, tz), throwOnInvalid);
}

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
minitz.fromTZISO = (localTimeStr, tz, throwOnInvalid) => {
	return minitz.fromTZ(parseISOLocal(localTimeStr, tz), throwOnInvalid);
};

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
minitz.fromTZ = function(tp, throwOnInvalid) {

	const

		// Construct a fake Date object with UTC date/time set to local date/time in source timezone
		inDate = new Date(Date.UTC(
			tp.y,
			tp.m - 1,
			tp.d,
			tp.h,
			tp.i,
			tp.s
		)),

		// Get offset between UTC and source timezone
		offset = getTimezoneOffset(tp.tz, inDate),

		// Remove offset from inDate to hopefully get a true date object
		dateGuess = new Date(inDate.getTime() - offset),

		// Get offset between UTC and guessed time in target timezone
		dateOffsGuess = getTimezoneOffset(tp.tz, dateGuess);

	// If offset between guessed true date object and UTC matches initial calculation, the guess
	// was spot on
	if ((dateOffsGuess - offset) === 0) {
		return dateGuess;
	} else {
		// Not quite there yet, make a second try on guessing the local time, adjust by the offset indicated by the previous guess
		// Try recreating input time again
		// Then calculate and check the offset again
		const
			dateGuess2 = new Date(inDate.getTime() - dateOffsGuess),
			dateOffsGuess2 = getTimezoneOffset(tp.tz, dateGuess2);
		if ((dateOffsGuess2 - dateOffsGuess) === 0) {
			// All good, return local time
			return dateGuess2;
		} else if(!throwOnInvalid && (dateOffsGuess2 - dateOffsGuess) > 0) {
			// We're most probably dealing with a DST transition where we should use the offset of the second guess
			return dateGuess2; 
		} else if (!throwOnInvalid) {
			// We're most probably dealing with a DST transition where we should use the offset of the initial guess
			return dateGuess;
		} else {
			// Input time is invalid, and the library is instructed to throw, so let's do it
			throw new Error("Invalid date passed to fromTZ()");
		}
	}
};

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
minitz.toTZ = function (d, tzStr) {
	const td = new Date(d.toLocaleString("sv-SE", {timeZone: tzStr}));
	return {
		y: td.getFullYear(),
		m: td.getMonth() + 1,
		d: td.getDate(),
		h: td.getHours(),
		i: td.getMinutes(),
		s: td.getSeconds(),
		tz: tzStr
	};
};

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
minitz.tp = (y,m,d,h,i,s,tz) => { return { y, m, d, h, i, s, tz: tz }; };

/**
 * Helper function that returns the current UTC offset (in ms) for a specific timezone at a specific point in time
 *
 * @private
 *
 * @param {timeZone} string - Target time zone in IANA database format 'Europe/Stockholm'
 * @param {date} [date] - Point in time to use as base for offset calculation
 *
 * @returns {number} - Offset in ms between UTC and timeZone
 */
function getTimezoneOffset(timeZone, date = new Date()) {

	// Get timezone 
	const tz = date.toLocaleString("en", {timeZone, timeStyle: "long"}).split(" ").slice(-1)[0];

	// Extract time in en-US format
	// - replace narrow no break space with regular space to compensate for bug in Node.js 19.1
	const dateString = date.toLocaleString("en-US").replace(/[\u202f]/," ");

	// Check ms offset between GMT and extracted timezone
	return Date.parse(`${dateString} GMT`) - Date.parse(`${dateString} ${tz}`);
}


/**
 * Helper function that takes a ISO8001 local date time string and creates a Date object.
 * Throws on failure. Throws on invalid date or time.
 * 
 * @private
 *
 * @param {string} dtStr - an ISO 8601 format date and time string
 *					  with all components, e.g. 2015-11-24T19:40:00
 * @returns {TimePoint} - TimePoint instance from parsing the string
 */
function parseISOLocal(dtStr, tz) {

	// Parse date using built in Date.parse
	const pd = new Date(Date.parse(dtStr));

	// Check for completeness
	if (isNaN(pd)) {
		throw new Error("minitz: Invalid ISO8601 passed to parser.");
	}
	
	// If 
	//   * date/time is specified in UTC (Z-flag included)
	//   * or UTC offset is specified (+ or - included after character 9 (20200101 or 2020-01-0))
	// Return time in utc, else return local time and include timezone identifier
	const stringEnd = dtStr.substring(9);
	if (dtStr.includes("Z") || stringEnd.includes("-") || stringEnd.includes("+")) {
		return minitz.tp(pd.getUTCFullYear(), pd.getUTCMonth()+1, pd.getUTCDate(),pd.getUTCHours(), pd.getUTCMinutes(),pd.getUTCSeconds(), "Etc/UTC");
	} else {
		return minitz.tp(pd.getFullYear(), pd.getMonth()+1, pd.getDate(),pd.getHours(), pd.getMinutes(),pd.getSeconds(), tz);
	}
	// Treat date as local time, in target timezone

}

minitz.minitz = minitz;

export default minitz;
export { minitz };