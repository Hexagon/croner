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
 * @typedef {CronDate | null} CronNextResult
 *
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
		this.schedule(fn);
	}

	return this;

}

/**
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
	let next = this._next(prev);
	return next ? next.getDate() : null;
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
 * @param {Date} prev - Input pattern
 * @returns {CronDate | null} - Next run time
 */
Cron.prototype._next = function (prev) {

	prev = new CronDate(prev, this.options.timezone);

	// Previous run should never be before startAt
	if( this.options.startAt && prev && prev.getTime() < this.options.startAt.getTime() ) {
		prev = new CronDate(this.options.startAt, this.options.timezone);
	}

	// Calculate next run
	let nextRun = new CronDate(prev, this.options.timezone).increment(this.pattern);

	// Check for stop condition
	if ((nextRun === null) ||
		(this.options.maxRuns <= 0) ||	
		(this.options.kill) ||
		(this.options.stopAt && nextRun.getTime() >= this.options.stopAt.getTime() )) {
		return null;
	} else {
		// All seem good, return next run
		return nextRun;
	}
	
};

/**
 * Returns number of milliseconds to next run
 * 
 * @param {CronNextResult} [prev=new CronDate()] - Starting date, defaults to now
 * @returns {number | null}
 */
Cron.prototype.msToNext = function (prev) {
	prev = prev || new CronDate(void 0, this.options.timezone);
	let next = this._next(prev);
	if( next ) {
		return (next.getTime() - prev.getTime());
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

	// All ok, go go!
	if  ( waitMs !== null ) {
		self.currentTimeout = setTimeout(function () {

			// Are we running? If waitMs is maxed out, this is a blank run
			if( waitMs !== _maxDelay ) {

				if ( !self.options.paused ) {
					self.options.maxRuns--;
					func();	
				}

				self.previousrun = new CronDate(void 0, self.options.timezone);
			}

			// Recurse
			self.schedule(func);

		}, waitMs );
	}

	return this;

};

export default Cron;
export { Cron };