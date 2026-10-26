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
 * Whether an ISO 8601 string specifies UTC or a UTC offset, and so is an exact instant
 *
 * @param dtStr - an ISO 8601 format date and time string
 */
export function hasUtcDesignator(dtStr: string): boolean {
  // Z-flag included, or + or - included after character 9 (20200101 or 2020-01-0)
  const stringEnd = dtStr.substring(9);
  return stringEnd.includes("Z") || stringEnd.includes("+") || stringEnd.includes("-");
}

/**
 * Helper function that takes an ISO8601 local date time string and creates a TimePoint.
 * Throws on failure. Throws on invalid date or time.
 *
 * @param dtStr - an ISO 8601 format date and time string with all components, e.g. 2015-11-24T19:40:00
 * @param tz - Optional timezone
 * @returns TimePoint (whole seconds) and milliseconds from parsing the string
 */
function parseISOLocal(dtStr: string, tz?: string): { tp: TimePoint; ms: number } {
  // Parse date using built in Date.parse
  const pd = new Date(Date.parse(dtStr));

  // Check for completeness
  if (isNaN(pd as unknown as number)) {
    throw new Error("Invalid ISO8601 passed to timezone parser.");
  }

  // If date/time is specified in UTC or with a UTC offset, return time in UTC,
  // else return local time and include timezone identifier.
  // A TimePoint holds whole seconds, so the milliseconds are returned separately.
  if (hasUtcDesignator(dtStr)) {
    return {
      tp: createTimePoint(
        pd.getUTCFullYear(),
        pd.getUTCMonth() + 1,
        pd.getUTCDate(),
        pd.getUTCHours(),
        pd.getUTCMinutes(),
        pd.getUTCSeconds(),
        "Etc/UTC",
      ),
      ms: pd.getUTCMilliseconds(),
    };
  } else {
    return {
      tp: createTimePoint(
        pd.getFullYear(),
        pd.getMonth() + 1,
        pd.getDate(),
        pd.getHours(),
        pd.getMinutes(),
        pd.getSeconds(),
        tz,
      ),
      ms: pd.getMilliseconds(),
    };
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
  const { tp, ms } = parseISOLocal(localTimeStr, tz);
  // Keep the milliseconds of the string, so it is the same instant as the equivalent Date
  return new Date(fromTZ(tp, throwOnInvalid).getTime() + ms);
}

/**
 * Converts a date/time from a specific timezone to a normal date object using the system local time
 *
 * @param tp - TimePoint with specified timezone
 * @param throwOnInvalid - Default is to return the adjusted time if the call happens during a DST switch
 * @returns Normal date object, the first occurrence if the time occurs twice
 */
export function fromTZ(tp: TimePoint, throwOnInvalid?: boolean): Date {
  const resolved = resolveLocal(tp);
  if (resolved.kind === "single") return resolved.date;
  if (resolved.kind === "ambiguous") return resolved.earlier;
  if (throwOnInvalid) throw new Error("Invalid date passed to fromTZ()");
  return resolved.after;
}

/**
 * The real instants of a local time:
 * - single: the time occurs once
 * - ambiguous: the time occurs twice, as the clock goes back (DST fall back)
 * - gap: the time does not exist, as the clock jumps forward (DST spring forward).
 *   The clock change happens between `before` and `after`, and `after` is the
 *   instant the time would have had with the offset from before the change.
 */
export type LocalResolution =
  | { kind: "single"; date: Date }
  | { kind: "ambiguous"; earlier: Date; later: Date }
  | { kind: "gap"; before: Date; after: Date };

/**
 * Resolves a local time in a timezone to its real instants
 *
 * @param tp - TimePoint with specified timezone, or without timezone for system local time
 */
export function resolveLocal(tp: TimePoint): LocalResolution {
  const targetMs = timePointToMs(tp);
  const offsetAt = (ms: number) => utcOffsetMs(new Date(ms), tp.tz);

  // First guess: the target local time, adjusted by the offset at the target time read as UTC
  const guessMs = targetMs - offsetAt(targetMs);
  const guessLocal = toTZ(new Date(guessMs), tp.tz);

  if (timePointsMatch(guessLocal, tp)) {
    // The time exists. It occurs twice if the offset drops within a few hours,
    // and the same local time is found one offset change earlier or later.
    const offset = timePointToMs(guessLocal) - guessMs;
    const earlierMs = guessMs - (offsetAt(guessMs - DST_PROBE_MS) - offset);
    if (earlierMs < guessMs && timePointsMatch(toTZ(new Date(earlierMs), tp.tz), tp)) {
      return { kind: "ambiguous", earlier: new Date(earlierMs), later: new Date(guessMs) };
    }
    const laterMs = guessMs + (offset - offsetAt(guessMs + DST_PROBE_MS));
    if (laterMs > guessMs && timePointsMatch(toTZ(new Date(laterMs), tp.tz), tp)) {
      return { kind: "ambiguous", earlier: new Date(guessMs), later: new Date(laterMs) };
    }
    return { kind: "single", date: new Date(guessMs) };
  }

  // First guess didn't match, refine with the offset at the first guess
  const guess2Ms = targetMs - (timePointToMs(guessLocal) - guessMs);
  if (timePointsMatch(toTZ(new Date(guess2Ms), tp.tz), tp)) {
    return { kind: "single", date: new Date(guess2Ms) };
  }

  // Neither guess matches - we're in a DST gap (spring forward)
  return {
    kind: "gap",
    before: new Date(Math.min(guessMs, guess2Ms)),
    after: new Date(Math.max(guessMs, guess2Ms)),
  };
}

/**
 * No DST transition moves the clock more than this, so it is far enough to look for one
 */
const DST_PROBE_MS = 3 * 3600000;

/**
 * Helper function to get the UTC offset of a timezone at an instant
 *
 * @returns Offset in milliseconds, local time minus UTC
 */
function utcOffsetMs(date: Date, tz?: string): number {
  return timePointToMs(toTZ(date, tz)) - (date.getTime() - date.getUTCMilliseconds());
}

/**
 * Finds the instant the UTC offset changes, between two instants with different offsets
 *
 * @param fromMs - Instant before the change, whole seconds
 * @param toMs - Instant after the change, whole seconds
 * @param tz - Timezone, or undefined for system local time
 * @returns The first whole second with the new offset
 */
export function findOffsetChange(fromMs: number, toMs: number, tz?: string): number {
  const fromOffset = utcOffsetMs(new Date(fromMs), tz);
  while (toMs - fromMs > 1000) {
    const middle = fromMs + Math.floor((toMs - fromMs) / 2000) * 1000;
    if (utcOffsetMs(new Date(middle), tz) === fromOffset) {
      fromMs = middle;
    } else {
      toMs = middle;
    }
  }
  return toMs;
}

/**
 * Which pass of a repeated local time an instant is on, as the clock goes back (DST fall back)
 *
 * @returns "earlier" or "later", or undefined if the local time of the instant occurs only once
 */
export function foldOf(ms: number, tz?: string): "earlier" | "later" | undefined {
  const resolved = resolveLocal(toTZ(new Date(ms), tz));
  if (resolved.kind !== "ambiguous") return undefined;
  return ms < resolved.later.getTime() ? "earlier" : "later";
}

/**
 * Creating an Intl.DateTimeFormat is expensive, so keep one per timezone
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Converts a date object to a TimePoint in the specified timezone
 *
 * @param d - Date to convert
 * @param tzStr - Target timezone in IANA database format
 * @returns TimePoint representing the date in the target timezone
 */
export function toTZ(d: Date, tzStr?: string): TimePoint {
  // System local time
  if (tzStr === undefined) {
    return createTimePoint(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds(),
    );
  }

  // Use Intl.DateTimeFormat.formatToParts to extract date components in the target timezone
  // This avoids DST-related bugs that occur when parsing date strings in the local timezone
  let formatter: Intl.DateTimeFormat | undefined = formatterCache.get(tzStr);
  let parts: Intl.DateTimeFormatPart[];

  try {
    if (!formatter) {
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
      formatterCache.set(tzStr, formatter);
    }
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
