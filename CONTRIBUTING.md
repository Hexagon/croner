# Contributing to Croner

Thanks for your interest in contributing to Croner!

## Quick start

1. Fork the repository and base your work on the **`dev`** branch.
2. Install Node.js 18 or later and run `npm install`. Optionally install
   [Deno](https://deno.com) v2 or later for formatting and linting.
3. Make your changes and add test cases for them.
4. Run `npm run build` (type checks, tests and build). If you have Deno installed, also run
   `deno task pre-commit` (formatting and linting, enforced in CI).
5. Open a pull request against `dev` and link any related issue.

## Getting started

To get an overview of the project, read the [README](https://github.com/Hexagon/croner). This guide covers Croner for JavaScript and TypeScript. The other implementations, and the documentation site, are in their own repositories, see [croner.56k.guru/contributing](https://croner.56k.guru/contributing/). Here are some resources to help you get started with open source contributions:

-   [Set up Git](https://docs.github.com/en/get-started/quickstart/set-up-git)
-   [GitHub flow](https://docs.github.com/en/get-started/quickstart/github-flow)
-   [Collaborating with pull requests](https://docs.github.com/en/github/collaborating-with-pull-requests)

If you're looking to support Croner financially, consider checking out our [Sponsorship page](https://croner.56k.guru/sponsors/).

## Issues

### Create a new issue

If you spot a problem with Croner, [search if an issue already exists](https://docs.github.com/en/github/searching-for-information-on-github/searching-on-github/searching-issues-and-pull-requests#search-by-the-title-body-or-comments). If a related issue doesn't exist, you can open a new issue using a relevant [issue form](https://github.com/hexagon/croner/issues/new/choose). 

### Solve an issue

Scan through our [existing issues](https://github.com/hexagon/croner/issues) to find one that interests you. You can narrow down the search using `labels` as filters. If you find an issue to work on, make a note in the comments so we can assign it to you. Then you are welcome to open a PR with a fix.

## Make Changes

### Setting up the environment

Formatting and linting are handled by `deno fmt` and `deno lint`. If you use VS Code, the Deno extension can check and format your code as you write it.

1.  Fork the repository.
-   Using GitHub Desktop:
  -   [Getting started with GitHub Desktop](https://docs.github.com/en/desktop/installing-and-configuring-github-desktop/getting-started-with-github-desktop) will guide you through setting up Desktop.
  -   Once Desktop is set up, you can use it to [fork the repo](https://docs.github.com/en/desktop/contributing-and-collaborating-using-github-desktop/cloning-and-forking-repositories-from-github-desktop)!
-   Using the command line:
  -   [Fork the repo](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo#fork-an-example-repository) so that you can make your changes without affecting the original project until you're ready to merge them.
2.  Install or update to **Node.js v18** or later, and run `npm install`. Optionally install [Deno](https://deno.com) v2 or later for formatting and linting.
3.  Base your work on the `dev` branch.
4.  Create a working branch `feature/my-cool-feature` or `bugfix/issue-14` and start with your changes!

## Testing your changes

Make sure you add test cases for your changes. While developing, use `npm test` to run quick tests against `/src/*`. Deno and Bun are supported as well, using `deno task test` and `bun test`.

## Commit your update

Please run `npm run build` before committing, to build the dist-files, and to make sure every test and check passes.

If you have Deno installed, also run `deno task pre-commit` to check formatting and linting (`deno fmt` fixes formatting). These checks also run in CI.

See [package.json](https://github.com/Hexagon/croner/blob/dev/package.json) scripts section for all available scripts.

## Updating the version

The version number is stored in two files, which must always match: `package.json` (npm) and `deno.json` (JSR). Contributors normally don't need to change it; it is bumped by the maintainer when preparing a release.

-   The easiest way is `npm version <new-version> --no-git-tag-version`, which updates both files.
-   If you edit `package.json` by hand, run `npx tsx build/build.ts sync-version` to copy the version to `deno.json`.
-   `npm run check-version` verifies that the files match. It also runs in CI and as part of `npm run build`.
-   Remember to update version references in `README.md` (the JSR import and the CDN link), `$CRONER_VERSION` in `src/_data.json` in [croner-site](https://github.com/Hexagon/croner-site), and `CHANGELOG.md`.

Then, commit the changes once you are happy with them. 

## Pull Request

When you're finished with the changes, create a pull request, also known as a PR.
-   Don't forget to [link PR to issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) if you are solving one.
-   Enable the checkbox to [allow maintainer edits](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork) so the branch can be updated for a merge.
Once you submit your PR, a team member will review your proposal. We may ask questions or request for additional information.
-   We may ask for changes to be made before a PR can be merged, either using [suggested changes](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/incorporating-feedback-in-your-pull-request) or pull request comments. You can apply suggested changes directly through the UI. You can make any other changes in your fork, then commit them to your branch.
-   As you update your PR and apply changes, mark each conversation as [resolved](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/commenting-on-a-pull-request#resolving-conversations).
-   If you run into any merge issues, checkout this [git tutorial](https://lab.github.com/githubtraining/managing-merge-conflicts) to help you resolve merge conflicts and other issues.

## Success

This guide is based on [GitHub Docs CONTRIBUTING.md](https://github.com/github/docs/blob/main/CONTRIBUTING.md)

## Reporting issues

- Bugs and feature requests: [open an issue](https://github.com/Hexagon/croner/issues/new/choose)
  after checking that it hasn't already been reported.
- Security vulnerabilities: do **not** open a public issue, see [SECURITY.md](SECURITY.md).

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are
expected to uphold it.
