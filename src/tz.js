/**
 * "Converts" a date to a specific time zone
 * 
 * Note: This is only for specific and controlled usage, 
 * as the internal UTC time of the resulting object will be off.
 * 
 * Example:
 *   let normalDate = new Date(); // d is a normal Date instance, with local timezone and correct utc representation
 *       tzDate = CronTZ(d, 'America/New_York') // d is a tainted Date instance, where getHours() 
 *                                                 (for example) will return local time in new york, but getUTCHours()
 *                                                 will return something irrelevant.
 * 
 * @param {date} date - Input date
 * @param {string} tzString - Timezone string in Europe/Stockholm format
 * @param {boolean} [reverse] - Reverse operation
 * @returns {date}
 */
function CronTZ(date, tzString, reverse) {
	if (reverse) {
		return CronFromTZ(date, tzString);
	} else {
		return new Date(date.toLocaleString("sv-SE", {timeZone: tzString}));
	}
}   

/**
 * Reverse of CronTZ
 * 
 * @param {date} date - Input (tainted) date
 * @param {string} tzString - Timezone string in Europe/Stockholm format
 * @returns {date}
 */
function CronFromTZ(sourceDate, tzString) {

	// Try using target offset
	const 
		targetPlus = new Date(sourceDate.toLocaleString("sv-SE", {timeZone: tzString})),
		offset = sourceDate.getTime() - targetPlus.getTime();

	let testOffset = 0,
		iterations = 0,
		closestAfter = -Infinity;

	while (iterations++ < 2) {
		const 
			testTarget = new Date(sourceDate.getTime() + offset - testOffset),
			test = new Date(testTarget.toLocaleString("sv-SE", {timeZone: tzString}));

		testOffset = test.getTime() - sourceDate.getTime();

		if (testOffset === 0) {
			return testTarget;
		} else {
			if (testOffset < 0 && testOffset > closestAfter) {
				closestAfter = testOffset;
			}
		}

	}

	return new Date(sourceDate.getTime() + offset - closestAfter);

}

export { CronTZ };
