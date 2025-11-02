/**
 * Compatibility layer for the old minitz interface
 *
 * This module maintains backward compatibility with the original minitz API
 * while using the refactored timezone utilities internally.
 *
 * @deprecated Use direct imports from './timezone.ts' instead
 */

import {
  createTimePoint,
  fromTimezone,
  fromTZ,
  fromTZISO,
  type TimePoint,
  toTZ,
} from "./timezone.ts";

/**
 * Legacy minitz object structure for backward compatibility
 */
function minitz(
  y: number,
  m: number,
  d: number,
  h: number,
  i: number,
  s: number,
  tz: string,
  throwOnInvalid?: boolean,
): Date {
  return fromTimezone(y, m, d, h, i, s, tz, throwOnInvalid);
}

// Attach methods to maintain the old API structure
minitz.fromTZISO = fromTZISO;
minitz.fromTZ = fromTZ;
minitz.toTZ = toTZ;
minitz.tp = createTimePoint;
minitz.minitz = minitz;

// Export for backward compatibility
export default minitz;
export { minitz, type TimePoint };
