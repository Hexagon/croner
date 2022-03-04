import { CronDate } from "./date.js";

/**
 * @typedef {Object} CronOptions - Cron scheduler options
 * @property {boolean} [paused] - Job is paused
 * @property {boolean} [kill] - Job is about to be killed or killed
 * @property {boolean} [catch] - Continue exection even if a unhandled error is thrown by triggered function
 * @property {number} [maxRuns] - Maximum nuber of executions
 * @property {number} [interval] - Minimum interval between executions, in seconds
 * @property {string | Date} [startAt] - When to start running
 * @property {string | Date} [stopAt] - When to stop running
 * @property {string} [timezone] - Time zone in Europe/Stockholm format
 * @property {boolean} [legacyMode] - Combine day-of-month and day-of-week using OR. Default is AND.
 * @property {?} [context] - Used to pass any object to scheduled function
 */

/**
 * Internal function that validates options, and sets defaults
 * @private
 * 
 * @param {CronOptions} options 
 * @returns {CronOptions}
 */
function CronOptions(options) {
	
	// If no options are passed, create empty object
	if (options === void 0) {
		options = {};
	}
	
	// Keep options, or set defaults
	options.legacyMode = (options.legacyMode === void 0) ? false : options.legacyMode;
	options.paused = (options.paused === void 0) ? false : options.paused;
	options.maxRuns = (options.maxRuns === void 0) ? Infinity : options.maxRuns;
	options.catch = (options.catch === void 0) ? false : options.catch;
	options.interval = (options.interval === void 0) ? 0 : options.interval;
	options.kill = false;
	
	// startAt is set, validate it
	if( options.startAt ) {
		options.startAt = new CronDate(options.startAt, options.timezone);
	} 
	if( options.stopAt ) {
		options.stopAt = new CronDate(options.stopAt, options.timezone);
	}	

	return options;

}

export { CronOptions };