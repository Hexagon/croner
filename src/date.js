import { minitz } from "./helpers/minitz.js";

// This import is only used by tsc for generating type definitions from js/jsdoc
// deno-lint-ignore no-unused-vars
import { CronOptions as CronOptions } from "./options.js"; // eslint-disable-line no-unused-vars

/** 
 * Constant defining the minimum number of days per month where index 0 = January etc.
 * 
 * Used to look if a date _could be_ out of bounds. The "could be" part is why february is pinned to 28 days.
 * 
 * @private
 * 
 * @constant
 * @type {Number[]}
 * 
*/
const DaysOfMonth = [31,28,31,30,31,30,31,31,30,31,30,31];

/**
 * Array of work to be done, consisting of subarrays described below:
 * @private
 * 
 * @constant
 * 
 * [
 *   First item is which member to process,
 *   Second item is which member to increment if we didn't find a mathch in current item,
 *   Third item is an offset. if months is handled 0-11 in js date object, and we get 1-12 from `this.minute`
 *   from pattern. Offset should be -1
 * ]
 * 
 */
const RecursionSteps = [
	["month", "year",  0],
	["day", "month", -1],
	["hour", "day",  0],
	["minute", "hour",  0],
	["second", "minute",  0],
];
    
/**
 * Converts date to CronDate
 * @constructor
 * 
 * @param {CronDate|Date|string} [d] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
 * @param {string|number} [tz] - String representation of target timezone in Europe/Stockholm format, or a number representing offset in minutes.
*/
function CronDate (d, tz) {	

	/**
	 * TimeZone
	 * @type {string|number|undefined}
	 */
	this.tz = tz;

	// Populate object using input date, or throw
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
	
	/* If this instance of CronDate has a target timezone set, 
	 * use minitz to convert input date object to target timezone
	 * before extracting hours, minutes, seconds etc.
	 * 
	 * If not, extract all parts from inDate as-is.
	 */
	if (this.tz !== void 0) {
		if (typeof this.tz === "number") {
			this.ms = inDate.getUTCMilliseconds();
			this.second = inDate.getUTCSeconds();
			this.minute = inDate.getUTCMinutes()+this.tz;
			this.hour = inDate.getUTCHours();
			this.day = inDate.getUTCDate();
			this.month  = inDate.getUTCMonth();
			this.year = inDate.getUTCFullYear();
			// Minute could be out of bounds, apply
			this.apply();
		} else {
			const d = minitz.toTZ(inDate, this.tz);
			this.ms = inDate.getMilliseconds();
			this.second = d.s;
			this.minute = d.i;
			this.hour = d.h;
			this.day = d.d;
			this.month  = d.m - 1;
			this.year = d.y;
		}
	} else {
		this.ms = inDate.getMilliseconds();
		this.second = inDate.getSeconds();
		this.minute = inDate.getMinutes();
		this.hour = inDate.getHours();
		this.day = inDate.getDate();
		this.month  = inDate.getMonth();
		this.year = inDate.getFullYear();
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

	/**
	 * Current full year, in local time or target timezone specified by `this.tz` 
	 * @type {number}
	 */
	this.year = d.year;

	/**
	 * Current month (1-12), in local time or target timezone specified by `this.tz`
	 * @type {number}
	 */
	this.month = d.month;

	/**
	 * Current day (1-31), in local time or target timezone specified by `this.tz`
	 * @type {number}
	 */
	this.day = d.day;

	/**
	 * Current hour (0-23), in local time or target timezone specified by `this.tz`
	 * @type {number}
	 */
	this.hour = d.hour;

	/**
	 * Current minute (0-59), in local time or target timezone specified by `this.tz`
	 * @type {number}
	 */
	this.minute = d.minute;

	/**
	 * Current second (0-59), in local time or target timezone specified by `this.tz`
	 * @type {number}
	 */
	this.second = d.second;
	
	/**
	 * Current milliseconds
	 * @type {number}
	 */
	this.ms = d.ms;
};

/**
 * Reset internal parameters (seconds, minutes, hours) if any of them have exceeded (or could have exceeded) their normal ranges
 * 
 * Will alway return true on february 29th, as that is a date that _could_ be out of bounds
 * 
 * @private
 */
CronDate.prototype.apply = function () {
	// If any value could be out of bounds, apply 
	if (this.month>11||this.day>DaysOfMonth[this.month]||this.hour>59||this.minute>59||this.second>59||this.hour<0||this.minute<0||this.second<0) {
		const d = new Date(Date.UTC(this.year, this.month, this.day, this.hour, this.minute, this.second, this.ms));
		this.ms = d.getUTCMilliseconds();
		this.second = d.getUTCSeconds();
		this.minute = d.getUTCMinutes();
		this.hour = d.getUTCHours();
		this.day = d.getUTCDate();
		this.month  = d.getUTCMonth();
		this.year = d.getUTCFullYear();
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
		// This is an optimization for every month except february, which has different number of days different years
		if (this.month !== 1) {
			lastDayOfMonth = DaysOfMonth[this.month]; // About 20% performance increase when using L
		} else {
			lastDayOfMonth = new Date(Date.UTC(this.year, this.month+1, 0,0,0,0,0)).getUTCDate();
		}
	}

	// Pre-calculate weekday if needed
	// Calculate offset weekday by ((fDomWeekDay + (targetDate - 1)) % 7)
	const fDomWeekDay = (!pattern.starDOW && target == "day") ? new Date(Date.UTC(this.year, this.month, 1,0,0,0,0)).getUTCDay() : undefined;

	for( let i = this[target] + offset; i < pattern[target].length; i++ ) {

		// this applies to all "levels"
		let match = pattern[target][i];

		// Special case for last day of month
		if (target === "day" && pattern.lastDayOfMonth && i-offset == lastDayOfMonth) {
			match = true;
		}

		// Special case for day of week
		if (target === "day" && !pattern.starDOW) {
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

			// Return 2 if changed, 1 if unchanged
			return (originalTarget !== this[target]) ? 2 : 1;
		}
	}

	// Return 3 if part was not matched
	return 3;
};

/**
 * Increment to next run time recursively
 * 
 * This function is currently capped at year 3000. Do you have a reason to go further? Open an issue on GitHub!

 * @private
 * 
 * @param {string} pattern - The pattern used to increment current state
 * @param {CronOptions} options - Cron options used for incrementing
 * @param {integer} doing - Which part to increment, 0 represent first item of RecursionSteps-array etc.
 * @return {CronDate|null} - Returns itthis for chaining, or null if increment wasnt possible
 */
CronDate.prototype.recurse = function (pattern, options, doing)  {

	// Find next month (or whichever part we're at)
	const res = this.findNext(options, RecursionSteps[doing][0], pattern, RecursionSteps[doing][2]);

	// Month (or whichever part we're at) changed
	if (res > 1) {
		// Flag following levels for reset
		let resetLevel = doing + 1;
		while(resetLevel < RecursionSteps.length) {
			this[RecursionSteps[resetLevel][0]] = -RecursionSteps[resetLevel][2];
			resetLevel++;
		}
		// Parent changed
		if (res=== 3) {
			// Do increment parent, and reset current level
			this[RecursionSteps[doing][1]]++;
			this[RecursionSteps[doing][0]] = -RecursionSteps[doing][2];
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
	if (doing >= RecursionSteps.length) {
		return this;

		// ... or out of bounds ?
	} else if (this.year >= 3000) {
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
	
	// Move to next second, or increment according to minimum interval indicated by option `interval: x`
	// Do not increment a full interval if this is the very first run
	this.second += (options.interval > 1 && hasPreviousRun) ? options.interval : 1;

	// Always reset milliseconds, so we are at the next second exactly
	this.ms = 0;

	// Make sure seconds has not gotten out of bounds
	this.apply();

	// Recursively change each part (y, m, d ...) until next match is found, return null on failure
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
	// If this is an internal call, return the date as is
	// Also use this option when no timezone or utcOffset is set
	if (internal || this.tz === void) {
		return new Date(this.year, this.month, this.day, this.hour, this.minute, this.second, this.ms);
	} else {
		// If .tz is a number, it indicates offset in minutes. UTC timestamp of the internal date objects will be off by the same number of minutes. 
		// Restore this, and return a date object with correct time set.
		if (typeof this.tz === "number") {
			return new Date(Date.UTC(this.year, this.month, this.day, this.hour, this.minute-this.tz, this.second, this.ms));

		// If .tz is something else (hopefully a string), it indicates the timezone of the "local time" of the internal date object
		// Use minitz to create a normal Date object, and return that.
		} else {
			return minitz(this.year, this.month+1, this.day, this.hour, this.minute, this.second, this.tz);
		}
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