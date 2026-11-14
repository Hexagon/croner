/** Milliseconds in a complete Gregorian calendar cycle. */
const GREGORIAN_CYCLE_MS = 146097 * 86400000;

/**
 * Like Date.UTC, but treats years 0-99 as their actual years rather than 1900-1999.
 * Moving a first-century date forward one Gregorian cycle also preserves leap days
 * and normalizes overflowing components before shifting the timestamp back.
 */
export function utcTime(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): number {
  const earlyYear = year >= 0 && year < 100;
  const ms = Date.UTC(
    earlyYear ? year + 400 : year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
  return earlyYear ? ms - GREGORIAN_CYCLE_MS : ms;
}
