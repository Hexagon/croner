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

	// Calculate offset between local and target, this will be a "best guess"
	const 
		targetPlus = new Date(sourceDate.toLocaleString("sv-SE", {timeZone: tzString})),
		bestGuessOffset = sourceDate.getTime() - targetPlus.getTime();

	let testOffset = 0,
		iterations = 0,
		closestAfter = -Infinity;

	while (iterations++ < 2) {

		const 
			// Subtract best guess from target, creating a guessed local time
			guessedLocalTime = new Date(sourceDate.getTime() + bestGuessOffset - testOffset),
		
			// Add correct timezone offset to guessed local time
			test = new Date(guessedLocalTime.toLocaleString("sv-SE", {timeZone: tzString}));

		// If offset is 0, we made it, return correct local time
		testOffset = test.getTime() - sourceDate.getTime();
		if (testOffset === 0) {
			return guessedLocalTime;

		// If there is an offset, this usually mean that there is a DST switch locally between target and guessed local time 
		} else {

			// Store best guess after actual time, to use if we cannot make a match at all
			if (testOffset < 0 && testOffset > closestAfter) {
				closestAfter = testOffset;
			}
		}

	}

	// If we made it here, it is impossible to create a local time that land at target time 
	// after applying the timezone offset. This usually means that target is during a 
	// DST switch (target is 00:00:00 when clock skips from 23:59:59 to 01:00:00).
	// In this case, use the point in time which yields the time closest to target after applying timezone offset
	// which in the previous example will be 01:00:00.
	return new Date(sourceDate.getTime() + bestGuessOffset - closestAfter);

}

export { CronTZ };
