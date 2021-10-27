(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Cron = factory());
})(this, (function () { 'use strict';

	/**
	 * "Converts" a date to a specific time zone
	 * 
	 * Note: This is only for specific and controlled usage, 
	 * as the internal UTC time of the resulting object will be off.
	 * 
	 * Example:
	 *   let normalDate = new Date(); // d is a normal Date instance, with local timezone and correct utc representation
	 *       tzDate = convertTZ(d, 'America/New_York') // d is a tainted Date instance, where getHours() 
	 *                                                 (for example) will return local time in new york, but getUTCHours()
	 *                                                 will return something irrelevant.
	 * 
	 * @param {date} date - Input date
	 * @param {string} tzString - Timezone string in Europe/Stockholm format
	 * @returns {date}
	 */
	function convertTZ(date, tzString) {
		return new Date(date.toLocaleString("en-US", {timeZone: tzString}));   
	}

	/**
	 * Converts date to CronDate
	 * @constructor
	 * 
	 * @param {date|string} [date] - Input date, if using string representation ISO 8001 (2015-11-24T19:40:00) local timezone is expected
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
			throw new TypeError("CronDate: Invalid type (" + typeof date + ") passed as parameter to CronDate constructor");
		}
	}

	/**
	 * Sets internals using a Date 
	 * @private
	 * 
	 * @param {date} date - Input date
	 * @param {boolean} [fromLocal] - Input date already in target timezone
	 */
	CronDate.prototype.fromDate = function (date, fromLocal) {


		// This is the only way in for a pure date object, so this is where timezone should be applied
		if (this.timezone) {
			let originalUTCms = date.getTime(),
				convertedDate = convertTZ(date, this.timezone);
			if (!fromLocal) {
				date = convertedDate;
			}
			this.UTCmsOffset = convertedDate.getTime() - originalUTCms;
		} else {
			this.UTCmsOffset = 0;
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

		this.UTCmsOffset = date.UTCmsOffset;
		this.timezone = date.timezone;

		// Recreate date object to avoid getDate > 31 etc...
		let newDate = new Date(date.years, date.months, date.days, date.hours, date.minutes, date.seconds, date.milliseconds);
		
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
	 * @param {date} date - Input date
	 */
	CronDate.prototype.fromString = function (str) {

		let parsedDateUTCms = this.parseISOLocal(str);

		// Throw if we did get an invalid date
		if( isNaN(parsedDateUTCms) ) {
			throw new TypeError("CronDate: Provided string value for CronDate could not be parsed as date.");
		}
		
		this.fromDate(new Date(parsedDateUTCms), true);
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
			this.seconds += 1;
		}

		let origTime = this.getTime();

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

			// If pattern didn't provide a match, increment next vanlue (e.g. minues)
			if(!findNext(toDo[doing][0], pattern, toDo[doing][2])) {
				this[toDo[doing][1]]++;
				resetPrevious();
			}

			// Gp down, seconds -> minutes -> hours -> days -> months -> year
			doing++;
		}

		// This is a special case for weekday, as the user isn't able to combine date/month patterns 
		// with weekday patterns, it's just to increment days until we get a match.
		while (!pattern.daysOfWeek[this.getDate(true).getDay()]) {
			this.days += 1;
			doing = 2;
			resetPrevious();
		}

		// If anything changed, recreate this CronDate and run again without incrementing
		if (origTime != self.getTime()) {
			self = new CronDate(self);
			if (this.years >= 4000) {
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
	 * @param {boolean} internal - If this is an internal call
	 * @returns {date}
	 */
	CronDate.prototype.getDate = function (internal) {
		let offset = internal ? 0 : this.UTCmsOffset;
		return new Date(this.years, this.months, this.days, this.hours, this.minutes, this.seconds, this.milliseconds-offset);
	};

	/**
	 * Convert current state back to a javascript Date() and return UTC milliseconds
	 * @public
	 * 
	 * @param {boolean} internal - If this is an internal call
	 * @returns {date}
	 */
	CronDate.prototype.getTime = function (internal) {
		let offset = internal ? 0 : this.UTCmsOffset;
		return new Date(this.years, this.months, this.days, this.hours, this.minutes, this.seconds, this.milliseconds-offset).getTime();
	};

	/**
	 * Takes a iso 8001 local date time string and creates a Date object
	 * @private
	 * 
	 * @param {string} s - an ISO 8001 format date and time string
	 *                      with all components, e.g. 2015-11-24T19:40:00
	 * @returns {Date|number} - Date instance from parsing the string. May be NaN.
	 */
	CronDate.prototype.parseISOLocal = function (s) {
		let b = s.split(/\D/);

		// Check for completeness
		if (b.length < 6) {
			return NaN;
		}

		let
			year = parseInt(b[0], 10),
			month = parseInt(b[1], 10),
			day = parseInt(b[2], 10),
			hour = parseInt(b[3], 10),
			minute = parseInt(b[4], 10),
			second = parseInt(b[5], 10);

		// Check parts for numeric
		if( isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute) || isNaN(second) ) {
			return NaN;
		} else {
			return new Date(year, month-1, day, hour, minute, second);
		}
	};

	/**
	 * @typedef {"seconds" | "minutes" | "hours" | "days" | "months" | "daysOfWeek"} CronPatternPart
	 * @typedef {0 | -1} CronIndexOffset
	 */

	/**
	 * Create a CronPattern instance from pattern string ('* * * * * *')
	 * @constructor
	 * @param {string} pattern - Input pattern
	 */
	function CronPattern (pattern) {

		this.pattern 		= pattern;

		this.seconds        = Array(60).fill(0); // 0-59
		this.minutes        = Array(60).fill(0); // 0-59
		this.hours          = Array(24).fill(0); // 0-23
		this.days           = Array(31).fill(0); // 0-30 in array, 1-31 in config
		this.months         = Array(12).fill(0); // 0-11 in array, 1-12 in config
		this.daysOfWeek     = Array(8).fill(0);  // 0-7 Where 0 = Sunday and 7=Sunday;

		this.parse();

	}

	/**
	 * Parse current pattern, will throw on any type of failure
	 * @private
	 */
	CronPattern.prototype.parse = function () {

		// Sanity check
		if( !(typeof this.pattern === "string" || this.pattern.constructor === String) ) {
			throw new TypeError("CronPattern: Pattern has to be of type string.");
		}

		// Split configuration on whitespace
		let parts = this.pattern.trim().replace(/\s+/g, " ").split(" ");

		// Validite number of configuration entries
		if( parts.length < 5 || parts.length > 6 ) {
			throw new TypeError("CronPattern: invalid configuration format ('" + this.pattern + "'), exacly five or six space separated parts required.");
		}

		// If seconds is omitted, insert 0 for seconds
		if( parts.length === 5) {
			parts.unshift("0");
		}

		
		// Replace alpha representations
		parts[4] = this.replaceAlphaMonths(parts[4]);
		parts[5] = this.replaceAlphaDays(parts[5]);

		// Check part content
		this.throwAtIllegalCharacters(parts);

		// Parse parts into arrays, validates as we go
		this.partToArray("seconds",    parts[0], 0);
		this.partToArray("minutes",    parts[1], 0);
		this.partToArray("hours",      parts[2], 0);
		this.partToArray("days",       parts[3], -1);
		this.partToArray("months",     parts[4], -1);
		this.partToArray("daysOfWeek", parts[5], 0);

		// 0 = Sunday, 7 = Sunday
		if( this.daysOfWeek[7] ) {
			this.daysOfWeek[0] = 1;
		}

	};

	/**
	 * Convert current part (seconds/minutes etc) to an array of 1 or 0 depending on if the part is about to trigger a run or not.
	 * @private
	 * 
	 * @param {CronPatternPart} type - Seconds/minutes etc
	 * @param {string} conf - Current pattern part - *, 0-1 etc
	 * @param {CronIndexOffset} valueIndexOffset - 0 or -1. 0 for seconds,minutes, hours as they start on 1. -1 on days and months, as the start on 0
	 */
	CronPattern.prototype.partToArray = function (type, conf, valueIndexOffset) {

		let i,
			split,
			arr = this[type];

		// First off, handle wildcard
		if( conf === "*" ) {
			for( i = 0; i < arr.length; i++ ) {
				arr[i] = 1;
			}
			return;
		}

		// Handle separated entries (,) by recursion
		split = conf.split(",");
		if( split.length > 1 ) {
			for( i = 0; i < split.length; i++ ) {
				this.partToArray(type, split[i], valueIndexOffset);
			}

		// Handle range (-)
		} else if( conf.indexOf("-") !== -1 ) {
			this.handleRange(conf, type, valueIndexOffset);

		// Handle stepping (/)
		} else if( conf.indexOf("/") !== -1 ) {
			this.handleStepping(conf, type, valueIndexOffset);

		// Handle pure number
		} else {
			this.handleNumber(conf, type, valueIndexOffset);
		}

	};

	/**
	 * After converting JAN-DEC, SUN-SAT only 0-9 * , / - are allowed, throw if anything else pops up
	 * @private
	 * 
	 * @param {string[]} parts - Each part split as strings
	 */
	CronPattern.prototype.throwAtIllegalCharacters = function (parts) {
		let reValidCron = /[^/*0-9,-]+/;
		for(let i = 0; i < parts.length; i++) {
			if( reValidCron.test(parts[i]) ) {
				throw new TypeError("CronPattern: configuration entry " + i + " (" + parts[i] + ") contains illegal characters.");
			}
		}
	};

	/**
	 * Nothing but a number left, handle that
	 * @private
	 * 
	 * @param {string} conf - Current part, expected to be a number, as a string
	 * @param {string} type - One of "seconds", "minutes" etc
	 * @param {number} valueIndexOffset - -1 for day of month, and month, as they start at 1. 0 for seconds, hours, minutes
	 */
	CronPattern.prototype.handleNumber = function (conf, type, valueIndexOffset) {
		let i = (parseInt(conf, 10) + valueIndexOffset);

		if( i < 0 || i >= this[type].length ) {
			throw new TypeError("CronPattern: " + type + " value out of range: '" + conf + "'");
		}

		this[type][i] = 1;
	};


	/**
	 * Take care of ranges (e.g. 1-20)
	 * @private
	 * 
	 * @param {string} conf - Current part, expected to be a string like 1-20
	 * @param {string} type - One of "seconds", "minutes" etc
	 * @param {number} valueIndexOffset - -1 for day of month, and month, as they start at 1. 0 for seconds, hours, minutes
	 */
	CronPattern.prototype.handleRange = function (conf, type, valueIndexOffset) {
		let split = conf.split("-");

		if( split.length !== 2 ) {
			throw new TypeError("CronPattern: Syntax error, illegal range: '" + conf + "'");
		}

		let lower = parseInt(split[0], 10) + valueIndexOffset,
			upper = parseInt(split[1], 10) + valueIndexOffset;

		if( isNaN(lower) ) {
			throw new TypeError("CronPattern: Syntax error, illegal lower range (NaN)");
		} else if( isNaN(upper) ) {
			throw new TypeError("CronPattern: Syntax error, illegal upper range (NaN)");
		}

		// Check that value is within range
		if( lower < 0 || upper >= this[type].length ) {
			throw new TypeError("CronPattern: Value out of range: '" + conf + "'");
		}

		//
		if( lower > upper ) {
			throw new TypeError("CronPattern: From value is larger than to value: '" + conf + "'");
		}

		for( let i = lower; i <= upper; i++ ) {
			this[type][(i + valueIndexOffset)] = 1;
		}
	};

	/**
	 * Handle stepping (e.g. * / 14)
	 * @private
	 * 
	 * @param {string} conf - Current part, expected to be a string like * /20 (without the space)
	 * @param {string} type - One of "seconds", "minutes" etc
	 * @param {number} valueIndexOffset - -1 for day of month, and month, as they start at 1. 0 for seconds, hours, minutes
	 */
	CronPattern.prototype.handleStepping = function (conf, type, valueIndexOffset) {

		let split = conf.split("/");

		if( split.length !== 2 ) {
			throw new TypeError("CronPattern: Syntax error, illegal stepping: '" + conf + "'");
		}

		if( split[0] !== "*" ) {
			throw new TypeError("CronPattern: Syntax error, left part of / needs to be * : '" + conf + "'");
		}

		let steps = parseInt(split[1], 10);

		if( isNaN(steps) ) throw new TypeError("CronPattern: Syntax error, illegal stepping: (NaN)");
		if( steps === 0 ) throw new TypeError("CronPattern: Syntax error, illegal stepping: 0");
		if( steps > this[type].length ) throw new TypeError("CronPattern: Syntax error, steps cannot be greater than maximum value of part ("+this[type].length+")");

		for( let i = 0; i < this[type].length; i+= steps ) {
			this[type][(i + valueIndexOffset)] = 1;
		}
	};


	/**
	 * Replace day name with day numbers
	 * @private
	 * 
	 * @param {string} conf - Current part, expected to be a string that might contain sun,mon etc.
	 * 
	 * @returns {string} - conf with 0 instead of sun etc.
	 */
	CronPattern.prototype.replaceAlphaDays = function (conf) {
		return conf
			.replace(/sun/gi, "0")
			.replace(/mon/gi, "1")
			.replace(/tue/gi, "2")
			.replace(/wed/gi, "3")
			.replace(/thu/gi, "4")
			.replace(/fri/gi, "5")
			.replace(/sat/gi, "6");
	};

	/**
	 * Replace month name with month numbers
	 * @private
	 * 
	 * @param {string} conf - Current part, expected to be a string that might contain jan,feb etc.
	 * 
	 * @returns {string} - conf with 0 instead of sun etc.
	 */
	CronPattern.prototype.replaceAlphaMonths = function (conf) {
		return conf
			.replace(/jan/gi, "1")
			.replace(/feb/gi, "2")
			.replace(/mar/gi, "3")
			.replace(/apr/gi, "4")
			.replace(/may/gi, "5")
			.replace(/jun/gi, "6")
			.replace(/jul/gi, "7")
			.replace(/aug/gi, "8")
			.replace(/sep/gi, "9")
			.replace(/oct/gi, "10")
			.replace(/nov/gi, "11")
			.replace(/dec/gi, "12");
	};

	/* ------------------------------------------------------------------------------------

	  Croner - MIT License - Hexagon <github.com/Hexagon>

	  Pure JavaScript Isomorphic cron parser and scheduler without dependencies.

	  ------------------------------------------------------------------------------------

	  License:

		Copyright (c) 2015-2021 Hexagon <github.com/Hexagon>

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
	 * @typedef {Object} CronOptions - Cron scheduler options
	 * @property {boolean} [paused] - Job is paused
	 * @property {boolean} [kill] - Job is about to be killed or killed
	 * @property {number} [maxRuns] - Maximum nuber of executions
	 * @property {string | Date} [startAt] - When to start running
	 * @property {string | Date} [stopAt] - When to stop running
	 * @property {string} [timezone] - Time zone in Europe/Stockholm format
	 */

	/**
	 * @typedef {Function} CronJobStop - Stop current job
	 * @returns {boolean} - If pause was successful
	 *
	 * @typedef {Function} CronJobResume - Resume current job
	 * @returns {boolean} - If resume was successful
	 *
	 * @typedef {Object} CronJob - Cron job control functions
	 * @property {CronJobStop} stop
	 * @property {CronJobResume} pause
	 * @property {Function} resume
	 */

	/**
	 * Many JS engines stores the delay as a 32-bit signed integer internally.
	 * This causes an integer overflow when using delays larger than 2147483647, 
	 * resulting in the timeout being executed immediately.
	 * 
	 * All JS engines implements an immediate execution of delays larger that a 32-bit 
	 * int to keep the behaviour concistent. 
	 * 
	 * @type {number}
	 */
	const maxDelay = Math.pow(2, 32 - 1) - 1;

	/**
	 * Cron entrypoint
	 * 
	 * @signature
	 * @constructor
	 * @param {string} pattern - Input pattern
	 * @param {CronOptions | Function} [options] - Options
	 * @param {Function} [fn] - Function to be run each iteration of pattern
	 * @returns {Cron}
	 * 
	 * @signature
	 * @constructor
	 * @param {string} pattern - Input pattern
	 * @param {CronOptions | Function} [options] - Options
	 * @param {Function} [fn] - Function to be run each iteration of pattern
	 * @returns {CronJob}
	 */
	function Cron (pattern, options, fn) {
		let self = this;
		
		// Optional "new" keyword
		if( !(this instanceof Cron) ) {
			return new Cron(pattern, options, fn);
		}

		/** @type {CronPattern} */
		self.pattern = new CronPattern(pattern);

		// Make options optional
		if( typeof options === "function" ) {
			fn = options;
			options = void 0;
		}

		/** @type {CronOptions} */
		this.options = this.processOptions(options);

		/**
		 * Allow shorthand scheduling
		 */
		if( fn !== void 0 ) {
			this.fn = fn;
			this.schedule();
		}

		return this;

	}

	/**
	 * Internal function that validates options, and sets defaults
	 * @private
	 * 
	 * @param {CronOptions} options 
	 * @returns {CronOptions}
	 */
	Cron.prototype.processOptions = function (options) {

		// If no options are passed, create empty object
		if (options === void 0) {
			options = {};
		}

		// Keep options, or set defaults
		options.paused = (options.paused === void 0) ? false : options.paused;
		options.maxRuns = (options.maxRuns === void 0) ? Infinity : options.maxRuns;
		options.kill = false;

		// startAt is set, validate it
		if( options.startAt ) {
			options.startAt = new CronDate(options.startAt, options.timezone);
		} 
		if( options.stopAt ) {
			options.stopAt = new CronDate(options.stopAt, options.timezone);
		}	

		return options;
	};

	/**
	 * Find next runtime, based on supplied date. Strips milliseconds.
	 * 
	 * @param {Date} [prev] - Input pattern
	 * @returns {Date | null} - Next run time
	 */
	Cron.prototype.next = function (prev) {
		prev = new CronDate(prev, this.options.timezone);
		let next = this._next(prev);
		return next ? next.getDate() : null;
	};

	/**
	 * Is running?
	 * @public
	 * 
	 * @returns {Boolean} - Running or not
	 */
	Cron.prototype.running = function () {
		let msLeft = this.msToNext(this.previousrun);
		let running = !this.options.paused && this.fn !== void 0;
		return msLeft !== null && running;
	};

	/**
	 * Return previous run time
	 * @public
	 * 
	 * @returns {Date | null} - Previous run time
	 */
	Cron.prototype.previous = function () {
		return this.previousrun ? this.previousrun.getDate() : null;
	};

	/**
	 * Internal version of next. Cron needs millseconds internally, hence _next.
	 * @private
	 * 
	 * @param {CronDate} prev - Input pattern
	 * @returns {CronDate | null} - Next run time
	 */
	Cron.prototype._next = function (prev) {

		// Previous run should never be before startAt
		if( this.options.startAt && prev && prev.getTime(true) < this.options.startAt.getTime(true) ) {
			prev = new CronDate(this.options.startAt, this.options.timezone);
		}

		// Calculate next run
		let nextRun = new CronDate(prev, this.options.timezone).increment(this.pattern);

		if ((nextRun === null) ||
			(this.options.maxRuns <= 0) ||	
			(this.options.kill) ||
			(this.options.stopAt && nextRun.getTime(true) >= this.options.stopAt.getTime(true) )) {
			return null;
		} else {
			// All seem good, return next run
			return nextRun;
		}
		
	};

	/**
	 * Returns number of milliseconds to next run
	 * @public
	 * 
	 * @param {CronDate | null} [prev=new CronDate()] - Starting date, defaults to now
	 * @returns {number | null}
	 */
	Cron.prototype.msToNext = function (prev) {
		prev = new CronDate(prev, this.options.timezone);
		let next = this._next(prev);
		if( next ) {
			return (next.getTime(true) - prev.getTime(true));
		} else {
			return null;
		}
	};

	/**
	 * Stop execution 
	 * @public
	 */
	Cron.prototype.stop = function () {
		this.options.kill = true;
		// Stop any awaiting call
		if( this.currentTimeout ) {
			clearTimeout( this.currentTimeout );
		}
	};

	/**
	 * Pause executionR
	 * @public
	 * 
	 * @returns {boolean} - Wether pause was successful
	 */
	Cron.prototype.pause = function () {
		return (this.options.paused = true) && !this.options.kill;
	};

	/**
	 * Pause execution
	 * @public
	 * 
	 * @returns {boolean} - Wether resume was successful
	 */
	Cron.prototype.resume = function () {
		return !(this.options.paused = false) && !this.options.kill;
	};

	/**
	 * Schedule a new job
	 * @public
	 * 
	 * @param {Function} func - Function to be run each iteration of pattern
	 * @returns {CronJob}
	 */
	Cron.prototype.schedule = function (func) {

		let self = this,
		
			// Get ms to next run
			waitMs = this.msToNext(self.previousrun),

			// Prioritize context before closure,
			// to allow testing of maximum delay. 
			_maxDelay = self.maxDelay || maxDelay;

		// setTimeout cant handle more than Math.pow(2, 32 - 1) - 1 ms
		if( waitMs > _maxDelay ) {
			waitMs = _maxDelay;
		}

		// Update function if passed
		if (func) {
			self.fn = func;
		}

		// All ok, go go!
		if  ( waitMs !== null ) {
			self.currentTimeout = setTimeout(function () {

				// Are we running? If waitMs is maxed out, this is a blank run
				if( waitMs !== _maxDelay ) {

					if ( !self.options.paused ) {
						self.options.maxRuns--;
						self.fn();	
					}

					self.previousrun = new CronDate(void 0, self.options.timezone);
				}

				// Recurse
				self.schedule();

			}, waitMs );
		}

		return this;

	};

	return Cron;

}));
