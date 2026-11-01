# Contributing to Croner

Thanks for your interest in contributing to Croner! The full contribution guide lives on the
documentation site: **[croner.56k.guru/contributing](https://croner.56k.guru/contributing/)**
(source: [`docs/src/contributing.md`](docs/src/contributing.md)).

## Quick start

1. Fork the repository and base your work on the **`dev`** branch.
2. Install Node.js 18 or later and run `npm install`. Optionally install
   [Deno](https://deno.com) v2 or later for formatting and linting.
3. Make your changes and add test cases for them.
4. Run `npm run build` (type checks, tests and build). If you have Deno installed, also run
   `deno task pre-commit` (formatting and linting, enforced in CI).
5. Open a pull request against `dev` and link any related issue.

## Reporting issues

- Bugs and feature requests: [open an issue](https://github.com/Hexagon/croner/issues/new/choose)
  after checking that it hasn't already been reported.
- Security vulnerabilities: do **not** open a public issue, see [SECURITY.md](SECURITY.md).

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are
expected to uphold it.
