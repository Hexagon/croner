/**
 * "Converts" a date to a specific time zone
 * 
 * Note: This is only for specific and controlled usage, 
 * as the internal UTC time of the resulting object will be off.
 * 
 * Example:
 *   let normalDate = new Date(); // d is a normal Date instance, with local timezone and correct utc representation
 *       tzDate = convertTZ(d, 'America/New_York') // d is a tainted Date instance, where getHours() 
 *                                                 (for example) will return local time in new york, but getUTCHours()
 *                                                 will return something irrelevant.
 * 
 * @param {Date} date - Input date
 * @param {string} tzString - Timezone string in Europe/Stockholm format
 * @returns {Date}
 */
function convertTZ(date, tzString) {
	return new Date(date.toLocaleString("en-US", {timeZone: tzString}));   
}   

export default convertTZ;
