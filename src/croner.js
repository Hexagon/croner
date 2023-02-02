/* ------------------------------------------------------------------------------------

  Croner - MIT License - Hexagon <github.com/Hexagon>

  Pure JavaScript Isomorphic cron parser and scheduler without dependencies.

  ------------------------------------------------------------------------------------

  License:

	Copyright (c) 2015-2022 Hexagon <github.com/Hexagon>

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
import { CronOptions } from "./options.js";

/**
 * Many JS engines stores the delay as a 32-bit signed integer internally.
 * This causes an integer overflow when using delays larger than 2147483647, 
 * resulting in the timeout being executed immediately.
 * 
 * All JS engines implements an immediate execution of delays larger that a 32-bit 
 * int to keep the behaviour concistent. 
 * 
 * @constant
 * @type {number}
 */
const maxDelay = Math.pow(2, 32 - 1) - 1;

/**
 * An array containing all created cron jobs.
 *
 * @constant
 * @type {Cron[]}
 */
const scheduledJobs = [];

/**
 * Cron entrypoint
 * 
 * @constructor
 * @param {string|Date} pattern - Input pattern, input date, or input ISO 8601 time string
 * @param {CronOptions|Function} [fnOrOptions1] - Options or function to be run each iteration of pattern
 * @param {CronOptions|Function} [fnOrOptions2] - Options or function to be run each iteration of pattern
 * @returns {Cron}
 */
function Cron (pattern, fnOrOptions1, fnOrOptions2) {
	
	// Optional "new" keyword
	if( !(this instanceof Cron) ) {
		return new Cron(pattern, fnOrOptions1, fnOrOptions2);
	}
	
	// Make options and func optional and interchangable
	let options, func;

	if( typeof fnOrOptions1 === "function" ) {
		func = fnOrOptions1;
	} else if( typeof fnOrOptions1 === "object" ) {
		options = fnOrOptions1;
	} else if( fnOrOptions1 !== void 0) {
		throw new Error("Cron: Invalid argument passed for optionsIn. Should be one of function, or object (options).");
	}

	if( typeof fnOrOptions2 === "function" ) {
		func = fnOrOptions2;
	} else if( typeof fnOrOptions2 === "object" ) {
		options = fnOrOptions2;
	} else if( fnOrOptions2 !== void 0) {
		throw new Error("Cron: Invalid argument passed for funcIn. Should be one of function, or object (options).");
	}
	
	/** @type {string|undefined} */
	this.name = options ? options.name : void 0;
	
	/** @type {CronOptions} */
	this.options = CronOptions(options);
	
	/** @type {CronDate|undefined} */
	this.once = void 0;
	
	/** @type {CronPattern|undefined} */
	this.pattern = void 0;
	
	// Check if we got a date, or a pattern supplied as first argument
	// Then set either this.once or this.pattern
	if (pattern && (pattern instanceof Date || ((typeof pattern === "string") && pattern.indexOf(":") > 0))) {
		this.once = new CronDate(pattern, this.options.timezone);
	} else {
		this.pattern = new CronPattern(pattern, this.options.timezone);
	}
	
	// Allow shorthand scheduling
	if( func !== void 0 ) {
		this.fn = func;
		this.schedule();
	}
	
	scheduledJobs.push(this);
	return this;
	
}
	
/**
 * Find next runtime, based on supplied date. Strips milliseconds.
 * 
 * @param {CronDate|Date|string} [prev] - Date to start from
 * @returns {Date | null} - Next run time
 */
Cron.prototype.next = function (prev) {
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
	if(n > this.options.maxRuns){
		n = this.options.maxRuns;
	}
	const enumeration = [];
	let prev = previous || this.previousrun;
	while(n-- && (prev = this.next(prev))) {
		enumeration.push(prev);
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
 * Returns number of milliseconds to next run
 * @public
 * 
 * @param {CronDate|Date|string} [prev] - Starting date, defaults to now - minimum interval
 * @returns {number | null}
 */
Cron.prototype.msToNext = function (prev) {

	// Get next run time
	const next = this._next(prev);

	// Default previous for millisecond calculation
	prev = new CronDate(prev, this.options.timezone);

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
 * Pause execution
 * @public
 * 
 * @returns {boolean} - Wether pause was successful
 */
Cron.prototype.pause = function () {
	return (this.options.paused = true) && !this.options.kill;
};
	
/**
 * Resume execution
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
 * @param {Date} [partial] - Internal function indicating a partial run
 * @returns {Cron}
 */
Cron.prototype.schedule = function (func, partial) {
	
	// If a function is already scheduled, bail out
	if (func && this.fn) {
		throw new Error("Cron: It is not allowed to schedule two functions using the same Croner instance.");
		
		// Update function if passed
	} else if (func) {
		this.fn = func;
	}
	
	// Get ms to next run, bail out early if waitMs is null (no next run)
	let	waitMs = this.msToNext(partial ? partial : this.previousrun);
	const target = this.next(partial ? partial :  this.previousrun);

	if  ( waitMs === null )  return this;
	
	// setTimeout cant handle more than Math.pow(2, 32 - 1) - 1 ms
	if( waitMs > maxDelay ) {
		waitMs = maxDelay;
	}
	
	// Ok, go!
	this.currentTimeout = setTimeout(async () => {
	
		const now = new Date();

		if( waitMs !== maxDelay && !this.options.paused && now.getTime() >= target ) {
	
			this.options.maxRuns--;
	
			// Always catch errors
			//  - re-throw if options.catch is not set
			//	- call callback if options.catch is set to a function
			//  - ignore if options.catch is set to any other truthy value
			if (this.options.catch) {
				// We don't wan't croner to stop even if a job is running over next
				// - so we wrap the function in a non-awaited anonymous function clause
				(async (inst) => {
					try {
						await inst.fn(inst, inst.options.context);
					} catch (_e) {
						if (
							Object.prototype.toString.call(inst.options.catch) === "[object Function]"
							|| "function" === typeof inst.options.catch
							|| inst.options.catch instanceof Function
						) {
							inst.options.catch(_e);
						}
					}
				})(this);
			} else {
				this.fn(this, this.options.context);
			}
	
			// Set previous run to now
			this.previousrun = new CronDate(void 0, this.options.timezone);
	
			// Recurse
			this.schedule();
			
		} else {
			// Partial
			this.schedule(undefined, now);
		}
	
	
	}, waitMs);
		
	return this;
	
};

	
/**
 * Internal version of next. Cron needs millseconds internally, hence _next.
 * @private
 * 
 * @param {CronDate|Date|string} prev - PreviousRun
 * @returns {CronDate | null} - Next run time
 */
Cron.prototype._next = function (prev) {

	const hasPreviousRun = (prev || this.previousrun) ? true : false;

	// Ensure previous run is a CronDate
	prev = new CronDate(prev, this.options.timezone);

	// Previous run should never be before startAt
	if( this.options.startAt && prev && prev.getTime() < this.options.startAt.getTime() ) {
		prev = this.options.startAt;
	}

	// Calculate next run according to pattern or one-off timestamp, pass actual previous run to increment
	const 
		nextRun = this.once || new CronDate(prev, this.options.timezone).increment(this.pattern, this.options, hasPreviousRun);
	
	if (this.once && this.once.getTime() <= prev.getTime()) {
		return null;
  
	} else if ((nextRun === null) ||
		(this.options.maxRuns <= 0) ||	
		(this.options.kill) ||
		(this.options.stopAt && nextRun.getTime() >= this.options.stopAt.getTime() )) {
		return null;

	} else {
		// All seem good, return next run
		return nextRun;

	}
		
};

Cron.Cron = Cron;
Cron.scheduledJobs = scheduledJobs;

export default Cron;
export { Cron, scheduledJobs };
