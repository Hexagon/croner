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
 * Helper function to convert TimePoint components to UTC milliseconds
 *
 * @param tp - TimePoint to convert
 * @returns Milliseconds since epoch (UTC)
 */
function timePointToMs(tp: TimePoint): number {
  return Date.UTC(tp.y, tp.m - 1, tp.d, tp.h, tp.i, tp.s);
}

/**
 * Helper function to check if two TimePoints represent the same local time
 *
 * @param tp1 - First TimePoint
 * @param tp2 - Second TimePoint
 * @returns True if both represent the same local time components
 */
function timePointsMatch(tp1: TimePoint, tp2: TimePoint): boolean {
  return tp1.y === tp2.y && tp1.m === tp2.m && tp1.d === tp2.d &&
    tp1.h === tp2.h && tp1.i === tp2.i && tp1.s === tp2.s;
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
  afterMs?: number,
): Date {
  return fromTZ(createTimePoint(y, m, d, h, i, s, tz), throwOnInvalid, afterMs);
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
 * @param afterMs - Optional UTC milliseconds threshold. When provided and the local time falls
 *                  in a DST overlap, the returned Date will be the earliest occurrence that is
 *                  at or after this threshold (ensures monotonic progress across DST transitions).
 * @returns Normal date object
 */
export function fromTZ(tp: TimePoint, throwOnInvalid?: boolean, afterMs?: number): Date {
  // Construct a Date object with UTC components matching the target local time
  const inDate = new Date(timePointToMs(tp));

  // See what this UTC time looks like when formatted in the target timezone
  const check0 = toTZ(inDate, tp.tz!);

  // Calculate the difference between target and actual local time components
  const targetMs = timePointToMs(tp);
  const actualMs = timePointToMs(check0);
  const diffMs = targetMs - actualMs;

  // First guess: adjust by the calculated difference
  const dateGuess = new Date(inDate.getTime() + diffMs);
  const check1 = toTZ(dateGuess, tp.tz!);

  // Check if the first guess produces the target local time
  if (timePointsMatch(check1, tp)) {
    // Even if it matches, we might be in a DST overlap (fall back)
    // Check if there's another valid time 1 hour earlier or later
    const altEarlier = new Date(dateGuess.getTime() - 3600000);
    const altEarlierCheck = toTZ(altEarlier, tp.tz!);
    const altLater = new Date(dateGuess.getTime() + 3600000);
    const altLaterCheck = toTZ(altLater, tp.tz!);

    // Determine if we're in a DST overlap
    const hasEarlier = timePointsMatch(altEarlierCheck, tp);
    const hasLater = timePointsMatch(altLaterCheck, tp);

    if (hasEarlier || hasLater) {
      // We're in a DST overlap
      const firstOccurrence = hasEarlier ? altEarlier : dateGuess;
      const secondOccurrence = hasEarlier ? dateGuess : altLater;

      // When afterMs is provided, return the earliest occurrence that is >= afterMs
      // This ensures monotonic progress during DST fall-back transitions
      if (afterMs !== undefined) {
        if (firstOccurrence.getTime() >= afterMs) {
          return firstOccurrence;
        }
        return secondOccurrence;
      }
      // Default: return the earlier time (first occurrence per OCPS 1.4)
      return firstOccurrence;
    }

    return dateGuess;
  }

  // First guess didn't match, refine with a second iteration
  const dateGuess2 = new Date(dateGuess.getTime() + timePointToMs(tp) - timePointToMs(check1));
  const check2 = toTZ(dateGuess2, tp.tz!);

  if (timePointsMatch(check2, tp)) {
    // Second guess matches
    return dateGuess2;
  }

  if (!throwOnInvalid) {
    // Neither guess matches exactly - we're in a DST gap (spring forward)
    // Return the time after the gap (the later of the two)
    return dateGuess.getTime() > dateGuess2.getTime() ? dateGuess : dateGuess2;
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
  let formatter: Intl.DateTimeFormat;
  let parts: Intl.DateTimeFormatPart[];

  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzStr,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    parts = formatter.formatToParts(d);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    throw new RangeError(
      `toTZ: Invalid timezone '${tzStr}' or date. ` +
        `Please provide a valid IANA timezone (e.g., 'America/New_York', 'Europe/Stockholm'). ` +
        `Original error: ${errorMessage}`,
    );
  }
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

  // Validate that we got all required components
  if (
    isNaN(dateComponents.year) || isNaN(dateComponents.month) || isNaN(dateComponents.day) ||
    isNaN(dateComponents.hour) || isNaN(dateComponents.minute) || isNaN(dateComponents.second)
  ) {
    throw new Error(
      `toTZ: Failed to parse all date components from timezone '${tzStr}'. ` +
        `This may indicate an invalid date or timezone configuration. ` +
        `Parsed components: ${JSON.stringify(dateComponents)}`,
    );
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
