# Investigation: Timezone Test Failures in Node.js CI

## Problem Statement

Three timezone-related tests fail when running on Node.js in GitHub CI (which uses UTC as system timezone), but pass in:
- Deno (any system timezone) 
- Node.js with non-UTC system timezone (e.g., Europe/Stockholm)

## Failing Tests

### 1. UTC timezone should not skip hours during local DST transitions (issue #284)
```
Expected: 1759626000000 (2025-10-05T01:00:00Z)
Got:      1759708800000 (2025-10-06T00:00:00Z)
Difference: 82800000 ms = 23 hours
```

### 2. OCPS 1.4 compliance: DST Overlap (Fall Back)
```
Expected: 2025-11-03T06:30:00.000Z
Got:      2025-11-02T05:30:00.000Z (wrong, should be next day)
Difference: ~25 hours
```

### 3. OCPS 1.4 compliance: Europe/London DST transitions
```
Expected: 2025-03-30T01:30:00.000Z
Got:      2025-03-31T00:30:00.000Z
Difference: ~23 hours
```

## Key Findings

### Error Pattern
All three tests show approximately 23-24 hour differences, suggesting an off-by-one day error in date calculations.

### Historical Context
- **Commit 2bd8a8d (Oct 27, 2022)**: Added timezone matrix testing with `["America/New_York", "Europe/London", "Europe/Berlin", "America/Santiago"]`
- **Notable**: UTC was NOT included in the test matrix
- **Current state**: Workflow uses `@cross-org/workflows` without explicit timezone configuration, defaulting to UTC in GitHub Actions

### Root Cause Identified ✅

The debug test output from GitHub Actions revealed the issue: **Node.js returns hour "24" for midnight instead of "0"**.

From the debug output:
```
# [DEBUG] Formatted (shortOffset)
# [DEBUG]   "10/05/2025, 24:00:00 GMT"
...
# [DEBUG] Parsed components
# [DEBUG]   {
#   "year": 2025,
#   "month": 10,
#   "day": 5,
#   "hour": 24,    <-- BUG!
#   "minute": 0,
#   "second": 0
# }
```

When `Intl.DateTimeFormat` with `hour12: false` formats midnight (00:00), Node.js returns "24" instead of "0". This is passed to `Date.UTC()` which interprets hour 24 as the next day at hour 0, causing the 23-hour offset.

This occurs in two places:
1. `getTimezoneOffset()` fallback calculation (line 83)
2. `toTZ()` function (line 322)

**In Deno**: `Intl.DateTimeFormat("en-US", {timeZone: "UTC", timeZoneName: "shortOffset"})` returns `"GMT"`
- Regex matches ✓
- Returns 0 immediately ✓
- Tests pass ✓

**In Node.js (hypothesis)**: The label might be:
- Empty string
- Different format
- undefined
- Or `shortOffset` option might not be supported in some Node.js versions

If the regex doesn't match, the code falls through to the calculation-based fallback (lines 62-107), which should still work correctly. However, there may be an edge case in that path when:
- System timezone = UTC
- Target timezone = UTC
- Working with dates near DST transitions in other timezones

## Debug Test

Created `test/debug-node-timezone.test.ts` which will run in GitHub Actions Node CI and provide:

1. **System Environment Info**
   - Runtime version
   - Timezone offset
   - Environment variables

2. **Intl.DateTimeFormat Behavior**
   - What `shortOffset` returns for UTC
   - Whether `timeZoneName` part exists
   - Exact label value and format

3. **Step-by-Step Calculation**
   - Input → Output for each failing test
   - Actual vs expected timestamps
   - Exact difference in hours/days

4. **All Failing Scenarios**
   - UTC timezone test
   - DST Overlap test
   - Europe/London DST test

## Expected Debug Output

The debug test will reveal:
- Whether Node.js returns a different label format
- Which code path is taken (early return vs fallback)
- Exact point where calculation goes wrong
- Any differences in Intl implementation between Node.js and Deno

## Solution Implemented ✅

Added hour normalization in two locations in `src/helpers/timezone.ts`:

### 1. In `getTimezoneOffset()` function (after line 83):
```typescript
// Node.js may return hour 24 for midnight instead of 0, normalize it
if (map.hour === 24) {
  map.hour = 0;
}
```

### 2. In `toTZ()` function (after line 322):
```typescript
// Node.js may return hour 24 for midnight instead of 0, normalize it
if (dateComponents.hour === 24) {
  dateComponents.hour = 0;
}
```

This normalizes hour 24 to hour 0 before passing to `Date.UTC()`, preventing the date from rolling over to the next day.

## Verification

All tests verified to work correctly in Deno with:
- ✓ System TZ = UTC
- ✓ System TZ = America/New_York
- ✓ System TZ = Australia/Sydney
- ✓ Various date formats
- ✓ Rapid succession calls
- ✓ All timezone conversion roundtrips

## Code Locations

- **Timezone offset calculation**: `src/helpers/timezone.ts:28-108` (`getTimezoneOffset`)
- **Pattern matching**: `src/helpers/timezone.ts:50` (regex check)
- **Fallback calculation**: `src/helpers/timezone.ts:62-107`
- **Failing tests**: `test/timezone.test.ts:203-334`
- **Debug test**: `test/debug-node-timezone.test.ts`
