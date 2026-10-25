# Croner - Agent Guide

## Project Overview

Croner is a lightweight, zero-dependency cron library for JavaScript and TypeScript that works across Node.js, Deno, Bun, and browsers.

## Project Structure

```
croner/
├── src/                  # Source code
│   ├── croner.ts        # Main entry point
│   ├── pattern.ts       # Cron pattern parser
│   ├── date.ts          # Date handling utilities
│   ├── options.ts       # Configuration options
│   └── helpers/         # Helper utilities
├── test/                # Test files
│   ├── croner.test.ts
│   ├── pattern.test.ts
│   ├── options.test.ts
│   ├── range.test.ts
│   ├── stepping.test.ts
│   └── timezone.test.ts
├── build/               # Build scripts (Node.js, run with tsx)
├── docs/                # Documentation (Lume site, built with Deno)
├── package.json         # npm package, scripts and dev dependencies (source of truth for version)
├── tsconfig.json        # TypeScript configuration used for type checking
└── deno.json            # Deno/JSR configuration and tasks
```

## Standards Compliance

This project aims to follow the **OCPS (Open Cron Pattern Standard)** 1.0 final and subsequent drafts (1.1-1.4) available at [github.com/open-source-cron/ocps](https://github.com/open-source-cron/ocps).

## Development Environment

The project uses **Node.js** (>=18) as the primary development runtime, with cross-runtime support for Deno, Bun and browsers. Deno is still fully supported, and is used for formatting, linting and publishing to JSR.

### Setup
```bash
npm install
```

The test dependencies (`@cross/test`, `@std/assert`) are installed from JSR's npm compatibility registry, configured in `.npmrc`.

## Contribution Guidelines

### Pre-commit Checks

Before committing changes, run:
```bash
npm run pre-commit
```

This executes:
- **Type checking**: `tsc -p tsconfig.json`
- **Tests**: `npm test`

If you have Deno installed, also run the formatting and lint checks (these are enforced in CI):
```bash
deno task pre-commit
```

This executes `deno fmt --check`, `deno lint` and `deno check src/croner.ts`. Use `deno fmt` to fix formatting.

### Testing

Run tests during development:
```bash
npm test
```

CI (`.github/workflows/test.yml`) runs the test suite on Node.js 18/20/22/24/26, Deno and Bun, plus a non-UTC timezone run on Node.js and Deno.

### Deno testing equivalent to CI

- test: `deno task test`

### Bun testing equivalent to CI

- prereq: `bun install`
- test: `bun test`

### Versioning

`package.json` is the source of truth for the version. `deno.json` (used for JSR) must carry the same version:

- `npm version <new-version>` updates both files automatically (via the `version` script).
- If editing manually, run `npx tsx build/build.ts sync-version` afterwards.
- `npm run check-version` fails if the two are out of sync (run in CI and in `npm run build`).

### Full Build

Before submitting a PR, run the full build to ensure all checks pass:
```bash
npm run build
```

This cleans `dist/`, checks versions, type checks, runs all tests, and builds the distribution files (CJS, ESM, UMD and type declarations).

### Key Points

- Base work on the `dev` branch
- Add test cases for all changes
- Zero dependencies - do not add external dependencies
- Follow existing code style and patterns
- Update documentation if changing public APIs

For detailed contribution guidelines, see [docs/src/contributing.md](docs/src/contributing.md).
