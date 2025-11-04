/**
 * Timezone conversion utilities for Croner
 *
 * Based on minitz by Hexagon <hexagon@56k.guru>
 * Integrated as part of Croner for timezone-aware cron scheduling
 */

/**
 * Represents a point in time in a specific timezone
 */
export interface TimePoint {
  y: number; // Year: 1970--
  m: number; // Month: 1-12
  d: number; // Day: 1-31
  h: number; // Hour: 0-23
  i: number; // Minute: 0-59
  s: number; // Second: 0-59
  tz?: string; // Time zone in IANA database format 'Europe/Stockholm'
}

/**
 * Helper function that takes an ISO8601 local date time string and creates a TimePoint.
 * Throws on failure. Throws on invalid date or time.
 *
 * @param dtStr - an ISO 8601 format date and time string with all components, e.g. 2015-11-24T19:40:00
 * @param tz - Optional timezone
 * @returns TimePoint instance from parsing the string
 */
function parseISOLocal(dtStr: string, tz?: string): TimePoint {
  // Parse date using built in Date.parse
  const pd = new Date(Date.parse(dtStr));

  // Check for completeness
  if (isNaN(pd as unknown as number)) {
    throw new Error("Invalid ISO8601 passed to timezone parser.");
  }

  // If date/time is specified in UTC (Z-flag included) or UTC offset is specified
  // (+ or - included after character 9 (20200101 or 2020-01-0))
  // Return time in UTC, else return local time and include timezone identifier
  const stringEnd = dtStr.substring(9);
  if (stringEnd.includes("Z") || stringEnd.includes("+") || stringEnd.includes("-")) {
    return createTimePoint(
      pd.getUTCFullYear(),
      pd.getUTCMonth() + 1,
      pd.getUTCDate(),
      pd.getUTCHours(),
      pd.getUTCMinutes(),
      pd.getUTCSeconds(),
      "Etc/UTC",
    );
  } else {
    return createTimePoint(
      pd.getFullYear(),
      pd.getMonth() + 1,
      pd.getDate(),
      pd.getHours(),
      pd.getMinutes(),
      pd.getSeconds(),
      tz,
    );
  }
}

/**
 * Converts a date/time from a specific timezone to a normal date object using the system local time
 *
 * @param y - Year: 1970--
 * @param m - Month: 1-12
 * @param d - Day: 1-31
 * @param h - Hour: 0-23
 * @param i - Minute: 0-59
 * @param s - Second: 0-59
 * @param tz - Time zone in IANA database format 'Europe/Stockholm'
 * @param throwOnInvalid - Default is to return the adjusted time if the call happens during a Daylight-Saving-Time switch
 * @returns Normal date object with correct UTC and system local time
 */
export function fromTimezone(
  y: number,
  m: number,
  d: number,
  h: number,
  i: number,
  s: number,
  tz: string,
  throwOnInvalid?: boolean,
): Date {
  return fromTZ(createTimePoint(y, m, d, h, i, s, tz), throwOnInvalid);
}

/**
 * Converts a date/time from a specific timezone to a normal date object using the system local time
 *
 * @param localTimeStr - ISO8601 formatted local time string, non UTC
 * @param tz - Time zone in IANA database format 'Europe/Stockholm'
 * @param throwOnInvalid - Default is to return the adjusted time if the call happens during a DST switch
 * @returns Normal date object
 */
export function fromTZISO(localTimeStr: string, tz?: string, throwOnInvalid?: boolean): Date {
  return fromTZ(parseISOLocal(localTimeStr, tz), throwOnInvalid);
}

/**
 * Converts a date/time from a specific timezone to a normal date object using the system local time
 *
 * @param tp - TimePoint with specified timezone
 * @param throwOnInvalid - Default is to return the adjusted time if the call happens during a DST switch
 * @returns Normal date object
 */
export function fromTZ(tp: TimePoint, throwOnInvalid?: boolean): Date {
  // Construct a Date object with UTC components matching the target local time
  const inDate = new Date(Date.UTC(tp.y, tp.m - 1, tp.d, tp.h, tp.i, tp.s));

  // See what this UTC time looks like when formatted in the target timezone
  const check0 = toTZ(inDate, tp.tz!);

  // Calculate the difference between target and actual local time components
  const targetMs = Date.UTC(tp.y, tp.m - 1, tp.d, tp.h, tp.i, tp.s);
  const actualMs = Date.UTC(check0.y, check0.m - 1, check0.d, check0.h, check0.i, check0.s);
  const diffMs = targetMs - actualMs;

  // First guess: adjust by the calculated difference
  const dateGuess = new Date(inDate.getTime() + diffMs);
  const check1 = toTZ(dateGuess, tp.tz!);

  // Check if the first guess produces the target local time
  const guess1Matches = check1.y === tp.y && check1.m === tp.m && check1.d === tp.d &&
    check1.h === tp.h && check1.i === tp.i && check1.s === tp.s;

  if (guess1Matches) {
    // Even if it matches, we might be in a DST overlap (fall back)
    // Check if there's another valid time 1 hour earlier
    const altGuess = new Date(dateGuess.getTime() - 3600000); // 1 hour earlier
    const altCheck = toTZ(altGuess, tp.tz!);

    // If the earlier time also produces the same local time, we're in a DST overlap
    if (
      altCheck.y === tp.y && altCheck.m === tp.m && altCheck.d === tp.d &&
      altCheck.h === tp.h && altCheck.i === tp.i && altCheck.s === tp.s
    ) {
      // Return the earlier time (first occurrence per OCPS 1.4)
      return altGuess;
    }

    return dateGuess;
  }

  // First guess didn't match, refine with a second iteration
  const targetMs2 = Date.UTC(tp.y, tp.m - 1, tp.d, tp.h, tp.i, tp.s);
  const actualMs2 = Date.UTC(check1.y, check1.m - 1, check1.d, check1.h, check1.i, check1.s);
  const diffMs2 = targetMs2 - actualMs2;

  const dateGuess2 = new Date(dateGuess.getTime() + diffMs2);
  const check2 = toTZ(dateGuess2, tp.tz!);

  const guess2Matches = check2.y === tp.y && check2.m === tp.m && check2.d === tp.d &&
    check2.h === tp.h && check2.i === tp.i && check2.s === tp.s;

  if (guess2Matches) {
    // Second guess matches
    return dateGuess2;
  }

  if (!throwOnInvalid) {
    // Neither guess matches exactly - we're in a DST transition
    if (guess1Matches && guess2Matches) {
      // Both match - DST overlap (fall back), return earlier time (OCPS 1.4)
      return dateGuess.getTime() < dateGuess2.getTime() ? dateGuess : dateGuess2;
    } else if (guess2Matches) {
      // Only guess2 matches
      return dateGuess2;
    } else if (guess1Matches) {
      // Only guess1 matches
      return dateGuess;
    } else {
      // Neither matches exactly - DST gap (spring forward)
      // Return the time after the gap (the later of the two)
      return dateGuess.getTime() > dateGuess2.getTime() ? dateGuess : dateGuess2;
    }
  } else {
    // Input time is invalid, and the library is instructed to throw
    throw new Error("Invalid date passed to fromTZ()");
  }
}

/**
 * Converts a date object to a TimePoint in the specified timezone
 *
 * @param d - Date to convert
 * @param tzStr - Target timezone in IANA database format
 * @returns TimePoint representing the date in the target timezone
 */
export function toTZ(d: Date, tzStr: string): TimePoint {
  // Use Intl.DateTimeFormat.formatToParts to extract date components in the target timezone
  // This avoids DST-related bugs that occur when parsing date strings in the local timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tzStr,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const dateComponents: Record<
    "year" | "month" | "day" | "hour" | "minute" | "second",
    number
  > = {
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    second: 0,
  };

  for (const part of parts) {
    if (
      part.type === "year" || part.type === "month" || part.type === "day" ||
      part.type === "hour" || part.type === "minute" || part.type === "second"
    ) {
      dateComponents[part.type] = parseInt(part.value, 10);
    }
  }

  // Node.js may return hour 24 for midnight (24:00 = 00:00 of same day in this context)
  // Normalize to hour 0 to match expected behavior
  if (dateComponents.hour === 24) {
    dateComponents.hour = 0;
  }

  return {
    y: dateComponents.year,
    m: dateComponents.month,
    d: dateComponents.day,
    h: dateComponents.hour,
    i: dateComponents.minute,
    s: dateComponents.second,
    tz: tzStr,
  };
}

/**
 * Creates a TimePoint object for use with fromTZ
 *
 * @param y - Year: 1970--
 * @param m - Month: 1-12
 * @param d - Day: 1-31
 * @param h - Hour: 0-23
 * @param i - Minute: 0-59
 * @param s - Second: 0-59
 * @param tz - Time zone in IANA database format 'Europe/Stockholm'
 * @returns TimePoint object
 */
export function createTimePoint(
  y: number,
  m: number,
  d: number,
  h: number,
  i: number,
  s: number,
  tz?: string,
): TimePoint {
  return { y, m, d, h, i, s, tz };
}
