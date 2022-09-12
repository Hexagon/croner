export default minitz;
export namespace minitz {
    /**
         * "Converts" a date to a specific time zone
         *
         * **Note:** The resulting Date object will have local time set to target timezone,
         * but any functions/formatting working with UTC time, or offset will be misleading.
         *
         * Only use this function to get a formatted local time string.
         *
         * Example:
         *	 let normalDate = new Date(); // d is a normal Date instance, with local timezone and correct utc representation
         *			 tzDate = minitz.toTZ(d, 'America/New_York') // d is a tainted Date instance, where getHours()
         *																								 (for example) will return local time in new york, but getUTCHours()
         *																								 will return something irrelevant.
         *
         * @public
         *
         * @param {date} date - Input date
         * @param {string} tzString - Timezone string in Europe/Stockholm format
         * @returns {date} - Date object with local time adjusted to target timezone. UTC time WILL be off.
         */
    export function toTZ(date: any, tzString: string): any;
    /**
         * Reverse of toTZ
         *
         * @public
         *
         * @param {date} date - Tainted input date, where local time is time in target timezone
         * @param {string} tzString - Timezone string in Europe/Stockholm format
         * @param {boolean} [throwOnInvalidTime] - Default is to return adjusted time if input time is during an DST switch.
         *																				E.g. assume 01:01:01 if input is 00:01:01 but time actually
         *																				skips from 23:59:59 to 01:00:00. Setting this flag makes the library throw instead.
         * @returns {null|date} - Normal date object with correct UTC and Local time
         */
    export function fromTZ(inputDate: any, tzString: string, throwOnInvalidTime?: boolean): any;
    export { minitz };
}
