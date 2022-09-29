import { minitz } from "./helpers/minitz.js";

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
 * @param {Date} date - Input date in local time
 */
CronDate.prototype.fromDate = function (inputDate) {
	
	if (this.timezone) {
		const date = minitz.toTZ(inputDate, this.timezone);
		this.milliseconds = inputDate.getMilliseconds();
		this.seconds = date.second;
		this.minutes = date.minute;
		this.hours = date.hour;
		this.days = date.day;
		this.months  = date.month - 1;
		this.years = date.year;
	} else {
		this.milliseconds = inputDate.getMilliseconds();
		this.seconds = inputDate.getSeconds();
		this.minutes = inputDate.getMinutes();
		this.hours = inputDate.getHours();
		this.days = inputDate.getDate();
		this.months  = inputDate.getMonth();
		this.years = inputDate.getFullYear();
	}

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
	const newDate = new Date(Date.UTC(this.years, this.months, this.days, this.hours, this.minutes, this.seconds, this.milliseconds));
	
	this.milliseconds = newDate.getUTCMilliseconds();
	this.seconds = newDate.getUTCSeconds();
	this.minutes = newDate.getUTCMinutes();
	this.hours = newDate.getUTCHours();
	this.days = newDate.getUTCDate();
	this.months  = newDate.getUTCMonth();
	this.years = newDate.getUTCFullYear();
};

/**
 * Sets internals by parsing a string
 * @private
 * 
 * @param {Date} date - Input date
 */
CronDate.prototype.fromString = function (str) {
	return this.fromDate(minitz.fromTZISO(str, this.timezone));
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
	if (internal || !this.timezone) {
		return new Date(this.years, this.months, this.days, this.hours, this.minutes, this.seconds, this.milliseconds);
	} else {
		return minitz(this.years, this.months+1, this.days, this.hours, this.minutes, this.seconds, this.timezone);
	}
};

/**
 * Convert current state back to a javascript Date() and return UTC milliseconds
 * @public
 * 
 * @returns {Date}
 */
CronDate.prototype.getTime = function () {
	return this.getDate().getTime();
};

export { CronDate };