import { DateTime } from "luxon";
/**
 * Converts date to CronDate
 * @constructor
 * 
 * @param {CronDate|date|string} [date] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
 * @param {string} [timezone] - String representation of target timezone in Europe/Stockholm format.
 */
function CronDate (date, timezone) {	

	this.timezone = timezone;
	
	if (!date || date instanceof Date) {
		this.fromDate(date);
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
 * @param {date} date - Input date
 * @param {boolean} fromLocal - Target already in local time 
 */
CronDate.prototype.fromDate = function (date) {
	let newDate;
	if (date) {
		newDate = DateTime.fromJSDate(date);
	} else {
		newDate = DateTime.now();
	}
	if (this.timezone) {
		newDate = newDate.setZone(this.timezone);
	}
	this.to = newDate;
};

/**
 * Sets internals by deep copying another CronDate
 * @private
 * 
 * @param {CronDate} date - Input date
 */
CronDate.prototype.fromCronDate = function (date) {
	this.timezone = date.timezone;
	this.to = date.to;
};

/**
 * Sets internals by parsing a string
 * @private
 * 
 * @param {date} date - Input date
 */
CronDate.prototype.fromString = function (str) {

	let parsedLuxonDate = DateTime.fromISO(str);

	// Throw if we did get an invalid date
	if( parsedLuxonDate.invalid ) {
		throw new TypeError("CronDate: Luxon: " + parsedLuxonDate.invalid + ": " + parsedLuxonDate.reason);
	}
	if (this.timezone) {
		parsedLuxonDate = parsedLuxonDate.setZone(this.timezone);
	}
	this.to = parsedLuxonDate;

};

/**
 * Increment to next run time
 * @public
 * 
 * @param {string} pattern - The pattern used to increment current state
 * @param {boolean} [rerun=false] - If this is an internal incremental run
 * @return {CronDate|null} - Returns itself for chaining, or null if increment wasnt possible
 */
CronDate.prototype.increment = function (pattern, rerun) {

	if (!rerun) {
		this.to = this.to.plus({second: 1});
	}

	this.to = this.to.set({millisecond: 0});
	
	let self = this,

		
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
		findNext = function (target, pattern, offset, override) {
			let startPos = (override === void 0) ? self.to[target] + offset : 0 + offset;
			for( let i = startPos; i < pattern[target].length; i++ ) {
				if( pattern[target][i] ) {
					self.to = self.to.set({[target]:i-offset});
					return true;
				}
			}
			return false;
		},
		
		resetPrevious = function () {
			// Now when we have gone to next minute, we have to set seconds to the first match
			// Now we are at 00:01:05 following the same example.
			// 
			// This goes all the way back to seconds, hence the reverse loop.
			while(doing >= 0) {
				// Ok, reset current member(e.g. seconds) to first match in pattern, using 
				// the same method as aerlier
				// 
				// Note the fourth parameter, stating that we should start matching the pattern
				// from zero, instead of current time.
				findNext(toDo[doing][0], pattern, toDo[doing][2], 0);

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
	let toDo = [
			["second", "minute", 0],
			["minute", "hour", 0],
			["hour", "day", 0],
			["day", "month", -1],
			["month", "year", -1]
		],
		doing = 0;

	// Ok, we're working our way trough the toDo array, top to bottom
	// If we reach 5, work is done
	while(doing < 5) {

		// findNext sets the current member to next match in pattern
		// If time is 00:00:01 and pattern says *:*:05, seconds will
		// be set to 5

		// If pattern didn't provide a match, increment next vanlue (e.g. minues)
		if(!findNext(toDo[doing][0], pattern, toDo[doing][2])) {
			this.to = this.to.plus({[toDo[doing][1]]:1});
			resetPrevious();
		}

		// Check for impossible combination
		if (this.to.year >= 5000) {
			return null;
		}

		// Gp down, seconds -> minutes -> hours -> days -> months -> year
		doing++;
	}

	// This is a special case for weekday, as the user isn't able to combine date/month patterns 
	// with weekday patterns, it's just to increment days until we get a match.
	let weekdayChanged = false;
	while (!pattern.daysOfWeek[this.to.weekday]) {
		this.to = this.to.plus({day:1});
		doing = 2;
		resetPrevious();
		weekdayChanged = true;
	}

	// If anything changed, recreate this CronDate and run again without incrementing
	if (weekdayChanged) {
		if (this.to.year >= 5000) {
			// Stop incrementing, an impossible pattern is used
			return null;
		} else {
			return self.increment(pattern, true);
		}
	} else {
		return this;
	}

};

/**
 * Convert current state back to a javascript Date()
 * @public
 * 
 * @returns {date}
 */
CronDate.prototype.getDate = function () {
	return new Date(this.to.toLocal().ts);
};

/**
 * Convert current state back to a javascript Date() and return UTC milliseconds
 * @public
 * 
 * @returns {date}
 */
CronDate.prototype.getTime = function () {
	return this.to.ts;
};

export { CronDate };