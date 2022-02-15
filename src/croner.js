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
import { CronDate } from "./date.js";
import { CronPattern } from "./pattern.js";
	
/**
 * @typedef {Object} CronOptions - Cron scheduler options
 * @property {boolean} [paused] - Job is paused
 * @property {boolean} [kill] - Job is about to be killed or killed
 * @property {boolean} [catch] - Continue exection even if a unhandled error is thrown by triggered function
 * @property {number} [maxRuns] - Maximum nuber of executions
 * @property {string | Date} [startAt] - When to start running
 * @property {string | Date} [stopAt] - When to stop running
 * @property {string} [timezone] - Time zone in Europe/Stockholm format
 * @property {?} [context] - Used to pass any object to scheduled function
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
 * @constructor
 * @param {string|Date} pattern - Input pattern, input date, or input ISO 8601 time string
 * @param {CronOptions|Function} [options] - Options
 * @param {Function} [func] - Function to be run each iteration of pattern
 * @returns {Cron}
 */
function Cron (pattern, options, func) {
	
	// Optional "new" keyword
	if( !(this instanceof Cron) ) {
		return new Cron(pattern, options, func);
	}
	
	// Make options optional
	if( typeof options === "function" ) {
		func = options;
		options = void 0;
	}
	
	/** @type {CronOptions} */
	this.options = this.processOptions(options);
	
	// Check if we got a date, or a pattern supplied as first argument
	if (pattern && (pattern instanceof Date)) {
		this.once = new CronDate(pattern, this.options.timezone);
	} else if (pattern && (typeof pattern === "string") && pattern.indexOf(":") > 0) {
		/** @type {CronDate} */
		this.once = new CronDate(pattern, this.options.timezone);
	} else {
		/** @type {CronPattern} */
		this.pattern = new CronPattern(pattern, this.options.timezone);
	}
	
	/**
	 * Allow shorthand scheduling
	 */
	if( func !== void 0 ) {
		this.fn = func;
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
	options.catch = (options.catch === void 0) ? false : options.catch;
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
 * @param {Date|string} [prev] - Date to start from
 * @returns {Date | null} - Next run time
 */
Cron.prototype.next = function (prev) {
	prev = new CronDate(prev, this.options.timezone);
	const next = this._next(prev);
	return next ? next.getDate() : null;
};
	
/**
 * Find next n runs, based on supplied date. Strips milliseconds.
 * 
 * @param {number} n - Number of runs to enumerate
 * @param {Date|string} [previous] - Date to start from
 * @returns {Date[]} - Next n run times
 */
Cron.prototype.enumerate = function (n, previous) {
	let enumeration = [];
	
	while(n-- && (previous = this.next(previous))) {
		enumeration.push(previous);
	}
	
	return enumeration;
};
	
/**
 * Is running?
 * @public
 * 
 * @returns {boolean} - Running or not
 */
Cron.prototype.running = function () {
	const msLeft = this.msToNext(this.previousrun);
	const running = !this.options.paused && this.fn !== void 0;
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
		prev = this.options.startAt;
	}
	
	// Calculate next run according to pattern or one-off timestamp
	const nextRun = this.once || new CronDate(prev, this.options.timezone).increment(this.pattern);
	
	if (this.once && this.once.getTime(true) <= prev.getTime(true)) {
		return null;
  
	} else if ((nextRun === null) ||
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
 * @param {Date} [prev] - Starting date, defaults to now
 * @returns {number | null}
 */
Cron.prototype.msToNext = function (prev) {
	prev = new CronDate(prev, this.options.timezone);
	const next = this._next(prev);
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
 * @returns {Cron}
 */
Cron.prototype.schedule = function (func) {
	
	// If a function is already scheduled, bail out
	if (func && this.fn) {
		throw new Error("Cron: It is not allowed to schedule two functions using the same Croner instance.");
		
		// Update function if passed
	} else if (func) {
		this.fn = func;
	}
	
	// Get ms to next run, bail out early if waitMs is null (no next run)
	let waitMs = this.msToNext(this.previousrun);
	if  ( waitMs === null )  return this;
	
	// setTimeout cant handle more than Math.pow(2, 32 - 1) - 1 ms
	if( waitMs > maxDelay ) {
		waitMs = maxDelay;
	}
	
	// Ok, go!
	this.currentTimeout = setTimeout(() => {
	
		if( waitMs !== maxDelay && !this.options.paused ) {
	
			this.options.maxRuns--;
	
			// Always catch errors, but only re-throw if options.catch is not set
			if (this.options.catch) {
				try {
					this.fn(this, this.options.context);
				} catch (_e) {
					// Ignore
				}
			} else {
				this.fn(this, this.options.context);
			}
	
			this.previousrun = new CronDate(void 0, this.options.timezone);
	
		}
	
		// Recurse
		this.schedule();
	
	}, waitMs );
		
	return this;
	
};
	
export default Cron;
export { Cron };