import { CronDate } from "./date.js";

/**
 * Name for each part of the cron pattern
 * @typedef {("second" | "minute" | "hour" | "day" | "month" | "dayOfWeek")} CronPatternPart
 */

/**
 * Offset, 0 or -1. 
 * 
 * 0 offset is used for seconds,minutes and hours as they start on 1. 
 * -1 on days and months, as they start on 0
 * 
 * @typedef {Number} CronIndexOffset
 */

/**
 * Constants to represent different occurrences of a weekday in its month.
 * - `LAST_OCCURRENCE`: The last occurrence of a weekday.
 * - `ANY_OCCURRENCE`: Combines all individual weekday occurrence bitmasks, including the last.
 * - `OCCURRENCE_BITMASKS`: An array of bitmasks, with each index representing the respective occurrence of a weekday (0-indexed). 
 */
export const LAST_OCCURRENCE = 0b100000;
export const ANY_OCCURRENCE = 0b00001 | 0b00010 | 0b00100 | 0b01000 | 0b10000 | LAST_OCCURRENCE;
export const OCCURRENCE_BITMASKS = [0b00001, 0b00010, 0b00100, 0b010000, 0b10000];

/**
 * Create a CronPattern instance from pattern string ('* * * * * *')
 * @constructor
 * @param {string} pattern - Input pattern
 * @param {string} timezone - Input timezone, used for '?'-substitution
 */
function CronPattern (pattern, timezone) {

	this.pattern 		= pattern;
	this.timezone		= timezone;

	this.second			= Array(60).fill(0); // 0-59
	this.minute			= Array(60).fill(0); // 0-59
	this.hour			= Array(24).fill(0); // 0-23
	this.day			= Array(31).fill(0); // 0-30 in array, 1-31 in config
	this.month			= Array(12).fill(0); // 0-11 in array, 1-12 in config
	this.dayOfWeek		= Array(7).fill(0);  // 0-7 Where 0 = Sunday and 7=Sunday; Value is a bitmask

	this.lastDayOfMonth = false;

	this.starDOM = false;  // Asterisk used for dayOfMonth
	this.starDOW  = false; // Asterisk used for dayOfWeek

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

	// Handle @yearly, @monthly etc
	if (this.pattern.indexOf("@") >= 0) this.pattern = this.handleNicknames(this.pattern).trim();

	// Split configuration on whitespace
	const parts = this.pattern.replace(/\s+/g, " ").split(" ");

	// Validite number of configuration entries
	if( parts.length < 5 || parts.length > 6 ) {
		throw new TypeError("CronPattern: invalid configuration format ('" + this.pattern + "'), exactly five or six space separated parts are required.");
	}

	// If seconds is omitted, insert 0 for seconds
	if( parts.length === 5) {
		parts.unshift("0");
	}

	// Convert 'L' to lastDayOfMonth flag in day-of-month field
	if(parts[3].indexOf("L") >= 0) {
		parts[3] = parts[3].replace("L","");
		this.lastDayOfMonth = true;
	}
	
	// Check for starDOM
	if(parts[3] == "*") {
		this.starDOM = true;
	}

	// Replace alpha representations
	if (parts[4].length >= 3) parts[4] = this.replaceAlphaMonths(parts[4]);
	if (parts[5].length >= 3) parts[5] = this.replaceAlphaDays(parts[5]);

	// Check for starDOW
	if(parts[5] == "*") {
		this.starDOW = true;
	}
	
	// Implement '?' in the simplest possible way - replace ? with current value, before further processing
	if (this.pattern.indexOf("?") >= 0) {
		const initDate = new CronDate(new Date(),this.timezone).getDate(true);
		parts[0] = parts[0].replace("?", initDate.getSeconds());
		parts[1] = parts[1].replace("?", initDate.getMinutes());
		parts[2] = parts[2].replace("?", initDate.getHours());
		if (!this.starDOM) parts[3] = parts[3].replace("?", initDate.getDate());
		parts[4] = parts[4].replace("?", initDate.getMonth()+1); // getMonth is zero indexed while pattern starts from 1
		if (!this.starDOW) parts[5] = parts[5].replace("?", initDate.getDay());
	}

	// Check part content
	this.throwAtIllegalCharacters(parts);

	// Parse parts into arrays, validates as we go
	this.partToArray("second",    parts[0], 0, 1);
	this.partToArray("minute",    parts[1], 0, 1);
	this.partToArray("hour",      parts[2], 0, 1);
	this.partToArray("day",       parts[3], -1, 1);
	this.partToArray("month",     parts[4], -1, 1);
	this.partToArray("dayOfWeek", parts[5], 0, ANY_OCCURRENCE);

	// 0 = Sunday, 7 = Sunday
	if(this.dayOfWeek[7]) {
		this.dayOfWeek[0] = this.dayOfWeek[7];
	}

};

/**
 * Convert current part (seconds/minutes etc) to an array of 1 or 0 depending on if the part is about to trigger a run or not.
 * @private
 * 
 * @param {CronPatternPart} type - Seconds/minutes etc
 * @param {string} conf - Current pattern part - *, 0-1 etc
 * @param {CronIndexOffset} valueIndexOffset
 * @param {number} defaultValue
 * @param {boolean} [recursed] - Is this a recursed call 
 */
CronPattern.prototype.partToArray = function (type, conf, valueIndexOffset, defaultValue) {

	const arr = this[type];

	// Error on empty part
	const lastDayOfMonth = (type === "day" && this.lastDayOfMonth);
	if( conf === "" && !lastDayOfMonth ) throw new TypeError("CronPattern: configuration entry " + type + " (" + conf + ") is empty, check for trailing spaces.");
	
	// First off, handle wildcard
	if( conf === "*" ) return arr.fill(defaultValue);

	// Handle separated entries (,) by recursion
	const split = conf.split(",");
	if( split.length > 1 ) {
		for( let i = 0; i < split.length; i++ ) {
			this.partToArray(type, split[i], valueIndexOffset, defaultValue);
		}

	// Handle range with stepping (x-y/z)
	} else if( conf.indexOf("-") !== -1 && conf.indexOf("/") !== -1 ) {
		this.handleRangeWithStepping(conf, type, valueIndexOffset, defaultValue);
	
	// Handle range
	} else if( conf.indexOf("-") !== -1 ) {
		this.handleRange(conf, type, valueIndexOffset, defaultValue);

	// Handle stepping
	} else if( conf.indexOf("/") !== -1 ) {
		this.handleStepping(conf, type, valueIndexOffset, defaultValue);

	// Anything left should be a number
	} else if( conf !== "" ) {
		this.handleNumber(conf, type, valueIndexOffset, defaultValue);
	}

};

/**
 * After converting JAN-DEC, SUN-SAT only 0-9 * , / - are allowed, throw if anything else pops up
 * @private
 * 
 * @param {string[]} parts - Each part split as strings
 */
CronPattern.prototype.throwAtIllegalCharacters = function(parts) {
	for (let i = 0; i < parts.length; i++) {
		const reValidCron = i === 5 ? /[^/*0-9,\-#L]+/ : /[^/*0-9,-]+/;
		if (reValidCron.test(parts[i])) {
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
CronPattern.prototype.handleNumber = function (conf, type, valueIndexOffset, defaultValue) {
	
	const result = this.extractNth(conf, type);
	
	const i = (parseInt(result[0], 10) + valueIndexOffset);

	if( isNaN(i) ) {
		throw new TypeError("CronPattern: " + type + " is not a number: '" + conf + "'");
	}

	this.setPart(type, i, result[1] || defaultValue);
};

/**
 * Set a specific value for a specific part of the CronPattern.
 * 
 * @param {CronPatternPart} part - The specific part of the CronPattern, e.g., "second", "minute", etc.
 * @param {number} index - The index to modify.
 * @param {number} value - The value to set, typically 0 or 1, in case of "nth weekday" it will be the weekday number used for further processing
 */
CronPattern.prototype.setPart = function(part, index, value) {

	// Ensure the part exists in our CronPattern.
	if (!Object.prototype.hasOwnProperty.call(this,part)) {
		throw new TypeError("CronPattern: Invalid part specified: " + part);
	}

	//  Special handling for dayOfWeek
	if (part === "dayOfWeek") {
		// SUN can both be 7 and 0, normalize to 0 here
		if (index === 7) index = 0;
		if ((index < 0 || index > 6) && index !== "L") {
			throw new RangeError("CronPattern: Invalid value for dayOfWeek: " + index);
		}
		this.setNthWeekdayOfMonth(index, value);
		return;
	}

	// Validate the value for the specified part.
	if (part === "second" || part === "minute") {
		if (index < 0 || index >= 60) {
			throw new RangeError("CronPattern: Invalid value for " + part + ": " + index);
		}
	} else if (part === "hour") {
		if (index < 0 || index >= 24) {
			throw new RangeError("CronPattern: Invalid value for " + part + ": " + index);
		}
	} else if (part === "day") {
		if (index < 0 || index >= 31) {
			throw new RangeError("CronPattern: Invalid value for " + part + ": " + index);
		}
	} else if (part === "month") {
		if (index < 0 || index >= 12) {
			throw new RangeError("CronPattern: Invalid value for " + part + ": " + index);
		}
	}

	// Set the value for the specific part and index.
	this[part][index] = value;
};

/**
 * Take care of ranges with stepping (e.g. 3-23/5)
 * @private
 *
 * @param {string} conf - Current part, expected to be a string like 3-23/5
 * @param {string} type - One of "seconds", "minutes" etc
 * @param {number} valueIndexOffset - -1 for day of month, and month, as they start at 1. 0 for seconds, hours, minutes
 */
CronPattern.prototype.handleRangeWithStepping = function (conf, type, valueIndexOffset, defaultValue) {

	const result = this.extractNth(conf, type);
	
	const matches = result[0].match(/^(\d+)-(\d+)\/(\d+)$/);

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

	if( lower > upper ) throw new TypeError("CronPattern: From value is larger than to value: '" + conf + "'");

	for (let i = lower; i <= upper; i += steps) {
		this.setPart(type, i, result[1] || defaultValue);
	}
};

CronPattern.prototype.extractNth = function (conf, type) {
	// Break out nth weekday (#) if exists
	// - only allow if type os dayOfWeek
	let rest = conf;
	let nth;
	if (rest.includes("#")) {
		if (type !== "dayOfWeek") {
			throw new Error("CronPattern: nth (#) only allowed in day-of-week field");
		}
		nth = rest.split("#")[1];
		rest = rest.split("#")[0];
	}
	return [rest, nth];
};

/**
 * Take care of ranges (e.g. 1-20)
 * @private
 * 
 * @param {string} conf - Current part, expected to be a string like 1-20, can contain L for last
 * @param {string} type - One of "seconds", "minutes" etc
 * @param {number} valueIndexOffset - -1 for day of month, and month, as they start at 1. 0 for seconds, hours, minutes
 */
CronPattern.prototype.handleRange = function (conf, type, valueIndexOffset, defaultValue) {

	const result = this.extractNth(conf, type);

	const split = result[0].split("-");

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

	//
	if( lower > upper ) {
		throw new TypeError("CronPattern: From value is larger than to value: '" + conf + "'");
	}

	for( let i = lower; i <= upper; i++ ) {
		this.setPart(type, i, result[1] || defaultValue);
	}
};

/**
 * Handle stepping (e.g. * / 14)
 * @private
 * 
 * @param {string} conf - Current part, expected to be a string like * /20 (without the space)
 * @param {string} type - One of "seconds", "minutes" etc
 */
CronPattern.prototype.handleStepping = function (conf, type, valueIndexOffset, defaultValue) {

	const result = this.extractNth(conf, type);

	const split = result[0].split("/");

	if( split.length !== 2 ) {
		throw new TypeError("CronPattern: Syntax error, illegal stepping: '" + conf + "'");
	}

	let start = 0;
	if( split[0] !== "*" ) {
		start = parseInt(split[0], 10) + valueIndexOffset;
	}

	const steps = parseInt(split[1], 10);

	if( isNaN(steps) ) throw new TypeError("CronPattern: Syntax error, illegal stepping: (NaN)");
	if( steps === 0 ) throw new TypeError("CronPattern: Syntax error, illegal stepping: 0");
	if( steps > this[type].length ) throw new TypeError("CronPattern: Syntax error, max steps for part is ("+this[type].length+")");

	for( let i = start; i < this[type].length; i+= steps ) {
		this.setPart(type, i, result[1] || defaultValue);
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
		.replace(/-sun/gi, "-7") // choose 7 if sunday is the upper value of a range because the upper value must not be smaller than the lower value
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

/**
 * Replace nicknames with actual cron patterns
 * @private
 * 
 * @param {string} pattern - Pattern, may contain nicknames, or not
 * 
 * @returns {string} - Pattern, with cron expression insted of nicknames
 */
CronPattern.prototype.handleNicknames = function (pattern) {
	// Replace textual representations of pattern
	const cleanPattern = pattern.trim().toLowerCase();
	if (cleanPattern === "@yearly" || cleanPattern === "@annually") {
		return "0 0 1 1 *";
	} else if (cleanPattern === "@monthly") {
		return "0 0 1 * *";
	} else if (cleanPattern === "@weekly") {
		return "0 0 * * 0";
	} else if (cleanPattern === "@daily") {
		return "0 0 * * *";
	} else if (cleanPattern === "@hourly") {
		return "0 * * * *";
	} else {
		return pattern;
	}
};

/**
 * Handle the nth weekday of the month logic using hash sign (e.g. FRI#2 for the second Friday of the month)
 * @private
 * 
 * @param {number} index - Weekday, example: 5 for friday
 * @param {number} nthWeekday - bitmask, 2 (0x00010) for 2nd friday, 31 (ANY_OCCURRENCE, 0b100000) for any day
 */
CronPattern.prototype.setNthWeekdayOfMonth = function(index, nthWeekday) {
	if (nthWeekday === "L") {
		this["dayOfWeek"][index] = this["dayOfWeek"][index] | LAST_OCCURRENCE;
	} else if (nthWeekday < 6 && nthWeekday > 0) {
		this["dayOfWeek"][index] = this["dayOfWeek"][index] | OCCURRENCE_BITMASKS[nthWeekday - 1];
	} else if (nthWeekday === ANY_OCCURRENCE) {
		this["dayOfWeek"][index] = ANY_OCCURRENCE;
	} else {
		throw new TypeError(`CronPattern: nth weekday of of range, should be 1-5 or L. Value: ${nthWeekday}`);
	}
};

export { CronPattern };
