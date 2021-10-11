/**
 * Converts a date to a specific time zone
 * 
 * @param {date} date - Input date
 * @param {string} tzString - Timezone string in Europe/Stockholm format
 * @returns {date}
 */
function convertTZ(date, tzString) {
	return new Date(date.toLocaleString("en-US", {timeZone: tzString}));   
}   

export default convertTZ;
