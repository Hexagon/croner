/**
 * Converts a date to a specific time zone
 * 
 * @param {date} date - Input date
 * @param {string} tzString - Timezone string in Europe/Stockholm format
 * @returns {date}
 */
function convertTZ(date, tzString) {
<<<<<<< HEAD
	return new Date(date.toLocaleString("en-US", {timeZone: tzString}));   
}   
=======
    if (date && !date.appliedTz) {
        date.appliedTz = tzString;
        date = new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));
    }
    return date;   
}
>>>>>>> 4a11952 (WIP)

export default convertTZ;
