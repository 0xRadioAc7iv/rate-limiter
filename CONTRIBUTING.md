# Contributing to Rate Limiter

Thank you for considering contributing to the Rate Limiter package! Your contributions help improve the project and make it more efficient for everyone. :rocket:

## Getting Started

To get familiar with the project, start by reading the [README](./README.md) file. Here are some helpful resources to get started with contributing to open-source projects:

- [Finding ways to contribute to open source on GitHub](https://docs.github.com/en/get-started/exploring-projects-on-github/finding-ways-to-contribute-to-open-source-on-github)
- [Set up Git](https://docs.github.com/en/get-started/git-basics/set-up-git)
- [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Collaborating with pull requests](https://docs.github.com/en/github/collaborating-with-pull-requests)

## How to Contribute

### Issues

#### Report a Bug or Request a Feature

If you find a bug or want to suggest a feature, please [search the issue tracker](https://github.com/0xRadioAc7iv/rate-limiter/issues) to check if it already exists. If not, create a new issue with the following details:

- **Title**: A short, clear description of the issue.
- **Description**: Provide details about the problem or the feature you’d like to see.
- **Steps to reproduce (if applicable)**: List the steps to reproduce the bug.
- **Expected vs Actual Behavior**: Describe what you expected to happen versus what actually happened.
- **Environment**: Mention the Node.js version and any dependencies involved.

#### Solve an Issue

Browse [open issues](https://github.com/0xRadioAc7iv/rate-limiter/issues) and pick one that interests you. Issues labeled `good first issue` are ideal for beginners.

### Making Changes

#### Fork and Clone the Repository

To make changes locally:

1. **Fork** the repository by clicking the "Fork" button on GitHub.
2. **Clone** your fork:
   ```sh
   git clone https://github.com/0xRadioAc7iv/rate-limiter.git
   cd rate-limiter
   ```
3. Install dependencies:
   ```sh
   npm install
   ```

#### Create a Branch

Create a new branch for your changes:

```sh
git checkout -b feature-or-fix-name
```

#### Make Your Changes

Modify the codebase as needed. Ensure your changes follow best practices and maintain code quality.

### Commit Your Changes

Use descriptive commit messages:

```sh
git commit -m "Fix: Handle edge case in token bucket algorithm"
```

Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format if possible.

### Push and Create a Pull Request (PR)

1. Push your changes to your fork:
   ```sh
   git push origin feature-or-fix-name
   ```
2. Go to the original repository on GitHub and click **New Pull Request**.
3. Fill out the PR template and link it to an issue if applicable.
4. Enable "Allow maintainers to edit" to let reviewers make small fixes.

### Review Process

A maintainer will review your PR and may request changes. Be sure to:

- Address feedback promptly.
- Resolve conversations and mark them as resolved.
- Rebase your branch if needed:
  ```sh
  git fetch origin
  git rebase origin/main
  ```

Once approved, your PR will be merged! 🎉

## Development Guidelines

- Follow best practices for **Node.js** and **TypeScript** (if applicable).
- Keep the code **modular, readable, and well-documented**.
- Use meaningful variable and function names.
- Maintain backward compatibility when possible.
- Avoid unnecessary dependencies.

## Your Contribution is Appreciated! 🎉

Thank you for your time and effort in improving the Rate Limiter package. Every contribution makes a difference!
