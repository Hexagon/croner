import { minitz } from "./helpers/minitz.js";

// This import is only used by tsc for generating type definitions from js/jsdoc
// deno-lint-ignore no-unused-vars
import { CronOptions as CronOptions } from "./options.js"; // eslint-disable-line no-unused-vars

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
 * Reset internal parameters (seconds, minutes, hours) that may have exceeded their ranges
 * @private
 */
CronDate.prototype.apply = function () {
	const d = new Date(Date.UTC(this.y, this.m, this.d, this.h, this.i, this.s, this.ms));
	
	this.ms = d.getUTCMilliseconds();
	this.s = d.getUTCSeconds();
	this.i = d.getUTCMinutes();
	this.h = d.getUTCHours();
	this.d = d.getUTCDate();
	this.m  = d.getUTCMonth();
	this.y = d.getUTCFullYear();
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
		this.s += options.interval;
	} else {
		this.s += 1;
	}
	this.ms = 0;
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

			// In the conditions below, local time is not relevant. And as new Date(Date.UTC(y,m,d)) is way faster 
			// than new Date(y,m,d). We use the UTC functions to set/get date parts.

			// Pre-calculate last day of month if needed
			const lastDayOfMonth = pattern.lastDayOfMonth ? new Date(Date.UTC(this.y, this.m+1, 0,0,0,0,0)).getUTCDate() : undefined;

			// Pre-calculate weekday if needed
			// Calculate offset weekday by ((fDomWeekDay + (targetDate - 1)) % 7)
			let fDomWeekDay = !pattern.starDOW ? new Date(Date.UTC(this.y, this.m, 1,0,0,0,0)).getUTCDay() : undefined;

			for( let i = startPos; i < pattern[target].length; i++ ) {

				// This applies to all "levels"
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
		["s", "i", 0],
		["i", "h", 0],
		["h", "d", 0],
		["d", "m", -1],
		["m", "y", 0]
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
		if (this.y >= 3000) {
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