# Contributing to Upkick

Thank you for helping improve Upkick.

Upkick is a focused project scaffolding and code-generation CLI. Contributions should make project creation, project-aware generation, validation, or developer experience more reliable without turning Upkick into a general monorepo manager.

## Before you start

For small bug fixes and documentation improvements, you may open a pull request directly.

For new commands, architectural changes, new integrations, or significant behavior changes, open a feature issue first. Wait for the approach to be accepted before investing in a large implementation.

Never include credentials, access tokens, private repository contents, customer data, or personal information in issues, logs, tests, fixtures, or pull requests.

## Development requirements

- Node.js 22 or 24 LTS
- pnpm 10+
- Git

## Fork and clone

1. Fork the repository on GitHub.
2. Clone your fork.
3. Add the upstream repository.
4. Create a focused branch.

```bash
git clone https://github.com/YOUR_USERNAME/cli.git
cd cli
git remote add upstream https://github.com/upclickdev/cli.git
git checkout -b fix/short-description
```

Keep your branch current:

```bash
git fetch upstream
git rebase upstream/main
```

## Install and verify

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All checks must pass before a pull request is ready for review.

## Branch names

Use a short, descriptive prefix:

- `feat/` for a new capability
- `fix/` for a bug fix
- `docs/` for documentation
- `refactor/` for internal restructuring
- `test/` for test-only changes
- `chore/` for maintenance

## Commit messages

Prefer Conventional Commit-style messages:

```text
feat(create): add template ref option
fix(auth): handle expired device authorization
docs(contributing): clarify local test commands
```

Keep commits reviewable. Avoid mixing unrelated refactors with a feature or bug fix.

## Code expectations

- Keep commands small and composable.
- Validate external input at boundaries.
- Preserve deterministic output where possible.
- Prefer explicit errors with actionable remediation.
- Add tests for behavior changes and regressions.
- Avoid introducing a new dependency when the standard library or an existing dependency is sufficient.
- Do not silently send project files or source code to remote services.
- Any cloud-assisted behavior must clearly describe what data is sent and require the appropriate user authorization.

## Pull requests

A pull request should:

- solve one clear problem;
- link to the relevant issue;
- explain the user-visible behavior;
- include tests where appropriate;
- update documentation when behavior changes;
- avoid unrelated formatting or dependency changes.

Maintainers may close a pull request that bypasses prior architectural discussion, duplicates existing work, exposes sensitive data, or substantially expands the project beyond its focused CLI scope.

## Review and merge

Only maintainers merge pull requests. External contributors do not need organization membership or direct repository write access.

The default merge method is squash merge. The pull request title should describe the final change clearly because it becomes the squash commit title.

By contributing, you agree that your contribution is licensed under the repository's license.
