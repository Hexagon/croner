/* ------------------------------------------------------------------------------------

	minitz 2.1.3 - MIT License - Hexagon <hexagon@56k.guru>

	Bundled manually, check https://github.com/Hexagon/minitz for updates

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
function minitz(year, month, day, hour, minute, second, timezone, throwOnInvalidTime) {
	return minitz.fromTZ(minitz.tp(year, month, day, hour, minute, second, timezone), throwOnInvalidTime);
}

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
minitz.fromTZISO = (localTimeString, timezone, throwOnInvalidTime) => {
	return minitz.fromTZ(parseISOLocal(localTimeString, timezone), throwOnInvalidTime);
};

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
minitz.fromTZ = function(timePoint, throwOnInvalidTime) {

	const

		// Construct a fake Date object with UTC date/time set to local date/time in source timezone
		inputDate = new Date(Date.UTC(
			timePoint.year,
			timePoint.month - 1,
			timePoint.day,
			timePoint.hour,
			timePoint.minute,
			timePoint.second
		)),

		// Get offset between UTC and source timezone
		offset = getTimezoneOffset(timePoint.timezone, inputDate),

		// Remove offset from inputDate to hopefully get a true date object
		guessedLocalDate = new Date(inputDate.getTime() - offset),

		// Get offset between UTC and guessed time in target timezone
		guessedInputDateOffset = getTimezoneOffset(timePoint.timezone, guessedLocalDate);

	// If offset between guessed true date object and UTC matches initial calculation, the guess
	// was spot on
	if ((guessedInputDateOffset - offset) === 0) {
		return guessedLocalDate;
	} else {
		// Not quite there yet, make a second try on guessing the local time, adjust by the offset indicated by the previous guess
		// Try recreating input time again
		// Then calculate and check the offset again
		const
			guessedLocalDate2 = new Date(inputDate.getTime() - guessedInputDateOffset),
			guessedInputDateOffset2 = getTimezoneOffset(timePoint.timezone, guessedLocalDate2);
		if ((guessedInputDateOffset2 - guessedInputDateOffset) === 0) {
			// All good, return local time
			return guessedLocalDate2;
		} else if (!throwOnInvalidTime) {
			// This guess wasn't spot on either, we're most probably dealing with a DST transition
			// - return the local time adjusted by _initial_ offset
			return guessedLocalDate;
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
minitz.toTZ = function (date, tzString) {
	const target = new Date(date.toLocaleString("sv-SE", {timeZone: tzString}));
	return {
		year: target.getFullYear(),
		month: target.getMonth() + 1,
		day: target.getDate(),
		hour: target.getHours(),
		minute: target.getMinutes(),
		second: target.getSeconds(),
		timezone: tzString
	};
};

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
minitz.tp = (y,m,d,h,i,s,t) => { return { year: y, month: m, day: d, hour: h, minute: i, second: s, timezone: t }; };

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
	const tz = date.toLocaleString("en", {timeZone, timeStyle: "long"}).split(" ").slice(-1)[0];
	const dateString = date.toString();
	return Date.parse(`${dateString} UTC`) - Date.parse(`${dateString} ${tz}`);
}


/**
 * Helper function that takes a ISO8001 local date time string and creates a Date object.
 * Throws on failure. Throws on invalid date or time.
 * 
 * @private
 *
 * @param {string} dateTimeString - an ISO 8601 format date and time string
 *					  with all components, e.g. 2015-11-24T19:40:00
 * @returns {TimePoint} - TimePoint instance from parsing the string
 */
function parseISOLocal(dateTimeString, timezone) {
	const dateTimeStringSplit = dateTimeString.split(/\D/);

	// Check for completeness
	if (dateTimeStringSplit.length < 6) {
		throw new Error("minitz: Incomplete ISO8601 passed to parser.");
	}

	const
		year = parseInt(dateTimeStringSplit[0], 10),
		month = parseInt(dateTimeStringSplit[1], 10),
		day = parseInt(dateTimeStringSplit[2], 10),
		hour = parseInt(dateTimeStringSplit[3], 10),
		minute = parseInt(dateTimeStringSplit[4], 10),
		second = parseInt(dateTimeStringSplit[5], 10);

	// Check parts for numeric
	if( isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute) || isNaN(second) ) {
		throw new Error("minitz: Could not parse ISO8601 string.");
	} else {
		// Check generated date
		const generatedDate = new Date(Date.UTC(year, month-1, day, hour, minute, second));
		if (!(year == generatedDate.getUTCFullYear()
			&& month == generatedDate.getUTCMonth()+1
			&& day == generatedDate.getUTCDate()
			&& hour == generatedDate.getUTCHours()
			&& minute == generatedDate.getUTCMinutes()
			&& second == generatedDate.getUTCSeconds())) {
			throw new Error("minitz: ISO8601 string contains invalid date or time");
		}
		// Check for UTC flag
		if ((dateTimeString.indexOf("Z") > 0)) {
			// Handle date as UTC time, ignoring input timezone
			return minitz.tp(year, month, day, hour, minute, second, "Etc/UTC");
		} else {
			// Handle date as local time, and convert from specified time zone
			// Note: Date already validated by the UTC-parsing
			return minitz.tp(year, month, day, hour, minute, second, timezone);
		}
	}
}

minitz.minitz = minitz;

export default minitz;
export { minitz };