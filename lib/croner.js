/* ------------------------------------------------------------------------------------

  Croner - MIT License - Hexagon <github.com/Hexagon>

  Pure JavaScript Isomorphic cron parser and scheduler without dependencies.

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

	"use strict";

	var root = this,

		// Many JS engines stores the delay as a 32-bit signed integer internally.
		// This causes an integer overflow when using delays larger than 2147483647, 
		// resulting in the timeout being executed immediately.
		// 
		// All JS engines implements an immediate execution of delays larger that a 32-bit 
		// int to keep the behaviour concistent. 
		maxDelay = Math.pow(2, 32 - 1) - 1;



	//
	// ---- Helper functions  ------------------------------------------------------------
	// 

	function raise (err) {
		throw new TypeError("Cron parser: " + err);
	}

	function safeDate() {

		// Create new date object
		var d = new Date(); 

		// Make sure milliseconds is 0. Else we will get unwanted behaviour at comparisons
		d.setMilliseconds(0);

		// Return the "safe" date
		return d;
	}

	function fill(arr, val) {

		// Simple "Polyfill" for Array.fill on pre ES6 environments
		for(var i = 0; i < arr.length; i++) {
			arr[i] = val;
		}

		return arr;

	}



	//
	// ---- CronDate  ---------------------------------------------------------------------
	//

	function CronDate (date) {

		this.seconds = date.getSeconds() + 1;
		this.minutes = date.getMinutes();
		this.hours = date.getHours();
		this.days = date.getDate();
		this.months  = date.getMonth();
		this.years = date.getFullYear();
	}

	CronDate.prototype.increment = function (pattern) {

		var self = this,

			findNext = function (target, pattern, offset, override) {
				
				var startPos = (override === void 0) ? self[target] + offset : 0 + offset;

				for( var i = startPos; i < pattern[target].length; i++ ) {
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
		var toDo = [
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

	};

	CronDate.prototype.getDate = function () {
		return new Date(this.years, this.months, this.days, this.hours, this.minutes, this.seconds, 0);
	};
	


	//
	// ---- CronPattern  ---------------------------------------------------------------------
	//

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
		if( !(typeof this.pattern === "string" || this.pattern.constructor === String) ) {
			raise("Pattern has to be of type string.");
		}

		// Split configuration on whitespace
		var parts = this.pattern.trim().replace(/\s+/g, " ").split(" "),
			part,
			i,
			reValidCron = /[^\/\*0-9,-]+/,
			hasMonths,
			hasDaysOfWeek,
			hasDates;

		// Validite number of configuration entries
		if( parts.length !== 6 ) {
			raise("invalid configuration format ('" + this.pattern + "'), exacly five space separated parts required.");
		}

		// Validate field content
		for( i = 0; i < parts.length; i++ ) {
			part = parts[i].trim();

			// Check that part only contain legal characters ^[0-9-,]+$
			if( reValidCron.test(part) ) {
				raise("configuration entry " + (i + 1) + " (" + part + ") contains illegal characters.");
			}
		}

		// Check that we dont have both months and daysofweek
		hasMonths = (parts[4] !== "*");
		hasDaysOfWeek = (parts[5] !== "*");
		hasDates = (parts[3] !== "*");

		// Month/Date and dayofweek is incompatible
		if( hasDaysOfWeek && (hasMonths || hasDates) ) {
			raise("configuration invalid, you can not combine month/date with day of week.");
		}

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

	CronPattern.prototype.partToArray = function (type, conf, valueIndexOffset) {

		var i,
			split,
			lower,
			upper,
			steps,
			arr = this[type];

		// First off, handle wildcard
		if( conf === "*" ) {
			for( i = 0; i < arr.length; i++ ) {
				arr[i] = 1;
			}

			return;
		}

		// Check if we need to split
		split = conf.split(",");

		// Recurse into comma separated entries
		if( split.length > 1 ) {
			for( i = 0; i < split.length; i++ ) {
				this.partToArray(type, split[i], valueIndexOffset);
			}
		
			return;
		}

		// Didn't need to recurse, determine if this is a range, steps or a number
		// - Got a range
		if( conf.indexOf("-") !== -1 ) {

			split = conf.split("-");

			if( split.length !== 2 ) {
				raise("Syntax error, illegal range: '" + conf + "'");
			}

			lower = parseInt(split[0], 10) + valueIndexOffset;
			upper = parseInt(split[1], 10) + valueIndexOffset;

			if( isNaN(lower) ) {
				raise("Syntax error, illegal lower range (NaN)");
			} else if( isNaN(upper) ) {
				raise("Syntax error, illegal upper range (NaN)");
			}

			//
			if( lower < 0 || upper >= arr.length ) {
				raise("Value out of range: '" + conf + "'");
			}

			//
			if( lower > upper ) {
				raise("From value is larger than to value: '" + conf + "'");
			}

			for( i = lower; i <= upper; i++ ) {
				arr[(i + valueIndexOffset)] = 1;
			}

		// - Got stepping
		} else if( conf.indexOf("/") !== -1 ) {
			
			split = conf.split("/");

			if( split.length !== 2 ) {
				raise("Syntax error, illegal stepping: '" + conf + "'");
			}

			if( split[0] !== "*" ) {
				raise("Syntax error, left part of / needs to be * : '" + conf + "'");
			}

			steps = parseInt(split[1], 10);

			if( isNaN(steps) ) {
				raise("Syntax error, illegal stepping: (NaN)");
			}

			if( steps === 0 ) {
				raise("Syntax error, illegal stepping: 0");
			}

			if( steps > arr.length ) {
				raise("Syntax error, steps cannot be greater than maximum value of part ("+arr.length+")");
			}

			for( i = 0; i < arr.length; i+= steps ) {
				arr[(i + valueIndexOffset)] = 1;
			}

		// - Got a number
		} else {

			i = (parseInt(conf, 10) + valueIndexOffset);

			if( i < 0 || i >= arr.length ) {
				raise(type + " value out of range: '" + conf + "'");
			}

			arr[i] = 1;
		}

	};



	//
	// ---- Cron --------------------------------------------------------------------------
	//

	function Cron (pattern, options, fn) {
		var self = this;
		
		// Optional "new" keyword
		if( !(this instanceof Cron) ) {
			return new Cron(pattern, options, fn);
		}

		self.pattern = new CronPattern(pattern);

		self.schedulerDefaults = {
			stopAt:     Infinity,
			maxRuns:    Infinity,
			kill:       false
		};

		// Make options optional
		if( typeof options === "function" ) {
			fn = options;
			options = {};
		}

		// Store and validate options
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

	Cron.prototype.next = function (prev) {
		
		prev = prev || safeDate();

		// Previous run should never be before startAt
		if( this.opts.startAt && prev < this.opts.startAt ) {
			prev = this.opts.startAt;
		}

		var 
			stopAt = this.opts.stopAt || this.schedulerDefaults.stopAt,
			cronDate = new CronDate(prev),
			nextRun;

		cronDate.increment(this.pattern);

		// Get next run
		nextRun = cronDate.getDate();

		// All seem good, return next run
		return !(stopAt && nextRun >= stopAt ) ? nextRun : void 0;
	};

	Cron.prototype.validateOpts = function (opts) {
		// startAt is set, validate it
		if( opts.startAt !== void 0 ) {
			if( opts.startAt.constructor !== Date ) {
				opts.startAt = new Date(Date.parse(opts.startAt)-1);
			} else {
				opts.startAt = new Date(opts.startAt.getTime()-1);
			}

			// Raise if we did get an invalid date
			if( isNaN(opts.startAt) ) {
				raise("Provided value for startAt could not be parsed as date.");
			}
		} 
		if( opts.stopAt !== void 0 ) {
			if( opts.stopAt.constructor !== Date ) {
				opts.stopAt = new Date(Date.parse(opts.stopAt));
			}

			// Raise if we did get an invalid date
			if( isNaN(opts.stopAt) ) {
				raise("Provided value for stopAt could not be parsed as date.");
			}
		}
		return opts;
	};

	Cron.prototype.msToNext = function (prev) {
		prev = prev || safeDate();
		var next = this.next(prev);
		if( next ) {
			return (this.next(prev) - prev.getTime());
		} else {
			return next;
		}
	};

	Cron.prototype.schedule = function (opts, func) {

		var self = this,
			waitMs,

			// Prioritize context before closure,
			// to allow testing of maximum delay. 
			_maxDelay = self.maxDelay || maxDelay;

		// Make opts optional
		if( !func ) {
			func = opts;
			opts = {};
		}

		// Keep options, or set defaults
		opts.paused = (opts.paused === void 0) ? false : opts.paused;
		opts.kill = opts.kill || this.schedulerDefaults.kill;
		opts.rest = opts.rest || 0;
		if( !opts.maxRuns && opts.maxRuns !== 0 ) {
			opts.maxRuns = this.schedulerDefaults.maxRuns;
		}

		// Store options
		self.opts = self.validateOpts(opts || {});

		// Get ms to next run
		waitMs = this.msToNext(opts.previous);

		// Check for stop conditions
		if  (
				(opts.maxRuns <= 0) ||
				(waitMs === void 0) ||
				(opts.kill)
			) {
			return;  
		} 

		// setTimeout cant handle more than Math.pow(2, 32 - 1) - 1 ms
		if( waitMs > _maxDelay ) {
			waitMs = _maxDelay;
		}

		// All ok, go go!
		opts.currentTimeout = setTimeout(function () {

			// Are we running? If waitMs is maxed out, this is a blank run
			if( waitMs !== _maxDelay && !opts.paused ) {
				opts.maxRuns--;
				opts.previous = safeDate();
				func();
			}

			// Are we paused? In that case we need to update last run time
			if( opts.paused ) {
				opts.previous = safeDate();
			}

			// Recurse
			self.schedule(opts, func);

		}, waitMs );

		// Return control functions
		return {

			// Return undefined
			stop: function() {
				opts.kill = true;
				// Stop any awaiting call
				if( opts.currentTimeout ) {
					clearTimeout( opts.currentTimeout );
				}
			},

			// Return bool wether pause were successful
			pause: function() {
				return (opts.paused = true) && !opts.kill;
			},

			// Return bool wether resume were successful
			resume: function () {
				return !(opts.paused = false) && !opts.kill;
			}

		};
	};
	


	//
	// ---- Expose  ----------------------------------------------------------------------
	//

	// -> Node
	if( module && typeof module.exports === "object" ) {
		module.exports = Cron;

	// -> AMD / Requirejs etc.
	} else if( typeof define === "function" && define.amd ) {
		define([], function () {
			return Cron;
		});

	// -> Regular script tag
	} else {
		root.Cron = Cron;
	}

}).call(this);