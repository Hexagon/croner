/* ------------------------------------------------------------------------------------

  Croner - MIT License - Hexagon <github.com/Hexagon>

  Pure JavaScript Isomorphic cron parser and scheduler without dependencies.

  ------------------------------------------------------------------------------------
  
  Pattern:
	```
	┌──────────────── sec (0 - 59)
	| ┌────────────── min (0 - 59)
	| │ ┌──────────── hour (0 - 23)
	| │ │ ┌────────── day of month (1 - 31)
	| │ │ │ ┌──────── month (1 - 12)
	| │ │ │ │ ┌────── day of week (0 - 6) 
	| │ │ │ │ │       (0 to 6 are Sunday to Saturday; 7 is Sunday, the same as 0)
	| │ │ │ │ │
	* * * * * * ```

  ------------------------------------------------------------------------------------

  License:

	MIT:

	Copyright (c) 2015 Hexagon <github.com/Hexagon>

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

(function () {

	var root = this,

		// Many JS engines stores the delay as a 32-bit signed integer internally.
		// This causes an integer overflow when using delays larger than 2147483647, resulting in the timeout being executed immediately.
		// 
		// All JS engines implements an immediate execution of delays larger that a 32-bit int to keep the behaviour concistent. 
		maxDelay = Math.pow(2, 32 - 1) - 1;

	function raise (err) {
		throw new TypeError("Cron parser: " + err);
	}

	function safeDate() {
		return new Date(new Date().setMilliseconds(0));
	}

	function fill(arr, val) {
		for(var i = 0; i < arr.length; i++) {
			arr[i] = val;
		}
		return arr;
	}

	function CronDate (date) {
		this.seconds = date.getSeconds() + 1;
		this.minutes = date.getMinutes();
		this.hours = date.getHours();
		this.days = date.getDate();
		this.months  = date.getMonth();
		this.years = date.getFullYear();
	}

	CronDate.prototype.findNext = function (target, pattern, offset, override) {
		
		var startPos = (override === void 0) ? this[target] + offset : 0 + offset, result = false;

		for (var i = startPos; i < pattern[target].length; i++) {
			if (pattern[target][i]) {
				this[target] = i-offset;
				result = true;
				break;
			}
		}

		return result;

	};

	CronDate.prototype.increment = function (pattern) {

		var toDo = [
				["seconds", "minutes", 0],
				["minutes", "hours", 0],
				["hours", "days", 0],
				["days", "months", -1],
				["months", "years", 0]
			],
			doing = 0;

		while(doing < 5) {
			if(!this.findNext(toDo[doing][0], pattern, toDo[doing][2])) {
				this[toDo[doing][1]]++;
				while(doing >= 0) {
					this.findNext(toDo[doing][0], pattern, toDo[doing][2], 0);
					doing--;
				}
			}
			doing++;
		}

		while (!pattern.daysOfWeek[this.getDate().getDay()]) {
			this.days += 1;
		}

	};

	CronDate.prototype.getDate = function () {
		return new Date(this.years, this.months, this.days, this.hours, this.minutes, this.seconds, 0);
	};

	function CronPattern (pattern) {

		this.pattern 		= pattern;

		this.seconds        = fill(Array(60),0); // 0-59
		this.minutes        = fill(Array(60),0); // 0-59
		this.hours          = fill(Array(24),0); // 0-23
		this.days           = fill(Array(31),0); // 0-30 in array, 1-31 in config
		this.months         = fill(Array(12),0); // 0-11 in array, 1-12 in config
		this.daysOfWeek     = fill(Array(8),0);  // 0-7 Where 0 = Sunday and 7=Sunday;

		this.parse();

	}

	CronPattern.prototype.parse = function () {

		// Sanity check
		if (typeof this.pattern !== "string") {
			raise("invalid configuration string ('" + this.pattern + "').");
		}

		// Split configuration on whitespace
		var parts = this.pattern.trim().replace(/\s+/g, " ").split(" "),
			part,
			i,
			reValidCron = /[^0-9,-]+/,
			hasMonths,
			hasDaysOfWeek,
			hasDates;

		// Validite number of configuration entries
		if (parts.length !== 6) {
			raise("invalid configuration format ('" + this.pattern + "'), exacly five space separated parts required.");
		}

		// Validate field content
		for (i = 0; i < parts.length; i++) {
			part = parts[i].trim();

			// Check that part only contain legal characters ^[0-9-,]+$
			if (part !== "*" && reValidCron.test(part)) {
				raise("configuration entry " + (i + 1) + " (" + part + ") contains illegal characters.");
			}
		}

		// Check that we dont have both months and daysofweek
		hasMonths = (parts[4] !== "*");
		hasDaysOfWeek = (parts[5] !== "*");
		hasDates = (parts[3] !== "*");

		// Month/Date and dayofweek is incompatible
		if (hasDaysOfWeek && (hasMonths || hasDates)) {
			raise("configuration invalid, you can not combine month/date with day of week.");
		}

		// Parse parts into arrays, validates as we go
		this.partToArray("seconds",               this.seconds,    parts[0], 0);
		this.partToArray("minutes",               this.minutes,    parts[1], 0);
		this.partToArray("hours",                 this.hours,      parts[2], 0);
		this.partToArray("days",                  this.days,       parts[3], -1);
		this.partToArray("months",                this.months,     parts[4], -1);
		this.partToArray("daysOfWeek",            this.daysOfWeek, parts[5], 0);

		// 0 = Sunday, 7 = Sunday
		if (this.daysOfWeek[0]) {
			this.daysOfWeek[7] = 1;
		}

		if (this.daysOfWeek[7]) {
			this.daysOfWeek[0] = 1;
		}

	};

	CronPattern.prototype.partToArray = function (type, arr, conf, valueIndexOffset) {

		var i,x,
			confParts,
			split,
			index,
			lower,
			upper;

		// First off, handle wildcard
		if (conf === "*" ) {
			for (i = 0; i < arr.length; i++) {
				arr[i] = 1;
			}

			return;
		}

		// Check if we need to split
		confParts = conf.split(",");

		// Recurse into comma separated entries
		if (confParts.length > 1) {
			for (i = 0; i < confParts.length; i++) {
				this.partToArray(type, arr, confParts[i], valueIndexOffset);
			}
		
			return;
		}

		// Didn"t need to recurse, determine if this is a range or a number
		if (conf.indexOf("-") === -1) {
			// Got a number
			index = (parseInt(conf, 10) + valueIndexOffset);

			if (index < 0 || index >= arr.length) {
				raise(type + " value out of range: '" + conf + "'");
			}

			arr[index] = 1;
		} else {

			// Got a range
			split = conf.split("-");

			if (split.length !== 2) {
				raise("syntax error, illegal range: '" + conf + "'");
			}

			lower = parseInt(split[0], 10) + valueIndexOffset;
			upper = parseInt(split[1], 10) + valueIndexOffset;

			if (isNaN(lower)) {
				raise("syntax error, illegal lower range (NaN)");
			} else if (isNaN(upper)) {
				raise("syntax error, illegal upper range (NaN)");
			}

			//
			if (lower < 0 || upper >= arr.length) {
				raise("value out of range: '" + conf + "'");
			}

			//
			if (lower > upper) {
				raise("from value is larger than to value: '" + conf + "'");
			}

			for (x = lower; x <= upper; x++) {
				arr[(x + valueIndexOffset)] = 1;
			}
		}
	};

	function Cron (pattern) {
		var self = this;
		
		// Optional "new" keyword
		if (!(this instanceof Cron)) {
			return new Cron(pattern);
		}

		self.pattern = new CronPattern(pattern);

		self.schedulerDefaults = {
			stopAt:     Infinity,
			maxRuns:    Infinity,
			kill:       false
		};

		return this;
	}

	Cron.prototype.next = function (date) {
		var cronDate = new CronDate(date || safeDate());
		cronDate.increment(this.pattern);
		return cronDate.getDate();
	};

	Cron.prototype.msToNext = function (prev) {
		return (this.next(prev) - safeDate().getTime());
	};

	Cron.prototype.schedule = function (opts, func, recurse) {

		var self = this,
			waitMs,

			// Prioritize context before closure,
			// to allow testing of maximum delay. 
			_maxDelay = self.maxDelay || maxDelay;
			
		// Make opts optional
		if (!func) {
			func = opts;
			opts = {};
		}

		// Keep options, or set defaults
		opts.paused = (typeof opts.paused === "undefined") ? false : opts.paused;
		opts.previous = (recurse === false) ? safeDate() : opts.startAt || opts.previous;
		opts.stopAt = opts.stopAt || this.schedulerDefaults.stopAt;
		opts.kill = opts.kill || this.schedulerDefaults.kill;
		opts.rest = opts.rest || 0;
		if (!opts.maxRuns && opts.maxRuns !== 0) {
			opts.maxRuns = this.schedulerDefaults.maxRuns;
		}

		// One-timer
		opts.startAt = void 0;

		// Get ms to next run
		waitMs = this.msToNext(opts.previous);

		// Check for stop conditions
		if  (
				(opts.maxRuns <= 0) ||
				(opts.stopAt !== Infinity && opts.previous.getTime() + waitMs/1000 > opts.stopAt.getTime() ) ||
				(opts.kill)
			) {
			return;  
		} 

		// setTimeout cant handle more than Math.pow(2, 32 - 1) - 1 ms
		if (waitMs > _maxDelay) {
			waitMs = _maxDelay;
		}

		// All ok, go go!
		opts.currentTimeout = setTimeout(function () {

			// Are we running? If waitMs is maxed out, this is a blank run
			if ( waitMs !== _maxDelay && !opts.paused) {
				opts.maxRuns--;
				opts.previous = safeDate();
				func();
			}

			// Are we paused? In that case we need to update last run time
			if ( opts.paused ) {
				opts.previous = safeDate();
			}

			// Recurse
			self.schedule(opts, func, true);
		}, waitMs );

		// Return control functions
		return {

			// Return undefined
			stop: function() {
				opts.kill = true;
				// Stop any awaiting call
				if ( opts.currentTimeout ) {
					clearTimeout( opts.currentTimeout );
				}
			},

			// Return if pause were successful
			pause: function() {
				return (opts.paused = true) && !opts.kill;
			},

			// Return if resume were successful
			resume: function () {
				return !(opts.paused = false) && !opts.kill;
			}

		};
	};

	// Expose
	if (typeof module != "undefined" && typeof module.exports === "object") {
		module.exports = Cron;
	} else if (typeof define === "function" && define.amd) {
		define([], function () {
			return Cron;
		});
	} else {
		root.cron = Cron;
	}

}).call(this);
