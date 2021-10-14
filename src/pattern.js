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
 * Parse current pattern, will raise an error on failure
 */
CronPattern.prototype.parse = function () {

	// Sanity check
	if( !(typeof this.pattern === "string" || this.pattern.constructor === String) ) {
		throw new TypeError("CronPattern: Pattern has to be of type string.");
	}

	// Split configuration on whitespace
	let parts = this.pattern.trim().replace(/\s+/g, " ").split(" "),
		part,
		i,
		reValidCron = /[^/*0-9,-]+/;

	// Validite number of configuration entries
	if( parts.length < 5 || parts.length > 6 ) {
		throw new TypeError("CronPattern: invalid configuration format ('" + this.pattern + "'), exacly five or six space separated parts required.");
	}

	// If seconds is omitted, insert 0 for seconds
	if( parts.length === 5) {
		parts.unshift("0");
	}

	// Validate field content
	for( i = 0; i < parts.length; i++ ) {
		part = parts[i].trim();

		// Check that part only contain legal characters ^[0-9-,]+$
		if( reValidCron.test(part) ) {
			throw new TypeError("CronPattern: configuration entry " + (i + 1) + " (" + part + ") contains illegal characters.");
		}
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

/**
 * Convert current part (seconds/minutes etc) to an array of 1 or 0 depending on if the part is about to trigger a run or not.
 * 
 * @param {CronPatternPart} type - Seconds/minutes etc
 * @param {string} conf - Current pattern part - *, 0-1 etc
 * @param {CronIndexOffset} valueIndexOffset - 0 or -1. 0 for seconds,minutes, hours as they start on 1. -1 on days and months, as the start on 0
 */
CronPattern.prototype.partToArray = function (type, conf, valueIndexOffset) {

	let i,
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

	// Recurse into comma separated entries
	split = conf.split(",");
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
			throw new TypeError("CronPattern: Syntax error, illegal range: '" + conf + "'");
		}

		lower = parseInt(split[0], 10) + valueIndexOffset;
		upper = parseInt(split[1], 10) + valueIndexOffset;

		if( isNaN(lower) ) {
			throw new TypeError("CronPattern: Syntax error, illegal lower range (NaN)");
		} else if( isNaN(upper) ) {
			throw new TypeError("CronPattern: Syntax error, illegal upper range (NaN)");
		}

		// Check that value is within range
		if( lower < 0 || upper >= arr.length ) {
			throw new TypeError("CronPattern: Value out of range: '" + conf + "'");
		}

		//
		if( lower > upper ) {
			throw new TypeError("CronPattern: From value is larger than to value: '" + conf + "'");
		}

		for( i = lower; i <= upper; i++ ) {
			arr[(i + valueIndexOffset)] = 1;
		}

	// - Got stepping
	} else if( conf.indexOf("/") !== -1 ) {
		
		split = conf.split("/");

		if( split.length !== 2 ) {
			throw new TypeError("CronPattern: Syntax error, illegal stepping: '" + conf + "'");
		}

		if( split[0] !== "*" ) {
			throw new TypeError("CronPattern: Syntax error, left part of / needs to be * : '" + conf + "'");
		}

		steps = parseInt(split[1], 10);

		if( isNaN(steps) ) {
			throw new TypeError("CronPattern: Syntax error, illegal stepping: (NaN)");
		}

		if( steps === 0 ) {
			throw new TypeError("CronPattern: Syntax error, illegal stepping: 0");
		}

		if( steps > arr.length ) {
			throw new TypeError("CronPattern: Syntax error, steps cannot be greater than maximum value of part ("+arr.length+")");
		}

		for( i = 0; i < arr.length; i+= steps ) {
			arr[(i + valueIndexOffset)] = 1;
		}

	// - Got a number
	} else {

		i = (parseInt(conf, 10) + valueIndexOffset);

		if( i < 0 || i >= arr.length ) {
			throw new TypeError("CronPattern: " + type + " value out of range: '" + conf + "'");
		}

		arr[i] = 1;
	}

};

export { CronPattern };