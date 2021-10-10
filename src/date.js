import convertTZ from "./timezone.js";

/**
 * Converts date to CronDate
 * @constructor
 * 
 * @param {date|string} [date] - Input date
 * @param {string} [timezone] - String representation of timezone in Europe/Stockholm format.
 */
function CronDate (date, timezone) {	

	this.timezone = timezone;

	if (date && date instanceof Date) {
		this.fromDate(date);
	} else if (date === void 0) {
		this.fromDate(new Date());
	} else if (date && typeof date === "string") {
		this.fromString(date);
	} else if (date instanceof CronDate) {
		this.fromCronDate(date);
	} else {
		throw new TypeError("CronDate: Invalid type passed as parameter to CronDate constructor");
	}
}

/**
 * Sets internals using a Date 
 * @private
 * 
 * @param {date} date - Input date
 */
CronDate.prototype.fromDate = function (date) {


	// This is the only way in for a pure date object, so this is where timezone should be applied
	let originalUTCms = date.getTime();
	if (this.timezone) {
		date = convertTZ(date, this.timezone);
	}
	let convertedUTCms = date.getTime();
	this.UTCmsOffset = convertedUTCms - originalUTCms;

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

	this.UTCmsOffset = date.UTCmsOffset;

	this.milliseconds = date.milliseconds;
	this.seconds = date.seconds;
	this.minutes = date.minutes;
	this.hours = date.hours;
	this.days = date.days;
	this.months  = date.months;
	this.years = date.years;
};

/**
 * Sets internals by parsing a string
 * @private
 * 
 * @param {date} date - Input date
 */
CronDate.prototype.fromString = function (str) {

	let parsedDateUTCms = Date.parse(str);

	// Throw if we did get an invalid date
	if( isNaN(parsedDateUTCms) ) {
		throw new TypeError("CronDate: Provided string value for CronDate could not be parsed as date.");
	}
	
	this.fromDate(new Date(parsedDateUTCms));
};

/**
 * Increment to next run time
 * @public
 * 
 * @param {string} pattern - The pattern used to increment current state
 * @return {CronPattern} - Returns itself for chaining
 */
CronDate.prototype.increment = function (pattern) {

	this.seconds += 1;
	this.milliseconds = 0;

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
			
			let startPos = (override === void 0) ? self[target] + offset : 0 + offset;

			for( let i = startPos; i < pattern[target].length; i++ ) {
				if( pattern[target][i] ) {
					self[target] = i-offset;
					return true;
				}
			}

			return false;

		};

	// Array of work to be done, consisting of subarrays described below:
	// [
	//   First item is which member to process,
	//   Second item is which member to increment if we didn't find a mathch in current item,
	//   Third item is an offset. if months is handled 0-11 in js date object, and we get 1-12
	//   from pattern. Offset should be -1
	// ]
	let toDo = [
			["seconds", "minutes", 0],
			["minutes", "hours", 0],
			["hours", "days", 0],
			["days", "months", -1],
			["months", "years", 0]
		],
		doing = 0;

	// Ok, we're working our way trough the toDo array, top to bottom
	// If we reach 5, work is done
	while(doing < 5) {

		// findNext sets the current member to next match in pattern
		// If time is 00:00:01 and pattern says *:*:05, seconds will
		// be set to 5
		if(!findNext(toDo[doing][0], pattern, toDo[doing][2])) {

			// If pattern didn't provide a match, increment next vanlue (e.g. minues)
			this[toDo[doing][1]]++;

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
		}

		// Gp down, seconds -> minutes -> hours -> days -> months -> year
		doing++;
	}

	// This is a special case for weekday, as the user isn't able to combine date/month patterns 
	// with weekday patterns, it's just to increment days until we get a match.
	while (!pattern.daysOfWeek[this.getDate().getDay()]) {
		this.days += 1;
	}

	return this;

};

/**
 * Convert current state back to a javascript Date()
 * @public
 * 
 * @returns {date}
 * 
 */
CronDate.prototype.getDate = function () {
	return new Date(this.years, this.months, this.days, this.hours, this.minutes, this.seconds, this.milliseconds-this.UTCmsOffset);
};

/**
 * Convert current state back to a javascript Date() and return UTC milliseconds
 * @public
 * 
 * @returns {date}
 * 
 */
CronDate.prototype.getTime = function () {
	return new Date(this.years, this.months, this.days, this.hours, this.minutes, this.seconds, this.milliseconds-this.UTCmsOffset).getTime();
};

export { CronDate };