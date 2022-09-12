import { minitz } from "./tz.js";

// This import is only used by tsc for generating type definitions from js/jsdoc
// deno-lint-ignore no-unused-vars
import { CronOptions as CronOptions } from "./options.js"; // eslint-disable-line no-unused-vars

/**
 * Converts date to CronDate
 * @constructor
 * 
 * @param {CronDate|date|string} [date] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
 * @param {string} [timezone] - String representation of target timezone in Europe/Stockholm format.
*/
function CronDate (date, timezone) {	

	this.timezone = timezone;

	if (date && date instanceof Date) {
		if (!isNaN(date)) {
			this.fromDate(date);
		} else {
			throw new TypeError("CronDate: Invalid date passed as parameter to CronDate constructor");
		}
	} else if (date === void 0) {
		this.fromDate(new Date());
	} else if (date && typeof date === "string") {
		this.fromString(date);
	} else if (date instanceof CronDate) {
		this.fromCronDate(date);
	} else {
		throw new TypeError("CronDate: Invalid type (" + typeof date + ") passed as parameter to CronDate constructor");
	}

}

/**
 * Sets internals using a Date 
 * @private
 * 
 * @param {Date} date - Input date
 */
CronDate.prototype.fromDate = function (date) {
	
	if (this.timezone) {
		date = minitz.toTZ(date, this.timezone);
	}

	this.milliseconds = date.getMilliseconds();
	this.seconds = date.getSeconds();
	this.minutes = date.getMinutes();
	this.hours = date.getHours();
	this.days = date.getDate();
	this.months  = date.getMonth();
	this.years = date.getFullYear();

};

/**
 * Sets internals by deep copying another CronDate
 * @private
 * 
 * @param {CronDate} date - Input date
 */
CronDate.prototype.fromCronDate = function (date) {
	this.timezone = date.timezone;
	this.milliseconds = date.milliseconds;
	this.seconds = date.seconds;
	this.minutes = date.minutes;
	this.hours = date.hours;
	this.days = date.days;
	this.months = date.months;
	this.years = date.years;
};

/**
 * Reset internal parameters (seconds, minutes, hours) that may have exceeded their ranges
 * @private
 * 
 * @param {Date} date - Input date
 */
CronDate.prototype.apply = function () {
	const newDate = new Date(this.years, this.months, this.days, this.hours, this.minutes, this.seconds, this.milliseconds);
	
	this.milliseconds = newDate.getMilliseconds();
	this.seconds = newDate.getSeconds();
	this.minutes = newDate.getMinutes();
	this.hours = newDate.getHours();
	this.days = newDate.getDate();
	this.months  = newDate.getMonth();
	this.years = newDate.getFullYear();
};

/**
 * Sets internals by parsing a string
 * @private
 * 
 * @param {Date} date - Input date
 */
CronDate.prototype.fromString = function (str) {

	const parsedDate = this.parseISOLocal(str);

	// Throw if we did get an invalid date
	if( isNaN(parsedDate) ) {
		throw new TypeError("CronDate: Provided string value for CronDate could not be parsed as date.");
	}
	
	this.fromDate(parsedDate);
};

/**
 * Increment to next run time
 * @public
 * 
 * @param {string} pattern - The pattern used to increment current state
 * @param {CronOptions} options - Cron options used for incrementing
 * @param {boolean} [hasPreviousRun] - If this run should adhere to minimum interval
 * @return {CronDate|null} - Returns itself for chaining, or null if increment wasnt possible
 */
CronDate.prototype.increment = function (pattern, options, hasPreviousRun) {
	
	// Always add one second, or minimum interval, then clear milliseconds and apply changes if seconds has gotten out of bounds
	if (options.interval > 1 && hasPreviousRun) {
		this.seconds += options.interval;
	} else {
		this.seconds += 1;
	}
	this.milliseconds = 0;
	this.apply();
	
	const 

		/**
		 * Find next
		 * 
		 * @param {string} target
		 * @param {string} pattern
		 * @param {string} offset
		 * @param {string} override
		 * 
		 * @returns {boolean}
		 * 
		 */
		findNext = (target, pattern, offset, override) => {
			
			const startPos = (override === void 0) ? this[target] + offset : 0;

			for( let i = startPos; i < pattern[target].length; i++ ) {

				// This applies to all "levels"
				let match = pattern[target][i];

				// Days has a couple of special cases
				if (target === "days") {

					// Create a date object for the target date
					const targetDate = this.getDate(true);
					targetDate.setDate(i-offset);

					// Special handling for L (last day of month), when we are searching for days
					if (pattern.lastDayOfMonth) {

						// Create a copy of targetDate
						// Set days to one day after today, if month changes, then we are at the last day of the month
						const targetDateCopy = new Date(targetDate);
						targetDateCopy.setDate(i-offset+1);
				
						// Overwrite match if last day of month is matching
						if (targetDateCopy.getMonth() !== this.months) {
							match = true;
						}
						
					}

					// Weekdays must also match when incrementing days
					// If running in legacy mode, it is sufficient that only weekday match.
					const dowMatch = pattern.daysOfWeek[targetDate.getDay()];
					if (options.legacyMode) {
						if (!pattern.starDayOfWeek && pattern.starDayOfMonth) {
							match = dowMatch;
						} else if (!pattern.starDayOfWeek && !pattern.starDayOfMonth) {
							match = match || dowMatch;
						}
					} else {
						// dom AND dow
						match = match && dowMatch;
					}

				}

				if (match) {
					this[target] = i-offset;
					return true;
				}

			}
			return false;

		},
		
		resetPrevious = (offset) => {
			// Now when we have gone to next minute, we have to set seconds to the first match
			// Now we are at 00:01:05 following the same example.
			// 
			// This goes all the way back to seconds, hence the reverse loop.
			while(doing + offset >= 0) {

				// Ok, reset current member(e.g. seconds) to first match in pattern, using 
				// the same method as aerlier
				// 
				// Note the fourth parameter, stating that we should start matching the pattern
				// from zero, instead of current time.
				findNext(toDo[doing + offset][0], pattern, toDo[doing + offset][2], 0);

				// Go back up, days -> hours -> minutes -> seconds
				doing--;
			}
		};

	// Array of work to be done, consisting of subarrays described below:
	// [
	//   First item is which member to process,
	//   Second item is which member to increment if we didn't find a mathch in current item,
	//   Third item is an offset. if months is handled 0-11 in js date object, and we get 1-12
	//   from pattern. Offset should be -1
	// ]
	const toDo = [
		["seconds", "minutes", 0],
		["minutes", "hours", 0],
		["hours", "days", 0],
		["days", "months", -1],
		["months", "years", 0]
	];

	// Ok, we're working our way trough the toDo array, top to bottom
	// If we reach 5, work is done
	let doing = 0;
	while(doing < 5) {

		// findNext sets the current member to next match in pattern
		// If time is 00:00:01 and pattern says *:*:05, seconds will
		// be set to 5

		// Store current value at current level
		const currentValue = this[toDo[doing][0]];
		
		// If pattern didn't provide a match, increment next value (e.g. minues)
		if(!findNext(toDo[doing][0], pattern, toDo[doing][2])) {

			this[toDo[doing][1]]++;

			// Reset current level and previous levels
			resetPrevious(0);

			// Apply changes if any value has gotten out of bounds
			this.apply();
			
		// If pattern provided a match, but changed current value ...
		} else if (currentValue !== this[toDo[doing][0]]) {

			// Reset previous levels
			resetPrevious(-1);

		}

		// Bail out if an impossible pattern is used
		if (this.years >= 4000) {
			return null;
		}
		
		// Gp down, seconds -> minutes -> hours -> days -> months -> year
		doing++;
	}

	// If anything changed, recreate this CronDate and run again without incrementing
	return this;
	
};

/**
 * Convert current state back to a javascript Date()
 * @public
 * 
 * @param {boolean} internal - If this is an internal call
 * @returns {Date}
 */
CronDate.prototype.getDate = function (internal) {
	const targetDate = new Date(this.years, this.months, this.days, this.hours, this.minutes, this.seconds, this.milliseconds);
	if (internal || !this.timezone) {
		return targetDate;
	} else {
		return minitz.fromTZ(targetDate, this.timezone);
	}
};

/**
 * Convert current state back to a javascript Date() and return UTC milliseconds
 * @public
 * 
 * @param {boolean} internal - If this is an internal call
 * @returns {Date}
 */
CronDate.prototype.getTime = function (internal) {
	return this.getDate(internal).getTime();
};

/**
 * Takes a iso 8001 local date time string and creates a Date object
 * @private
 * 
 * @param {string} dateTimeString - an ISO 8001 format date and time string
 *                      with all components, e.g. 2015-11-24T19:40:00
 * @returns {Date|number} - Date instance from parsing the string. May be NaN.
 */
CronDate.prototype.parseISOLocal = function (dateTimeString) {
	const dateTimeStringSplit = dateTimeString.split(/\D/);

	// Check for completeness
	if (dateTimeStringSplit.length < 6) {
		return NaN;
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
		return NaN;
	} else {
		let generatedDate;

		// Check for UTC flag
		if ((dateTimeString.indexOf("Z") > 0)) {

			// Handle date as UTC
			generatedDate = new Date(Date.UTC(year, month-1, day, hour, minute, second));

			// Check generated date
			if (year == generatedDate.getUTCFullYear()
				&& month == generatedDate.getUTCMonth()+1
				&& day == generatedDate.getUTCDate()
				&& hour == generatedDate.getUTCHours()
				&& minute == generatedDate.getUTCMinutes()
				&& second == generatedDate.getUTCSeconds()) {
				return generatedDate;
			} else {
				return NaN;
			}
		} else {

			// Handle date as local time
			generatedDate = new Date(year, month-1, day, hour, minute, second);

			// Check generated date
			if (year == generatedDate.getFullYear()
				&& month == generatedDate.getMonth()+1
				&& day == generatedDate.getDate()
				&& hour == generatedDate.getHours()
				&& minute == generatedDate.getMinutes()
				&& second == generatedDate.getSeconds()) {
				return generatedDate;
			} else {
				return NaN;
			}
		}
	}
};

export { CronDate };