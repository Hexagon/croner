
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

	// Array.fill polyfill
	if (!Array.prototype.fill) {
		Array.prototype.fill = function(value) {

		// Steps 1-2.
		if (this == null) {
		  throw new TypeError('this is null or not defined');
		}

		var O = Object(this);

		// Steps 3-5.
		var len = O.length >>> 0;

		// Steps 6-7.
		var start = arguments[1];
		var relativeStart = start >> 0;

		// Step 8.
		var k = relativeStart < 0 ?
		  Math.max(len + relativeStart, 0) :
		  Math.min(relativeStart, len);

		// Steps 9-10.
		var end = arguments[2];
		var relativeEnd = end === undefined ?
		  len : end >> 0;

		// Step 11.
		var final = relativeEnd < 0 ?
		  Math.max(len + relativeEnd, 0) :
		  Math.min(relativeEnd, len);

		// Step 12.
		while (k < final) {
		  O[k] = value;
		  k++;
		}

		// Step 13.
		return O;
		};
	}

	var root = this,

		// Many JS engines stores the delay as a 32-bit signed integer internally.
		// This causes an integer overflow when using delays larger than 2147483647, resulting in the timeout being executed immediately.
		// 
		// All JS engines implements an immediate execution of delays larger that a 32-bit int to keep the behaviour concistent. 
		maxDelay = Math.pow(2, 32 - 1) - 1;

	function raise (err) {
		throw new TypeError('Cron parser: ' + err);
	}
	 
	function partToArray (type, arr, conf, valueIndexOffset) {

		var i,x,
			confParts,
			split,
			index,
			lower,
			upper;
	 
		// First off, handle wildcard
		if (conf === '*' ) {
			for (i = 0; i < arr.length; i++) {
				arr[i] = 1;
			}

			return;
		}
	 
		// Check if we need to split
		confParts = conf.split(',');
	 
		// Recurse into comma separated entries
		if (confParts.length > 1) {
			for (i = 0; i < confParts.length; i++) {
				partToArray(type, arr, confParts[i], valueIndexOffset);
			}
		
			return;
		}
	 
		// Didn't need to recurse, determine if this is a range or a number
		if (conf.indexOf('-') === -1) {
			// Got a number
			index = (parseInt(conf, 10) + valueIndexOffset);

			if (index < 0 || index >= arr.length) {
				raise(type + ' value out of range: "' + conf + '"');
			}

			arr[index] = 1;
		} else {

			// Got a range
			split = conf.split('-');

			if (split.length !== 2) {
				raise('syntax error, illegal range: "' + conf + '"');
			}

			lower = parseInt(split[0], 10) + valueIndexOffset;
			upper = parseInt(split[1], 10) + valueIndexOffset;

			if (isNaN(lower)) {
				raise('syntax error, illegal lower range (NaN)');
			} else if (isNaN(upper)) {
				raise('syntax error, illegal upper range (NaN)');
			}

			//
			if (lower < 0 || upper >= arr.length) {
				raise('value out of range: "' + conf + '"');
			}

			//
			if (lower > upper) {
				raise('from value is larger than to value: "' + conf + '"');
			}

			for (x = lower; x <= upper; x++) {
				arr[(x + valueIndexOffset)] = 1;
			}
		}
	}

	function parsePattern(pattern, target) {

		// Sanity check
		if (typeof pattern !== 'string') {
			raise('invalid configuration string ("' + pattern + '").');
		}

		// Split configuration on whitespace
		var parts = pattern.trim().replace(/\s+/g, ' ').split(' '),
			part,
			i,
			reValidCron = /[^0-9,-]+/,
			hasMonths,
			hasDaysOfWeek,
			hasDates,

			seconds,
			minutes,
			hours,
			days,
			months,
			daysOfWeek;

		// Validite number of configuration entries
		if (parts.length !== 6) {
			raise('invalid configuration format ("' + pattern + '"), exacly five space separated parts required.');
		}

		// Validate field content
		for (i = 0; i < parts.length; i++) {
			part = parts[i].trim();

			// Check that part only contain legal characters ^[0-9-,]+$
			if (part !== '*' && reValidCron.test(part)) {
				raise('configuration entry ' + (i + 1) + ' (' + part + ') contains illegal characters.');
			}
		}

		// Check that we dont have both months and daysofweek
		hasMonths = (parts[4] !== '*');
		hasDaysOfWeek = (parts[5] !== '*');
		hasDates = (parts[3] !== '*');

		// Month/Date and dayofweek is incompatible
		if (hasDaysOfWeek && (hasMonths || hasDates)) {
			raise('configuration invalid, you can not combine month/date with day of week.');
		}
	 
		// Parse parts into arrays, validates as we go
		partToArray('seconds',               target.seconds,	parts[0], 0);
		partToArray('minutes',               target.minutes,	parts[1], 0);
		partToArray('hours',                 target.hours,		parts[2], 0);
		partToArray('days',                  target.days,		parts[3], -1);
		partToArray('months',                target.months,		parts[4], -1);
		partToArray('daysOfWeek',            target.daysOfWeek,	parts[5], 0);
	 
		// 0 = Sunday, 7 = Sunday
		if (target.daysOfWeek[0]) {
			target.daysOfWeek[7] = 1;
		}

		if (target.daysOfWeek[7]) {
			target.daysOfWeek[0] = 1;
		}
	}

	function safeDate() {
		return new Date(new Date().setMilliseconds(0));
	}
	 
	function Cron (pattern) {
		var self = this;
		
		// Optional 'new' keyword
		if (!(this instanceof Cron)) {
			return new Cron(pattern);
		}

		self.pattern = pattern;

		self.seconds 		= Array(60).fill(0); // 0-59
		self.minutes 		= Array(60).fill(0); // 0-59
		self.hours          = Array(24).fill(0); // 0-23
		self.days           = Array(31).fill(0); // 0-30 in array, 1-31 in config
		self.months         = Array(12).fill(0); // 0-11 in array, 1-12 in config
		self.daysOfWeek     = Array(8).fill(0);  // 0-7 Where 0 = Sunday and 7=Sunday;

		self.schedulerDefaults = {
			stopAt: 	Infinity,
			maxRuns: 	Infinity,
			kill: 		false
		};

		parsePattern(pattern, self);

		return this;
	}
	 
	Cron.prototype.next = function (date) {

		var self = this,
			date = date || safeDate(),
			temp,

			collection = {
				cSecs: date.getSeconds() + 1,
				cMins: date.getMinutes(),
				cHour: date.getHours(),
				cDate: date.getDate(),
				cMon: date.getMonth(),
				cYear: date.getFullYear(),
			},

			secs = self.seconds,
			mins = self.minutes,
			hours = self.hours,
			days = self.days,
			months = self.months,

			hasDays = !(days.filter(Boolean).length==31),
			hasMonths = !(months.filter(Boolean).length==12);
	 
		function goUp (what, who, current, increment, valueIndexOffset) {

			var i, found = false, dayChanged;

			if (what[who[current] + valueIndexOffset]) return true;

			for (i = (who[current] + valueIndexOffset); i < mins.length; i++) {
				if (what[i]) {
					who[current] = i-valueIndexOffset;
					found = true;
					break;
				}
			}

			if (!found) {
				who[increment] += 1;

				for (i = 0; i < who[current] + valueIndexOffset; i++) {
					if (what[i]) {
						who[current] = i - valueIndexOffset;
						break;
					}
				}
			}

			return found;
		}
	 
		// Count up to minute and hour
		dayChanged = false;
	 	var upMinHour = function (collection) {
	 		goUp(secs,  collection, 'cSecs','cMins', 0);
			goUp(mins,  collection, 'cMins','cHour', 0);
			return !(goUp(hours, collection, 'cHour','cDate', 0));
	 	}; 
	 	
	 	dayChanged = upMinHour(collection);

		if (hasDays || hasMonths) {
			// Count up to date and month
			dayChanged = goUp(days, collection, 'cDate', 'cMon', -1);
			goUp(months, collection, 'cMon', 'cYear', 0); // No need to compensate here as javascript count months 0-11

			return new Date(collection.cYear, collection.cMon, collection.cDate, collection.cHour, collection.cMins, collection.cSecs, 0);
		}

		while (!self.daysOfWeek[new Date(collection.cYear, collection.cMon, collection.cDate, collection.cHour, collection.cMins, collection.cSecs, 0).getDay()]) {
			collection.cDate += 1;
			dayChanged = true;
		}

		// If day changed, we need to re-run hours and minutes
		if (dayChanged) {
			collection.cSecs = collection.cMins = collection.cHour = 0;
			upMinHour(collection);
		}

		return new Date(collection.cYear, collection.cMon, collection.cDate, collection.cHour, collection.cMins, collection.cSecs, 0);
	}

	Cron.prototype.msToNext = function (prev) {
		return (this.next(prev) - safeDate().getTime());
	}

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
		opts.paused = (opts.paused === undefined) ? false : opts.paused;
		opts.previous = (recurse === false) ? safeDate() : opts.startAt || opts.previous;
		opts.stopAt = opts.stopAt || this.schedulerDefaults.stopAt;
		opts.kill = opts.kill || this.schedulerDefaults.kill;
		opts.rest = opts.rest || 0;
		if (!opts.maxRuns && opts.maxRuns !== 0) {
			opts.maxRuns = this.schedulerDefaults.maxRuns;
		}

		// One-timer
		opts.startAt = undefined;

		// Get ms to next run
		waitMs = this.msToNext(opts.previous);

		// Check for stop conditions
		if (opts.maxRuns <= 0) return;
		if (opts.stopAt !== Infinity && opts.previous.getTime() + waitMs/1000 > opts.stopAt.getTime() ) return;
		if (opts.kill) return;

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

		// First run? Return killer
		if ( !recurse ) {
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

			}
		}
	}

	// Expose
	if (typeof module != 'undefined' && typeof module.exports === 'object') {
		module.exports = Cron;
	} else if (typeof define === 'function' && define.amd) {
		define([], function () {
			return Cron;
		});
	} else {
		root.cron = Cron;
	}

}).call(this);
