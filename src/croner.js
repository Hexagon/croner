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
import { isFunction, unrefTimer } from "./utils.js";

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
 * An array containing all named cron jobs.
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
function Cron(pattern, fnOrOptions1, fnOrOptions2) {
	// Optional "new" keyword
	if (!(this instanceof Cron)) {
		return new Cron(pattern, fnOrOptions1, fnOrOptions2);
	}

	// Make options and func optional and interchangable
	let options, func;

	if (isFunction(fnOrOptions1)) {
		func = fnOrOptions1;
	} else if (typeof fnOrOptions1 === "object") {
		options = fnOrOptions1;
	} else if (fnOrOptions1 !== void 0) {
		throw new Error(
			"Cron: Invalid argument passed for optionsIn. Should be one of function, or object (options).",
		);
	}

	if (isFunction(fnOrOptions2)) {
		func = fnOrOptions2;
	} else if (typeof fnOrOptions2 === "object") {
		options = fnOrOptions2;
	} else if (fnOrOptions2 !== void 0) {
		throw new Error(
			"Cron: Invalid argument passed for funcIn. Should be one of function, or object (options).",
		);
	}

	/**
	 * @public
	 * @type {string|undefined} */
	this.name = options ? options.name : void 0;

	/**
	 * @public
	 * @type {CronOptions} */
	this.options = CronOptions(options);

	/**
	 * Encapsulate all internal states in an object.
	 * Duplicate all options that can change to internal states, for example maxRuns and paused.
	 * @private
	 */
	this._states = {
		/** @type {boolean} */
		kill: false,

		/** @type {boolean} */
		blocking: false,

		/**
		 * Start time of previous trigger, updated after each trigger
		 * @type {CronDate}
		 */
		previousRun: void 0,

		/**
		 * Start time of current trigger, this is updated just before triggering
		 * @type {CronDate}
		 */
		currentRun: void 0,

		/** @type {CronDate|undefined} */
		once: void 0,

		/** @type {unknown|undefined} */
		currentTimeout: void 0,

		/** @type {number} */
		maxRuns: options ? options.maxRuns : void 0,

		/** @type {boolean} */
		paused: options ? options.paused : false,
	};

	/**
	 * @public
	 * @type {CronPattern|undefined} */
	this.pattern = void 0;

	// Check if we got a date, or a pattern supplied as first argument
	// Then set either this._states.once or this.pattern
	if (
		pattern &&
		(pattern instanceof Date || ((typeof pattern === "string") && pattern.indexOf(":") > 0))
	) {
		this._states.once = new CronDate(pattern, this.options.timezone || this.options.utcOffset);
	} else {
		this.pattern = new CronPattern(pattern, this.options.timezone);
	}

	// Allow shorthand scheduling
	if (func !== void 0) {
		this.fn = func;
		this.schedule();
	}

	// Only store the job in scheduledJobs if a name is specified in the options.
	if (this.name) {
		const existing = scheduledJobs.find((j) => j.name === this.name);
		if (existing) {
			throw new Error(
				"Cron: Tried to initialize new named job '" + this.name + "', but name already taken.",
			);
		} else {
			scheduledJobs.push(this);
		}
	}

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
	if (n > this._states.maxRuns) {
		n = this._states.maxRuns;
	}
	const enumeration = [];
	let prev = previous || this._states.previousRun;
	while (n-- && (prev = this.next(prev))) {
		enumeration.push(prev);
	}

	return enumeration;
};

/**
 * Indicates wether or not the cron job is active, e.g. awaiting next trigger
 * @public
 *
 * @returns {boolean} - Running or not
 */
Cron.prototype.running = function () {
	const msLeft = this.msToNext(this._states.previousRun);
	const running = !this._states.paused && this.fn !== void 0;
	return msLeft !== null && running;
};

/**
 * Indicates wether or not the cron job is currently working
 * @public
 *
 * @returns {boolean} - Running or not
 */
Cron.prototype.busy = function () {
	return this._states.blocking;
};

/**
 * Return current/previous run start time
 * @public
 *
 * @returns {Date | null} - Previous run time
 */
Cron.prototype.started = function () {
	return this._states.currentRun ? this._states.currentRun.getDate() : null;
};

/**
 * Return previous run start time
 * @public
 *
 * @returns {Date | null} - Previous run time
 */
Cron.prototype.previous = function () {
	return this._states.previousRun ? this._states.previousRun.getDate() : null;
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
	prev = new CronDate(prev, this.options.timezone || this.options.utcOffset);

	if (next) {
		return (next.getTime(true) - prev.getTime(true));
	} else {
		return null;
	}
};

/**
 * Stop execution
 *
 * Running this will forcefully stop the job, and prevent furter exection. `.resume()` will not work after stopping.
 *
 * @public
 */
Cron.prototype.stop = function () {
	this._states.kill = true;
	// Stop any awaiting call
	if (this._states.currentTimeout) {
		clearTimeout(this._states.currentTimeout);
	}
};

/**
 * Pause execution
 * @public
 *
 * @returns {boolean} - Wether pause was successful
 */
Cron.prototype.pause = function () {
	
	this._states.paused = true;

	return !this._states.kill;
};

/**
 * Resume execution
 * @public
 *
 * @returns {boolean} - Wether resume was successful
 */
Cron.prototype.resume = function () {

	this._states.paused = false;

	return !this._states.kill;
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
		throw new Error(
			"Cron: It is not allowed to schedule two functions using the same Croner instance.",
		);

		// Update function if passed
	} else if (func) {
		this.fn = func;
	}

	// Get ms to next run, bail out early if any of them is null (no next run)
	let waitMs = this.msToNext(partial ? partial : this._states.previousRun);
	const target = this.next(partial ? partial : this._states.previousRun);
	if (waitMs === null || target === null) return this;

	// setTimeout cant handle more than Math.pow(2, 32 - 1) - 1 ms
	if (waitMs > maxDelay) {
		waitMs = maxDelay;
	}

	// Start the timer loop
	// _checkTrigger will either call _trigger (if it's time, croner isn't paused and whatever), 
	// or recurse back to this function to wait for next trigger
	this._states.currentTimeout = setTimeout(() => this._checkTrigger(target), waitMs);

	// If unref option is set - unref the current timeout, which allows the process to exit even if there is a pending schedule
	if (this._states.currentTimeout && this.options.unref) {
		unrefTimer(this._states.currentTimeout);
	}

	return this;
};

/**
 * Internal function to trigger a run, used by both scheduled and manual trigger
 * @private
 *
 * @param {Date} [initiationDate]
 */
Cron.prototype._trigger = async function (initiationDate) {

	this._states.blocking = true;

	this._states.currentRun = new CronDate(
		initiationDate,
		this.options.timezone || this.options.utcOffset,
	);

	if (this.options.catch) {
		try {
			await this.fn(this, this.options.context);
		} catch (_e) {
			if (isFunction(this.options.catch)) {
				// Do not await catch, even if it is synchronous
				setTimeout(() => this.options.catch(_e, this), 0);
			}
		}
	} else {
		// Trigger the function without catching
		await this.fn(this, this.options.context);

	}

	this._states.previousRun = new CronDate(
		initiationDate,
		this.options.timezone || this.options.utcOffset,
	);

	this._states.blocking = false;

};

/**
 * Trigger a run manually
 * @public
 */
Cron.prototype.trigger = async function () {
	await this._trigger();
};

/**
 * Called when it's time to trigger.
 * Checks if all conditions are currently met,
 * then instantly triggers the scheduled function.
 * @private
 *
 * @param {Date} target - Target Date
 */
Cron.prototype._checkTrigger = function (target) {
	const now = new Date(),
		shouldRun = !this._states.paused && now.getTime() >= target,
		isBlocked = this.blocking && this.options.protect;

	if (shouldRun && !isBlocked) {
		this._states.maxRuns--;

		// We do not await this
		this._trigger();

	} else {
		// If this trigger were blocked, and protect is a function, trigger protect (without awaiting it, even if it's an synchronous function)
		if (shouldRun && isBlocked && isFunction(this.options.protect)) {
			setTimeout(() => this.options.protect(this), 0);
		}
	}

	// Always reschedule
	this.schedule(undefined, now);
};

/**
 * Internal version of next. Cron needs millseconds internally, hence _next.
 * @private
 *
 * @param {CronDate|Date|string} prev - previousRun
 * @returns {CronDate | null} - Next run time
 */
Cron.prototype._next = function (prev) {
	const hasPreviousRun = (prev || this._states.previousRun) ? true : false;

	// Ensure previous run is a CronDate
	prev = new CronDate(prev, this.options.timezone || this.options.utcOffset);

	// Previous run should never be before startAt
	if (this.options.startAt && prev && prev.getTime() < this.options.startAt.getTime()) {
		prev = this.options.startAt;
	}

	// Calculate next run according to pattern or one-off timestamp, pass actual previous run to increment
	const nextRun = this._states.once ||
		new CronDate(prev, this.options.timezone || this.options.utcOffset).increment(
			this.pattern,
			this.options,
			hasPreviousRun, // hasPreviousRun is used to allow 
		);

	if (this._states.once && this._states.once.getTime() <= prev.getTime()) {
		return null;
	} else if (
		(nextRun === null) ||
		(this._states.maxRuns <= 0) ||
		(this._states.kill) ||
		(this.options.stopAt && nextRun.getTime() >= this.options.stopAt.getTime())
	) {
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
