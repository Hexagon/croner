import { minitz } from "./helpers/minitz.js";

// This import is only used by tsc for generating type definitions from js/jsdoc
// deno-lint-ignore no-unused-vars
import { CronOptions as CronOptions } from "./options.js"; // eslint-disable-line no-unused-vars


// Constant defining the minimum number of days per month where index 0 = January etc.
const DaysOfMonth = [31,28,31,30,31,30,31,31,30,31,30,31];

// Array of work to be done, consisting of subarrays described below:
// [
//   First item is which member to process,
//   Second item is which member to increment if we didn't find a mathch in current item,
//   Third item is an offset. if months is handled 0-11 in js date object, and we get 1-12
//   from pattern. Offset should be -1
// ]
const ToDo = [
	["m", "y", 0],
	["d", "m", -1],
	["h", "d", 0],
	["i", "h", 0],
	["s", "i", 0],
];
    
/**
 * Converts date to CronDate
 * @constructor
 * 
 * @param {CronDate|Date|string} [d] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
 * @param {string} [tz] - String representation of target timezone in Europe/Stockholm format.
*/
function CronDate (d, tz) {	

	this.tz = tz;

	if (d && d instanceof Date) {
		if (!isNaN(d)) {
			this.fromDate(d);
		} else {
			throw new TypeError("CronDate: Invalid date passed to CronDate constructor");
		}
	} else if (d === void 0) {
		this.fromDate(new Date());
	} else if (d && typeof d === "string") {
		this.fromString(d);
	} else if (d instanceof CronDate) {
		this.fromCronDate(d);
	} else {
		throw new TypeError("CronDate: Invalid type (" + typeof d + ") passed to CronDate constructor");
	}

}

/**
 * Sets internals using a Date 
 * @private
 * 
 * @param {Date} inDate - Input date in local time
 */
CronDate.prototype.fromDate = function (inDate) {
	
	if (this.tz) {
		const d = minitz.toTZ(inDate, this.tz);
		this.ms = inDate.getMilliseconds();
		this.s = d.s;
		this.i = d.i;
		this.h = d.h;
		this.d = d.d;
		this.m  = d.m - 1;
		this.y = d.y;
	} else {
		this.ms = inDate.getMilliseconds();
		this.s = inDate.getSeconds();
		this.i = inDate.getMinutes();
		this.h = inDate.getHours();
		this.d = inDate.getDate();
		this.m  = inDate.getMonth();
		this.y = inDate.getFullYear();
	}

};

/**
 * Sets internals by deep copying another CronDate
 * @private
 * 
 * @param {CronDate} d - Input date
 */
CronDate.prototype.fromCronDate = function (d) {
	this.tz = d.tz;
	this.ms = d.ms;
	this.s = d.s;
	this.i = d.i;
	this.h = d.h;
	this.d = d.d;
	this.m = d.m;
	this.y = d.y;
};

/**
 * Reset internal parameters (seconds, minutes, hours) if any of them have exceeded (or could have exceeded) their ranges
 * @private
 */
CronDate.prototype.apply = function () {
	// If any value could be out of bounds, apply 
	if (this.m>11||this.d>DaysOfMonth[this.m]||this.h>59||this.i>59||this.s>59) {
		const d = new Date(Date.UTC(this.y, this.m, this.d, this.h, this.i, this.s, this.ms));
		this.ms = d.getUTCMilliseconds();
		this.s = d.getUTCSeconds();
		this.i = d.getUTCMinutes();
		this.h = d.getUTCHours();
		this.d = d.getUTCDate();
		this.m  = d.getUTCMonth();
		this.y = d.getUTCFullYear();
		return true;
	} else {
		return false;
	}
};

/**
 * Sets internals by parsing a string
 * @private
 * 
 * @param {Date} date - Input date
 */
CronDate.prototype.fromString = function (str) {
	return this.fromDate(minitz.fromTZISO(str, this.tz));
};

/**
 * Find next match of current part
 * @private
 *  
 * @param {CronOptions} options - Cron options used for incrementing
 * @param {string} target
 * @param {CronPattern} pattern
 * @param {Number} offset
 * 
 * @returns {boolean}
 * 
 */
CronDate.prototype.findNext = function (options, target, pattern, offset) {
	const originalTarget = this[target];

	// In the conditions below, local time is not relevant. And as new Date(Date.UTC(y,m,d)) is way faster 
	// than new Date(y,m,d). We use the UTC functions to set/get date parts.

	// Pre-calculate last day of month if needed
	let lastDayOfMonth;
	if (pattern.lastDayOfMonth) {
		if (this.m !== 1) {
			lastDayOfMonth = DaysOfMonth[this.m]; // About 20% performance increase when using L
		} else {
			lastDayOfMonth = new Date(Date.UTC(this.y, this.m+1, 0,0,0,0,0)).getUTCDate();
		}
	}

	// Pre-calculate weekday if needed
	// Calculate offset weekday by ((fDomWeekDay + (targetDate - 1)) % 7)
	const fDomWeekDay = (!pattern.starDOW && target == "d") ? new Date(Date.UTC(this.y, this.m, 1,0,0,0,0)).getUTCDay() : undefined;

	for( let i = this[target] + offset; i < pattern[target].length; i++ ) {

		// this applies to all "levels"
		let match = pattern[target][i];

		// Special case for last day of month
		if (target === "d" && pattern.lastDayOfMonth && i-offset == lastDayOfMonth) {
			match = true;
		}

		// Special case for day of week
		if (target === "d" && !pattern.starDOW) {
			const dowMatch = pattern.dow[(fDomWeekDay + ((i-offset) - 1)) % 7];
			// If we use legacyMode, and dayOfMonth is specified - use "OR" to combine day of week with day of month
			// In all other cases use "AND"
			if (options.legacyMode && !pattern.starDOM) {
				match = match || dowMatch;
			} else {
				match = match && dowMatch;
			}
		}

		if (match) {
			this[target] = i-offset;
			if (originalTarget !== this[target]) {
				// Changed
				return 2;
			} else {
				// Unchanged
				return 1;
			}
		}
	}
	return 3;
};

/**
 * Increment to next run time recursively
 * @private
 * 
 * @param {string} pattern - The pattern used to increment current state
 * @param {CronOptions} options - Cron options used for incrementing
 * @param {integer} doing - Which part to increment, 0 represent first item of ToDo-array etc.
 * @return {CronDate|null} - Returns itthis for chaining, or null if increment wasnt possible
 */
CronDate.prototype.recurse = function (pattern, options, doing)  {

	// Find next month (or whichever part we're at)
	const res = this.findNext(options, ToDo[doing][0], pattern, ToDo[doing][2]);

	// Month (or whichever part we're at) changed
	if (res > 1) {
		// Flag following levels for reset
		let resetLevel = doing + 1;
		while(resetLevel < ToDo.length) {
			this[ToDo[resetLevel][0]] = -ToDo[resetLevel][2];
			resetLevel++;
		}
		// Parent changed
		if (res=== 3) {
			// Do increment parent, and reset current level
			this[ToDo[doing][1]]++;
			this[ToDo[doing][0]] = -ToDo[doing][2];
			this.apply();

			// Restart
			return this.recurse(pattern, options, 0);
		} else if (this.apply()) {
			return this.recurse(pattern, options, doing-1);
		}

	}

	// Move to next level
	doing += 1;

	// Done?
	if (doing >= ToDo.length) {
		return this;

		// ... or out of bounds ?
	} else if (this.y >= 3000) {
		return null;

		// ... oh, go to next part then
	} else {

		return this.recurse(pattern, options, doing);
	}
    
};

/**
 * Increment to next run time
 * @public
 * 
 * @param {string} pattern - The pattern used to increment current state
 * @param {CronOptions} options - Cron options used for incrementing
 * @param {boolean} [hasPreviousRun] - If this run should adhere to minimum interval
 * @return {CronDate|null} - Returns itthis for chaining, or null if increment wasnt possible
 */
CronDate.prototype.increment = function (pattern, options, hasPreviousRun) {
	
	// Always add one second, or minimum interval, then clear milliseconds and apply changes if seconds has gotten out of bounds
	if (options.interval > 1 && hasPreviousRun) {
		this.s += options.interval;
	} else {
		this.s += 1;
	}
	this.ms = 0;
	this.apply();


	return this.recurse(pattern, options, 0);
	
};

/**
 * Convert current state back to a javascript Date()
 * @public
 * 
 * @param {boolean} internal - If this is an internal call
 * @returns {Date}
 */
CronDate.prototype.getDate = function (internal) {
	if (internal || !this.tz) {
		return new Date(this.y, this.m, this.d, this.h, this.i, this.s, this.ms);
	} else {
		return minitz(this.y, this.m+1, this.d, this.h, this.i, this.s, this.tz);
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