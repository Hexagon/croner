/* ------------------------------------------------------------------------------------

	minitz - 1.0.1 - MIT License - Hexagon <hexagon@56k.guru>

	Bundled manually, check for updates at https://github.com/Hexagon/minitz

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
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.	IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.

	------------------------------------------------------------------------------------	*/

const minitz = {};

/**
	 * "Converts" a date to a specific time zone
	 * 
	 * **Note:** The resulting Date object will have local time set to target timezone, 
	 * but any functions/formatting working with UTC time, or offset will be misleading.
	 * 
	 * Only use this function to get a formatted local time string.
	 * 
	 * Example:
	 *	 let normalDate = new Date(); // d is a normal Date instance, with local timezone and correct utc representation
	 *			 tzDate = minitz.toTZ(d, 'America/New_York') // d is a tainted Date instance, where getHours() 
	 *																								 (for example) will return local time in new york, but getUTCHours()
	 *																								 will return something irrelevant.
	 * 
	 * @public
	 * 
	 * @param {date} date - Input date
	 * @param {string} tzString - Timezone string in Europe/Stockholm format
	 * @returns {date} - Date object with local time adjusted to target timezone. UTC time WILL be off.
	 */
minitz.toTZ = function (date, tzString) {
	return new Date(date.toLocaleString("sv-SE", {timeZone: tzString}));
};
	
/**
	 * Reverse of toTZ
	 * 
	 * @public
	 * 
	 * @param {date} date - Tainted input date, where local time is time in target timezone
	 * @param {string} tzString - Timezone string in Europe/Stockholm format
	 * @param {boolean} [throwOnInvalidTime] - Default is to return adjusted time if input time is during an DST switch. 
	 *																				E.g. assume 01:01:01 if input is 00:01:01 but time actually 
	 *																				skips from 23:59:59 to 01:00:00. Setting this flag makes the library throw instead.
	 * @returns {null|date} - Normal date object with correct UTC and Local time
	 */
minitz.fromTZ = function(inputDate, tzString, throwOnInvalidTime) {
	
	// Get initial offset between timezones starting from input time.
	// Then create a guessed local time by subtracting offset from input time
	// and try recreating input time using guessed local time and calculated offset.
	const 
		inputDateWithOffset = new Date(inputDate.toLocaleString("sv-SE", {timeZone: tzString})),
		offset = inputDate.getTime() - inputDateWithOffset.getTime(),
		guessedLocalDate = new Date(inputDate.getTime() + offset),
		guessedInputDate = new Date(guessedLocalDate.toLocaleString("sv-SE", {timeZone: tzString}));
		
	// Check if recreated input time matches actual input time
	const 
		guessedInputDateOffset = guessedInputDate.getTime() - inputDate.getTime();
	if (guessedInputDateOffset === 0) {
		// All good, return local time
		return guessedLocalDate;
	} else {
		// Not quite there yet, make a second try on guessing local time, adjust by the offset from previous guess
		// Try recreating input time again
		// Then calculate and check offset again
		const 
			guessedLocalDate2 = new Date(inputDate.getTime() + offset - guessedInputDateOffset),
			guessedInputDate2 = new Date(guessedLocalDate2.toLocaleString("sv-SE", {timeZone: tzString})),
			guessedInputDateOffset2 = guessedInputDate2.getTime() - inputDate.getTime();
		if (guessedInputDateOffset2 === 0) {
			// All good, return local time
			return guessedLocalDate2;
		} else if (!throwOnInvalidTime) {
			// Input time is invalid, it is probably a point in time skipped by a DST switch, return the local time adjusted by initial offset
			return guessedLocalDate;
		} else {
			// Input time is invalid, and the library is instructed to throw, so let's do it
			throw new Error("Invalid date passed to fromTZ()");
		}
	}

};
	
minitz.minitz = minitz;
export default minitz;
export { minitz };