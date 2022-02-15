import { CronDate } from "./date.js";

/**
 * Name for each part of the cron pattern
 * @typedef {("seconds" | "minutes" | "hours" | "days" | "months" | "daysOfWeek")} CronPatternPart
 */

/**
 * Offset, 0 or -1. 
 * 
 * 0 for seconds,minutes and hours as they start on 1. 
 * -1 on days and months, as the start on 0
 * 
 * @typedef {Number} CronIndexOffset
 */

/**
 * Create a CronPattern instance from pattern string ('* * * * * *')
 * @constructor
 * @param {string} pattern - Input pattern
 * @param {string} timezone - Input timezone, used for '?'-substitution
 */
function CronPattern (pattern, timezone) {

	this.pattern 		= pattern;
	this.timezone		= timezone;

	this.seconds        = Array(60).fill(0); // 0-59
	this.minutes        = Array(60).fill(0); // 0-59
	this.hours          = Array(24).fill(0); // 0-23
	this.days           = Array(31).fill(0); // 0-30 in array, 1-31 in config
	this.months         = Array(12).fill(0); // 0-11 in array, 1-12 in config
	this.daysOfWeek     = Array(8).fill(0);  // 0-7 Where 0 = Sunday and 7=Sunday;

	this.lastDayOfMonth = false;

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
	const parts = this.pattern.trim().replace(/\s+/g, " ").split(" ");

	// Validite number of configuration entries
	if( parts.length < 5 || parts.length > 6 ) {
		throw new TypeError("CronPattern: invalid configuration format ('" + this.pattern + "'), exacly five or six space separated parts required.");
	}

	// If seconds is omitted, insert 0 for seconds
	if( parts.length === 5) {
		parts.unshift("0");
	}

	// Convert 'L' to '*' and add lastDayOfMonth flag,
	// and set days to 28,29,30,31 as those are the only days that can be the last day of month
	if(parts[3].toUpperCase() == "L") {
		parts[3] = "28,29,30,31";
		this.lastDayOfMonth = true;
	}

	// Replace alpha representations
	parts[4] = this.replaceAlphaMonths(parts[4]);
	parts[5] = this.replaceAlphaDays(parts[5]);

	// Implement '?' in the simplest possible way - replace ? with current value, before further processing
	let initDate = new CronDate(new Date(),this.timezone).getDate(true);

	parts[0] = parts[0].replace("?", initDate.getSeconds());
	parts[1] = parts[1].replace("?", initDate.getMinutes());
	parts[2] = parts[2].replace("?", initDate.getHours());
	parts[3] = parts[3].replace("?", initDate.getDate());
	parts[4] = parts[4].replace("?", initDate.getMonth()+1); // getMonth is zero indexed while pattern starts from 1
	parts[5] = parts[5].replace("?", initDate.getDay());

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
 * @param {CronIndexOffset} valueIndexOffset
 * @param {boolean} [recursed] - Is this a recursed call 
 */
CronPattern.prototype.partToArray = function (type, conf, valueIndexOffset, recursed) {

	const arr = this[type];

	// First off, handle wildcard
	if( conf === "*" ) {
		for( let i = 0; i < arr.length; i++ ) {
			arr[i] = 1;
		}
		return;
	}

	// Handle separated entries (,) by recursion
	const split = conf.split(",");
	if( split.length > 1 ) {
		for( let i = 0; i < split.length; i++ ) {
			this.partToArray(type, split[i], valueIndexOffset, true);
		}

	// Handle range with stepping (x-y/z)
	} else if( conf.indexOf("-") !== -1 && conf.indexOf("/") !== -1 ) {
		if (recursed) throw new Error("CronPattern: Range with stepping cannot coexist with ,");

		this.handleRangeWithStepping(conf, type, valueIndexOffset);
	
	// Handle range
	} else if( conf.indexOf("-") !== -1 ) {
		if (recursed) throw new Error("CronPattern: Range with stepping cannot coexist with ,");

		this.handleRange(conf, type, valueIndexOffset);

	// Handle stepping
	} else if( conf.indexOf("/") !== -1 ) {
		if (recursed) throw new Error("CronPattern: Range with stepping cannot coexist with ,");

		this.handleStepping(conf, type, valueIndexOffset);

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
	const reValidCron = /[^/*0-9,-]+/;
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
	const i = (parseInt(conf, 10) + valueIndexOffset);

	if( i < 0 || i >= this[type].length ) {
		throw new TypeError("CronPattern: " + type + " value out of range: '" + conf + "'");
	}

	this[type][i] = 1;
};

/**
 * Take care of ranges with stepping (e.g. 3-23/5)
 * @private
 *
 * @param {string} conf - Current part, expected to be a string like 3-23/5
 * @param {string} type - One of "seconds", "minutes" etc
 * @param {number} valueIndexOffset - -1 for day of month, and month, as they start at 1. 0 for seconds, hours, minutes
 */
CronPattern.prototype.handleRangeWithStepping = function (conf, type, valueIndexOffset) {
	const matches = conf.match(/^(\d+)-(\d+)\/(\d+)$/);

	if( matches === null ) throw new TypeError("CronPattern: Syntax error, illegal range with stepping: '" + conf + "'");

	let [, lower, upper, steps] = matches;
	lower = parseInt(lower, 10) + valueIndexOffset;
	upper = parseInt(upper, 10) + valueIndexOffset;
	steps = parseInt(steps, 10);

	if( isNaN(lower) ) throw new TypeError("CronPattern: Syntax error, illegal lower range (NaN)");
	if( isNaN(upper) ) throw new TypeError("CronPattern: Syntax error, illegal upper range (NaN)");
	if( isNaN(steps) ) throw new TypeError("CronPattern: Syntax error, illegal stepping: (NaN)");

	if( steps === 0 ) throw new TypeError("CronPattern: Syntax error, illegal stepping: 0");
	if( steps > this[type].length ) throw new TypeError("CronPattern: Syntax error, steps cannot be greater than maximum value of part ("+this[type].length+")");

	if( lower < 0 || upper >= this[type].length ) throw new TypeError("CronPattern: Value out of range: '" + conf + "'");
	if( lower > upper ) throw new TypeError("CronPattern: From value is larger than to value: '" + conf + "'");

	for (let i = lower; i <= upper; i += steps) {
		this[type][i] = 1;
	}
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
	const split = conf.split("-");

	if( split.length !== 2 ) {
		throw new TypeError("CronPattern: Syntax error, illegal range: '" + conf + "'");
	}

	const lower = parseInt(split[0], 10) + valueIndexOffset,
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
		this[type][i] = 1;
	}
};

/**
 * Handle stepping (e.g. * / 14)
 * @private
 * 
 * @param {string} conf - Current part, expected to be a string like * /20 (without the space)
 * @param {string} type - One of "seconds", "minutes" etc
 */
CronPattern.prototype.handleStepping = function (conf, type) {

	const split = conf.split("/");

	if( split.length !== 2 ) {
		throw new TypeError("CronPattern: Syntax error, illegal stepping: '" + conf + "'");
	}

	let start = 0;
	if( split[0] !== "*" ) {
		start = parseInt(split[0], 10);
	}

	const steps = parseInt(split[1], 10);

	if( isNaN(steps) ) throw new TypeError("CronPattern: Syntax error, illegal stepping: (NaN)");
	if( steps === 0 ) throw new TypeError("CronPattern: Syntax error, illegal stepping: 0");
	if( steps > this[type].length ) throw new TypeError("CronPattern: Syntax error, steps cannot be greater than maximum value of part ("+this[type].length+")");

	for( let i = start; i < this[type].length; i+= steps ) {
		this[type][i] = 1;
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

export { CronPattern };