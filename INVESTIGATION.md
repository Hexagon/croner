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

### Investigation Focus

The critical line in `src/helpers/timezone.ts:50`:
```typescript
if (/^(GMT|UTC)$/i.test(label)) return 0;
```

This line checks if the timezone label returned by `Intl.DateTimeFormat` matches "GMT" or "UTC" (case-insensitive) and returns 0 offset.

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

## Next Steps

1. **Wait for GitHub Actions**: Let the debug test run in Node CI
2. **Analyze Output**: Review the debug logs from the PR checks
3. **Identify Root Cause**: Determine exactly what Node.js returns differently
4. **Implement Fix**: Based on findings, either:
   - Add additional regex patterns to catch Node.js format
   - Fix the fallback calculation logic
   - Add special handling for UTC timezone
   - Restore timezone matrix (workaround)

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
