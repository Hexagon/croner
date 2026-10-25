# Changelog

All notable changes to Croner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [11.0.0] - 2026-10-25

### Breaking changes

- **DST handling aligned with croner-rust and Vixie cron, deviating from OCPS 1.4 §4.3.1**: jobs
  are either fixed-time jobs (one value each for seconds, minutes and hours) or interval jobs.
  - A fixed-time job in a DST gap (spring forward) runs at the first valid time after the gap. In
    10.x it ran as much later as the gap was long (`0 30 2 * * *` ran at 3:30 AM, now 3:00 AM).
  - An interval job runs on both occurrences of a time repeated by a DST overlap (fall back), so
    `* * * * *` keeps running through the repeated hour (#343). Patterns with more than one
    hour, minute or second, like `0 30 1,2 * * *`, are interval jobs.
  - Fixed-time jobs still run once, at the first occurrence, in a DST overlap.
- **`startAt` is inclusive**: a pattern match exactly at `startAt` now runs. Previously the first
  run was the following match. This does not apply with `interval` set, where the first run is
  still `interval` seconds after `startAt`. A `startAt` between two whole seconds counts from the
  next whole second, and a `stopAt` between two whole seconds still includes the second before it.
- **With `dayOffset`, `nextRun()`, `nextRuns()`, `previousRuns()`, `msToNext()` and `enumerate()`
  return actual run times**, searched from the reference, the same way the scheduler and
  `isRunning()` do. Previously they shifted the next pattern match after the reference, so a
  negative offset could return a time before the reference, and `msToNext()` ignored the offset.
- **`previousRun()` returns when the previous run started**, as documented. Previously it returned
  when the run finished.

### Added

- `enumerate(startAt?)` method returning a stateful `CronIterator` that supports iterator/iterable
  protocols (`for...of`, destructuring, `next()`, `peek()`, `reset()`) and honors `maxRuns`
  (#365). The `CronIterator` class is exported.
- `allowPast` option for explicitly allowing date-based jobs scheduled more than 1 second in the
  past to fire immediately (#349).
- New public type exports: `CatchCallbackFn`, `CronMode`, and `ProtectCallbackFn`.

### Changed

- Cached `Intl.DateTimeFormat` instances per timezone, making timezone-aware scheduling noticeably
  faster.
- Date-based jobs dated up to 1 second in the past now fire immediately, so a job created for
  "now" is not lost to the time it took to create it. Older dates fire only with `allowPast: true`.
  Previously a date-based job in the past never fired (#348).
- Clarified `dayOffset` JSDoc and completed missing option documentation, including iterator usage,
  `allowPast`, and DST behavior.
- Updated the copyright year to 2026.

### Fixed

- Fixed timers being re-armed with negative delays throughout the repeated hour of a DST fall back
  (#399). `nextRun()` and `msToNext()` no longer return a time in the past when the reference is
  inside the repeated hour, and searches move in real time in both directions.
- Fixed `nextRuns()` going backwards or repeating times around a DST spring forward.
- Fixed DST handling in timezones with a 30-minute overlap (Australia/Lord_Howe) (#404).
- Fixed scheduling gaps after a DST fall back when the reference had fractional seconds (#407).
- Fixed `msToNext()` returning a wrong (often negative) value when passed an ISO 8601 string on a
  job with `timezone` set. The string was read in system local time (#401, #402).
- Fixed ISO 8601 strings being read in system local time on jobs with `utcOffset`, in `nextRun()`,
  `msToNext()`, `match()`, `startAt`, `stopAt` and one-off dates. Strings with `Z` or an offset,
  like `2026-01-01T00:00:00Z`, are read as that exact instant (#401).
- Fixed `startAt` given as a `Date` being searched in system local time on jobs with `utcOffset`.
- Fixed `previousRuns()` throwing for patterns with month-specific wildcards (e.g., `0 9 * 4 *`)
  when the reference date falls outside allowed months, and for leap-day patterns (`0 0 29 2 *`)
  in leap years (#408, #409).
- Fixed patterns that can never match: `previousRuns()` threw a `TypeError` for patterns like
  `0 0 30 2 *`, and `nextRun()`, `nextRuns()` and `previousRuns()` threw `Maximum call stack size
  exceeded` for `0 0 16 * 5#L` with `domAndDow: true`. They now return `null` and an empty list.
- Fixed scheduling after system clock changes: occurrences silently skipped after forward clock
  steps (#393), timer and target disagreeing after backward clock steps (#417), and timer targets
  for `dayOffset` schedules and protected jobs (#395).
- Fixed `isRunning()`, `nextRun()` and `msToNext()` disagreeing with the scheduler when
  `dayOffset` is set.
- Fixed negative timer delays overflowing in some runtimes, blocking expected catch-up execution
  (#370, #369).
- Fixed date-based run-once edge cases around creation-time races, paused-resume catch-up flows,
  and catch-up within the current second in a named timezone (#348, #349).
- Fixed `?` in day-of-month or day-of-week behaving differently from `*`: `0 0 ? * MON` ran every
  day instead of every Monday (#392).
- Fixed exhausted schedules with `startAt` and `interval` (#390).
- Fixed `RangeError` when using stepping with year field wildcard. `*/2` in the year field matches
  even years (#373, #374).
- Fixed `CronDate` validation using incorrect max value for the hour field (59 instead of 23), which
  could silently accept out-of-range hours.
- Fixed the `@deprecated` JSDoc tag being on `dayOffset` instead of `legacyMode`.
- Fixed `CronDate` ignoring changes to its fields (e.g. `date.day = 20`) in `getDate()`,
  `getTime()`, `nextRun()`, `msToNext()` and `startAt`, a regression in the 11.0.0-dev prereleases.
- Fixed ISO 8601 strings losing their milliseconds, so a `startAt` string like
  `2030-01-01T00:00:00.500Z` gave a first run before `startAt`, and strings and `Date`s differed in
  `stopAt`, one-off dates, `nextRun()` and `msToNext()`. Also fixed a one-off date later in the same
  second as `startAt` never running.

### CI / Build

- Updated workflow and packaging metadata around publish/test setup. The published package
  metadata now comes from the committed `package.json`; `build/package.template.json` is removed.
- Switched declaration bundling from esbuild to rollup with rollup-plugin-dts, restoring dist
  parity with previous releases.
- Development is now Node.js-first: `package.json` is committed and is the source of truth for
  version, scripts and dev dependencies, the build script runs on Node.js (`npm run build`), and
  tests run with `npm test`. Deno is still supported (`deno task test`, fmt/lint, JSR publishing),
  and `npm version` keeps `deno.json` in sync.

## [10.0.1] - 2026-02-01

### Fixed

- Bundle TypeScript declarations into single file to match 9.1.0 dist structure

## [10.0.0] - 2026-02-01

### Added

- **OCPS 1.2 Compliance**: Year field support for 7-field patterns (range 1-9999) (#288)
- **OCPS 1.3 Compliance**: W (weekday) modifier for nearest weekday scheduling (#288)
- **OCPS 1.4 Compliance**: + (AND logic) modifier for explicit day matching (#288)
- **OCPS 1.4 Compliance**: @midnight and @reboot pattern nicknames (#288)
- `previousRuns()` method to enumerate past scheduled execution times (#315)
- `match()` method to check if a date matches a cron pattern (#317)
- `getOnce()` method to return original run-once date for date-based jobs (#332)
- `dayOffset` option for scheduling before/after pattern matches (#308)
- `mode` option for cron pattern precision control with enforcement and flexible modes (#294)
- `alternativeWeekdays` option for Quartz-style weekday numbering (1=Sunday...7=Saturday) (#312)
- `domAndDow` option to replace deprecated `legacyMode` (no breaking change) (#309)
- `sloppyRanges` option to allow relaxed, backward-compatible non-standard range/stepping syntax
  (#327)
- Support for leading/trailing whitespace and consecutive whitespace in patterns
- Case-insensitive L and W modifiers in cron patterns (#328)
- Comprehensive edge case tests for year stepping, nth weekday, W modifier, Quartz mode, and
  boundary conditions (#329)

### Changed

- **BREAKING**: `?` character now acts as wildcard alias (same as `*`) per OCPS 1.4, instead of
  substituting current time values (#293)
- **BREAKING**: Minimum Deno version increased from 1.16 to 2.0
- Renamed `legacyMode` option to `domAndDow` (backward compatible, `legacyMode` still works) (#309)
- Improved error messages for timezone/date conversion failures (#307)
- Unified implementations of `nextRuns`/`previousRuns` and `findNext`/`findPrevious` (#319)
- Refactored to extract duplicate code patterns into helper methods (#322)
- Consolidated duplicate tests across OCPS compliance and legacy test suites (#320)

### Fixed

- DST bugs causing rapid-fire execution during timezone transitions (Issue #286) (#285)
- DST bug with UTC timezone causing hour skipping during local DST transitions (Issue #284) (#285)
- Cron job stopping when catch callback throws with protect enabled (#337)
- L modifier bug and documented W modifier edge cases (#306)
- `getPattern()` returning wrong value for date-based jobs (#331)
- Node.js timezone test failures caused by hour 24 midnight formatting (#291)
- Unclear error messages for timezone/date conversion failures (#307)

### Documentation

- Complete OCPS 1.0-1.4 compliance documentation (#292)
- Migration guide for v9.x to v10.0 upgrade path (#310)
- Documented zero dependencies advantage over Luxon-dependent alternatives (#318)
- Updated year field in README ASCII pattern diagram (#311)
- Documented `getOnce()` and `previousRuns()` features (#333)

## [9.1.0] - 2024-10-21

### Added

- Generic context typing support
- Improved timeout adaptations in tests

### Changed

- Updated documentation and readme
- Allow leading/trailing whitespace in patterns

### Fixed

- Various bug fixes and improvements

---

For older releases, see [GitHub Releases](https://github.com/Hexagon/croner/releases).
