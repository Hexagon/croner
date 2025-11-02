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
├── build/               # Build scripts
├── docs/                # Documentation
└── deno.json            # Deno configuration and tasks
```

## Standards Compliance

This project aims to follow the **OCPS (Open Cron Pattern Standard)** drafts available at [github.com/open-source-cron/ocps](https://github.com/open-source-cron/ocps).

## Development Environment

The project uses **Deno** as the primary development runtime, with cross-runtime support for Node.js and Bun.

### Setup
```bash
# Install Deno dependencies
deno install
```

## Contribution Guidelines

### Pre-commit Checks

Before committing changes, always run:
```bash
deno task pre-commit
```

This executes:
- **Formatting check**: `deno fmt --check` - ensures code follows style guidelines
- **Linting**: `deno lint` - checks for code quality issues
- **Type checking**: `deno check src/croner.ts` - validates TypeScript types

### Testing

Run tests during development:
```bash
deno task test
```

### Full Build

Before submitting a PR, run the full build to ensure all checks pass:
```bash
deno task build
```

This runs all tests, builds distribution files, and validates the entire codebase.

### Key Points

- Base work on the `dev` branch
- Add test cases for all changes
- Zero dependencies - do not add external dependencies
- Follow existing code style and patterns
- Update documentation if changing public APIs

For detailed contribution guidelines, see [docs/src/contributing.md](docs/src/contributing.md).
