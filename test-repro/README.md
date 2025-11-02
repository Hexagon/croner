# Minimal Reproduction for Node.js Test Framework Issue

## Problem

Tests in `test/timezone.test.ts` pass in Deno and Bun but fail in Node.js with:

1. "asynchronous activity after the test ended" errors
2. Incorrect assertion values (timestamps off by ~23 hours)

## Affected Tests

- `UTC timezone should not skip hours during local DST transitions (issue #284)`
- `OCPS 1.4 compliance: DST Overlap (Fall Back) - job should run once at first occurrence`
- `OCPS 1.4 compliance: Europe/London DST transitions`

## Node.js Error Example

```
Error: Test "UTC timezone should not skip hours during local DST transitions (issue #284)" 
generated asynchronous activity after the test ended. This activity created the error 
"AssertionError: Values are not equal: Failed for 2025-10-05T00:00:00Z

    [Diff] Actual / Expected

-   1759708800000
+   1759626000000
```

Expected: `2025-10-05T01:00:00.000Z` (1759626000000) Got: `2025-10-05T00:00:00.000Z`
(1759708800000) - 23 hours off!

## Running the Reproduction

### Deno (Works)

```bash
deno test --allow-read test-repro/minimal-repro.ts
```

### Node.js (Expected to fail)

```bash
# Requires @cross/test framework setup for Node.js
# Run via the CI workflow or setup Node.js environment manually
```

## Analysis

The code changes in PR #XXX added year field support (OCPS 1.2) by:

1. Adding `starYear` flag to distinguish wildcard years from constrained years
2. Year matching logic that skips to next valid year when current year doesn't match
3. Resetting date components when jumping to a new year

For the failing tests:

- All use 6-field patterns (no explicit year field): `"0 0 * * * *"`
- These patterns automatically get `starYear = true` (wildcard year)
- The year-checking code should NOT execute for these patterns (`if (!pattern.starYear)`)
- Tests pass in Deno, proving the logic is correct
- Tests fail only in Node.js with specific error patterns

## Hypothesis

The issue appears to be Node.js-specific, possibly related to:

- How Node.js handles Date objects or timezone calculations differently
- The @cross/test framework's async handling in Node.js
- A subtle timing or initialization difference in Node.js runtime

The fact that:

1. Tests pass in Deno and Bun
2. The code changes only affect patterns with year constraints
3. Failing tests use patterns WITHOUT year constraints
4. The error is runtime-specific

Suggests this is a test framework or Node.js runtime issue, not a logic bug in the cron library.

## Investigation Needed

1. Verify Node.js version and timezone environment in CI
2. Check if @cross/test has known Node.js-specific issues
3. Add debug logging to trace actual execution in Node.js
4. Compare Date object behavior between Deno and Node.js for the specific test cases
