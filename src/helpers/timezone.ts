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
 * Helper function that returns the current UTC offset (in ms) for a specific timezone at a specific point in time
 *
 * @param timeZone - Target time zone in IANA database format 'Europe/Stockholm'
 * @param date - Point in time to use as base for offset calculation
 * @returns Offset in ms between UTC and timeZone
 */
function getTimezoneOffset(timeZone?: string, date = new Date()): number {
  // No explicit timezone: rely on system offset
  if (!timeZone) return -date.getTimezoneOffset() * 60_000;

  // Try parsing the short offset in a stable way
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    const label = (tzPart?.value || "").replace(/\s/g, "");

    // Handle common patterns: GMT, UTC, GMT+H, GMT+HH, GMT+HH:MM (and UTC variants)
    if (/^(GMT|UTC)$/i.test(label)) return 0;
    const m = /^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(label);
    if (m) {
      const sign = m[1] === "+" ? 1 : -1;
      const hh = parseInt(m[2], 10);
      const mm = m[3] ? parseInt(m[3], 10) : 0;
      return sign * (hh * 60 + mm) * 60_000;
    }
  } catch {
    // Fall through to calculation-based fallback
  }

  // Fallback: derive offset by comparing the same wall-clock time in the target tz to UTC
  try {
    const wall = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    }).formatToParts(date);

    const map: Record<string, number> = {
      year: 0,
      month: 0,
      day: 0,
      hour: 0,
      minute: 0,
      second: 0,
    };
    for (const p of wall) if (p.type in map) map[p.type] = parseInt(p.value, 10);

    // Node.js may return hour 24 for midnight (24:00 = 00:00 of same day in this context)
    // Normalize to hour 0 to prevent Date.UTC from rolling over to next day
    if (map.hour === 24) {
      map.hour = 0;
    }

    const utcMs = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    );
    const sameWallInUTC = Date.UTC(
      map.year,
      map.month - 1,
      map.day,
      map.hour,
      map.minute,
      map.second,
      date.getUTCMilliseconds(),
    );
    return sameWallInUTC - utcMs;
  } catch {
    // Absolute last resort: assume UTC
    return 0;
  }
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
  const // Construct a fake Date object with UTC date/time set to local date/time in source timezone
  inDate = new Date(Date.UTC(
    tp.y,
    tp.m - 1,
    tp.d,
    tp.h,
    tp.i,
    tp.s,
  )),
    // Get offset between UTC and source timezone
    offset = getTimezoneOffset(tp.tz, inDate),
    // Remove offset from inDate to hopefully get a true date object
    dateGuess = new Date(inDate.getTime() - offset),
    // Get offset between UTC and guessed time in target timezone
    dateOffsGuess = getTimezoneOffset(tp.tz, dateGuess);

  // If offset between guessed true date object and UTC matches initial calculation, the guess
  // was spot on
  if ((dateOffsGuess - offset) === 0) {
    // Even if they match, we might be in a DST overlap situation (fall back)
    // Check if there's another valid time 1 hour earlier
    const altGuess = new Date(dateGuess.getTime() - 3600000); // 1 hour earlier
    const altOffset = getTimezoneOffset(tp.tz, altGuess);
    const altCheck = toTZ(altGuess, tp.tz!);

    // Check if the alternative time also matches the target local time
    // AND the offset is different (indicating we're in an overlap, not just an hour earlier)
    if (
      altCheck.y === tp.y && altCheck.m === tp.m && altCheck.d === tp.d &&
      altCheck.h === tp.h && altCheck.i === tp.i && altCheck.s === tp.s &&
      altOffset !== dateOffsGuess
    ) {
      // We're in a DST overlap! Return the earlier time (first occurrence per OCPS 1.4)
      return altGuess;
    }

    return dateGuess;
  } else {
    // Not quite there yet, make a second try on guessing the local time
    const dateGuess2 = new Date(inDate.getTime() - dateOffsGuess),
      dateOffsGuess2 = getTimezoneOffset(tp.tz, dateGuess2);

    if ((dateOffsGuess2 - dateOffsGuess) === 0) {
      // Second guess confirms the time
      return dateGuess2;
    } else if (!throwOnInvalid) {
      // Offsets don't match between guesses - we're in a DST transition
      // Check which guess produces the correct local time
      const check1 = toTZ(dateGuess, tp.tz!);
      const check2 = toTZ(dateGuess2, tp.tz!);

      const guess1Matches = check1.y === tp.y && check1.m === tp.m && check1.d === tp.d &&
        check1.h === tp.h && check1.i === tp.i && check1.s === tp.s;
      const guess2Matches = check2.y === tp.y && check2.m === tp.m && check2.d === tp.d &&
        check2.h === tp.h && check2.i === tp.i && check2.s === tp.s;

      if (guess1Matches && guess2Matches) {
        // Both match - DST overlap (fall back), return earlier time (OCPS 1.4)
        return dateGuess.getTime() < dateGuess2.getTime() ? dateGuess : dateGuess2;
      } else if (guess2Matches) {
        // Only guess2 matches - this is the correct time
        return dateGuess2;
      } else if (guess1Matches) {
        // Only guess1 matches - this is the correct time
        return dateGuess;
      } else {
        // Neither matches exactly - DST gap (spring forward)
        // Return the time after the gap (the later of the two)
        return dateGuess.getTime() > dateGuess2.getTime() ? dateGuess : dateGuess2;
      }
    } else {
      // Input time is invalid, and the library is instructed to throw, so let's do it
      throw new Error("Invalid date passed to fromTZ()");
    }
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
