# Contributing

## Setup

```bash
nvm use            # Node version from .nvmrc
npm install        # also installs the Git pre-commit hook
cp .env.example .env.local
npm run dev
```

## Workflow

1. Branch from `master`.
2. Make the change with tests. See [docs/testing.md](docs/testing.md).
3. Update the guide in [docs/](docs/) for anything whose behavior or setup changed, and add a line to [CHANGELOG.md](CHANGELOG.md) under "Unreleased".
4. Open a pull request. The template lists what reviewers look for, and CI runs every check (see [docs/code-quality-and-ci.md](docs/code-quality-and-ci.md)).

## Pre-commit hook

On every commit, [lint-staged](https://github.com/lint-staged/lint-staged) runs ESLint, Prettier and Stylelint with `--fix` on the staged files only, so it takes seconds. If it can't fix something, the commit stops and shows the error.

Type checking and tests are left to CI because they look at the whole project. Run them yourself before pushing:

```bash
npm run typecheck && npm run test:run
```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `type: summary in the imperative`.

| Type       | For                                     |
| ---------- | --------------------------------------- |
| `feat`     | New behavior                            |
| `fix`      | Bug fixes                               |
| `docs`     | Documentation only                      |
| `test`     | Tests only                              |
| `refactor` | Code changes that don't change behavior |
| `chore`    | Tooling, dependencies, CI               |

Example: `fix: keep the redirect path when a session expires on the server`. One change per commit; a summary that needs "and" is usually two commits.
