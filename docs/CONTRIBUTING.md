# Contributing to Croner

To get an overview of the project, read the [README](README.md). Here are some resources to help you get started with open source contributions:

-   [Set up Git](https://docs.github.com/en/get-started/quickstart/set-up-git)
-   [GitHub flow](https://docs.github.com/en/get-started/quickstart/github-flow)
-   [Collaborating with pull requests](https://docs.github.com/en/github/collaborating-with-pull-requests)

## Getting started

### Issues

#### Create a new issue

If you spot a problem with Croner, [search if an issue already exists](https://docs.github.com/en/github/searching-for-information-on-github/searching-on-github/searching-issues-and-pull-requests#search-by-the-title-body-or-comments). If a related issue doesn't exist, you can open a new issue using a relevant [issue form](https://github.com/hexagon/croner/issues/new/choose). 

#### Solve an issue

Scan through our [existing issues](https://github.com/hexagon/croner/issues) to find one that interests you. You can narrow down the search using `labels` as filters. If you find an issue to work on, make a note in the comments so er van assign it to you. Then you are welcome to open a PR with a fix.

### Make Changes

#### Setting up the environment

We recommend using VS Code with eslint extensions, which will automatically check your code against the defined rules as you write it.

1.  Fork the repository.
-   Using GitHub Desktop:
  -   [Getting started with GitHub Desktop](https://docs.github.com/en/desktop/installing-and-configuring-github-desktop/getting-started-with-github-desktop) will guide you through setting up Desktop.
  -   Once Desktop is set up, you can use it to [fork the repo](https://docs.github.com/en/desktop/contributing-and-collaborating-using-github-desktop/cloning-and-forking-repositories-from-github-desktop)!
-   Using the command line:
  -   [Fork the repo](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo#fork-an-example-repository) so that you can make your changes without affecting the original project until you're ready to merge them.
2.  Install or update to **Node.js v16**. 
3.  Base your work on the `dev` branch.
4.  Create a working branch ```feature/my-cool-feature``` or ```bugfix/issue-14``` and start with your changes!

### Testing your changes

Make sure you add test cases for your changes. While developing, use ```npm run test``` to run run quick tests against `/src/*`. 

### Commit your update

Please run ```npm run build``` before committing, to update the dist-files, and to make sure every test and check passes. When using this command, both source code, and all generated code will be tested, so it can take a while. 

If you make changes to any function Interface, or to JSDoc in general, you should also run ```npm run build:docs``` to update the generated documentation.

See [package.json](/package.json) scripts section for all available scripts.

Then, commit the changes once you are happy with them. 

### Pull Request

When you're finished with the changes, create a pull request, also known as a PR.
-   Don't forget to [link PR to issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) if you are solving one.
-   Enable the checkbox to [allow maintainer edits](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork) so the branch can be updated for a merge.
Once you submit your PR, a team member will review your proposal. We may ask questions or request for additional information.
-   We may ask for changes to be made before a PR can be merged, either using [suggested changes](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/incorporating-feedback-in-your-pull-request) or pull request comments. You can apply suggested changes directly through the UI. You can make any other changes in your fork, then commit them to your branch.
-   As you update your PR and apply changes, mark each conversation as [resolved](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/commenting-on-a-pull-request#resolving-conversations).
-   If you run into any merge issues, checkout this [git tutorial](https://lab.github.com/githubtraining/managing-merge-conflicts) to help you resolve merge conflicts and other issues.

### Success

This guide is based on [GitHub Docs CONTRIBUTING.md](https://github.com/github/docs/blob/main/CONTRIBUTING.md)
