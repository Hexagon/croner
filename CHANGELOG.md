# Changelog

All notable changes to Croner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- `sloppyRanges` option to allow relaxed, backward-compatible non-standard range/stepping syntax (#327)
- Support for leading/trailing whitespace and consecutive whitespace in patterns
- Case-insensitive L and W modifiers in cron patterns (#328)
- Comprehensive edge case tests for year stepping, nth weekday, W modifier, Quartz mode, and boundary conditions (#329)

### Changed
- **BREAKING**: `?` character now acts as wildcard alias (same as `*`) per OCPS 1.4, instead of substituting current time values (#293)
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
