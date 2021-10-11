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
 * @property {boolean} [kill] - Job is about to be killed
 * @property {number} [maxRuns] - Maximum nuber of executions
 * @property {number} [currentTimeout] - Internal: setTimeout "id"
 * @property {CronNextResult} [previous] - Previous run time
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
 * @constructor
 * @param {string} pattern - Input pattern
 * @param {CronOptions | Function} [options] - Options
 * @param {Function} [fn] - Function to be run each iteration of pattern
 * @returns {Cron | CronJob}
 */
function Cron (pattern, options, fn) {
	let self = this;
	
	// Optional "new" keyword
	if( !(this instanceof Cron) ) {
		return new Cron(pattern, options, fn);
	}

	/** @type {CronPattern} */
	self.pattern = new CronPattern(pattern);

	/** @type {CronOptions} */
	self.schedulerDefaults = {
		maxRuns:    Infinity,
		kill:       false
	};

	// Make options optional
	if( typeof options === "function" ) {
		fn = options;
		options = {};
	}

	/** 
	 * Store and validate options
	 * @type {CronOptions} 
	 */
	self.opts = self.validateOpts(options || {});

	// Determine what to return, default is self
	if( fn === void 0 ) {
		// Normal initialization, return self
		return self;

	} else {
		// Shorthand schedule requested, return job
		return this.schedule(options, fn);

	}

}

/**
 * Find next runtime, based on supplied date. Strips milliseconds.
 * 
 * @param {Date} prev - Input pattern
 * @returns {Date | null} - Next run time
 */
Cron.prototype.next = function (prev) {
	let next = this._next(prev);
	return next ? next.getDate() : null;
};

/**
 * Return previous run time
 * 
 * @returns {Date | null} - Previous run time
 */
Cron.prototype.previous = function () {
	return this.opts.previous ? this.opts.previous.getDate() : null;
};

/**
 * Internal version of next. Cron needs millseconds internally, hence _next.
 * 
 * @param {Date} prev - Input pattern
 * @returns {CronNextResult | null} - Next run time
 */
Cron.prototype._next = function (prev) {
	
	prev = new CronDate(prev, this.opts.timezone);

	// Previous run should never be before startAt
	if( this.opts.startAt && prev && prev.getTime() < this.opts.startAt.getTime() ) {
		prev = new CronDate(this.opts.startAt, this.opts.timezone);
	}

	// Calculate next run
	let nextRun = new CronDate(prev, this.opts.timezone).increment(this.pattern);

	// Check for stop condition
	if ((this.opts.maxRuns <= 0) ||	
		(this.opts.kill) ||
		(this.opts.stopAt && nextRun.getTime() >= this.opts.stopAt.getTime() )) {
		return null;
	} else {
		// All seem good, return next run
		return nextRun;
	}
	
};

/**
 * Validate (and cleans) options. Raises error on failure.
 * 
 * @param {CronOptions} opts - Input options
 * @returns {CronOptions} - Clean and validated options.
 */
Cron.prototype.validateOpts = function (opts) {
	// startAt is set, validate it
	if( opts.startAt ) {
		opts.startAt = new CronDate(opts.startAt, opts.timezone);
	} 
	if( opts.stopAt ) {
		opts.stopAt = new CronDate(opts.stopAt, opts.timezone);
	}
	return opts;
};

/**
 * Returns number of milliseconds to next run
 * 
 * @param {CronNextResult} [prev=new CronDate()] - Starting date, defaults to now
 * @returns {number | null}
 */
Cron.prototype.msToNext = function (prev) {
	prev = prev || new CronDate(void 0, this.opts.timezone);
	let next = this._next(prev);
	if( next ) {
		return (next.getTime() - prev.getTime());
	} else {
		return null;
	}
};

/**
 * Schedule a new job
 * 
 * @constructor
 * @param {CronOptions | Function} [options] - Options
 * @param {Function} [func] - Function to be run each iteration of pattern
 * @returns {CronJob}
 */
Cron.prototype.schedule = function (opts, func) {
	
	// Make opts optional
	if( !func ) {
		func = opts;

		// If options isn't passed to schedule, use stored options
		opts = this.opts;
	}

	// Keep options, or set defaults
	opts.paused = (opts.paused === void 0) ? false : opts.paused;
	opts.kill = opts.kill || this.schedulerDefaults.kill;
	if( !opts.maxRuns && opts.maxRuns !== 0 ) {
		opts.maxRuns = this.schedulerDefaults.maxRuns;
	}

	// Store options
	this.opts = this.validateOpts(opts || {});

	this._schedule(opts, func);
};

/**
 * Schedule a new job
 * 
 * @constructor
 * @param {CronOptions | Function} [options] - Options
 * @param {Function} [func] - Function to be run each iteration of pattern
 * @returns {CronJob}
 */
Cron.prototype._schedule = function (opts, func) {

	let self = this,
		waitMs,

		// Prioritize context before closure,
		// to allow testing of maximum delay. 
		_maxDelay = self.maxDelay || maxDelay;

	// Get ms to next run
	waitMs = this.msToNext(self.opts.previous);

	// Check for stop conditions
	if  ( waitMs === null ) {
		return;  
	} 

	// setTimeout cant handle more than Math.pow(2, 32 - 1) - 1 ms
	if( waitMs > _maxDelay ) {
		waitMs = _maxDelay;
	}

	// All ok, go go!
	self.opts.currentTimeout = setTimeout(function () {

		// Are we running? If waitMs is maxed out, this is a blank run
		if( waitMs !== _maxDelay ) {

			if ( !self.opts.paused ) {
				self.opts.maxRuns--;
				func();	
			}

			self.opts.previous = new CronDate(self.opts.previous, self.opts.timezone);

		}

		// Recurse
		self._schedule(self.opts, func);

	}, waitMs );

	// Return control functions
	return {

		// Return undefined
		stop: function() {
			self.opts.kill = true;
			// Stop any awaiting call
			if( self.opts.currentTimeout ) {
				clearTimeout( self.opts.currentTimeout );
			}
		},

		// Return bool wether pause were successful
		pause: function() {
			return (self.opts.paused = true) && !self.opts.kill;
		},

		// Return bool wether resume were successful
		resume: function () {
			return !(self.opts.paused = false) && !self.opts.kill;
		}

	};
};


export default Cron;
export { Cron };