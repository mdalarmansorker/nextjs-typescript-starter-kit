# Code Quality and CI

## Tools

| Tool       | Config              | Check                  | Fix                     |
| ---------- | ------------------- | ---------------------- | ----------------------- |
| ESLint     | `eslint.config.mjs` | `npm run lint`         | `npm run lint:fix`      |
| Prettier   | `.prettierrc.json`  | `npm run format:check` | `npm run format`        |
| Stylelint  | `.stylelintrc.json` | `npm run stylelint`    | `npm run stylelint:fix` |
| TypeScript | `tsconfig.json`     | `npm run typecheck`    |                         |

Run all of them before pushing:

```bash
npm run lint && npm run format:check && npm run stylelint && npm run typecheck && npm run test:run
```

### ESLint

Built on Next.js's own config (`eslint-config-next`), the same one `create-next-app` uses:

- **`core-web-vitals`**: React, React Hooks (including `exhaustive-deps`), accessibility (`jsx-a11y`) and Next.js rules, with the ones that affect page speed as errors
- **`typescript`**: typescript-eslint's recommended rules
- Import sorting by group (`simple-import-sort`); see [project-structure.md](project-structure.md#imports)
- Unused variables are warnings; prefix with `_` to keep one on purpose
- `eslint-config-prettier` last, so ESLint never fights Prettier over formatting

`react-hooks/exhaustive-deps` warns when an effect uses a value it doesn't list, which is how stale data bugs start. Fix the dependency list rather than disabling the rule; if an effect really must ignore a value, say why in a comment next to an `eslint-disable-next-line`.

### Prettier

Formats every file type it knows (TypeScript, CSS, JSON, Markdown, YAML). `.prettierignore` skips generated files. Settings: single quotes, semicolons, 120-character lines, trailing commas, no parentheses around a single arrow-function parameter.

### Stylelint

Requires logical CSS properties (`margin-inline-start` instead of `margin-left`) so layouts work in right-to-left languages. Applies to CSS files and styles in TS/TSX.

### TypeScript

`strict` mode, plus:

- `noUncheckedIndexedAccess`: `items[0]` has type `Item | undefined`, so a missing element must be handled
- `noFallthroughCasesInSwitch`: a `case` can't fall into the next one by accident

Types belong in `.ts` files: `skipLibCheck` skips every `.d.ts` file, including your own.

`npm run typecheck` runs `next typegen` first, which generates the route types (`PageProps<'/login'>`, typed links) that a fresh checkout doesn't have yet.

## Pre-commit hook

`npm install` sets up a Git pre-commit hook (husky) that runs ESLint, Prettier and Stylelint with `--fix` on the staged files (lint-staged, configured in `package.json`). It only looks at what you're committing, so it takes seconds. Type checking and tests run in CI.

To skip it once, e.g. for a work-in-progress commit: `git commit --no-verify`.

## Node version

`.nvmrc` sets Node 26, which CI uses too. `package.json` requires at least Node 22.18 (`engines`), the first version that runs the TypeScript generator scripts without a build step. With nvm:

```bash
nvm use
```

## CI

`.github/workflows/pr-checks.yml` runs on every pull request and every push to `master`. A new push to a pull request cancels the run still going for the previous commit.

| Check       | Runs                                      | Fails when                                           |
| ----------- | ----------------------------------------- | ---------------------------------------------------- |
| Lint        | `npm run lint`                            | Any ESLint error                                     |
| Format      | `npm run format:check`                    | Any file isn't Prettier-formatted                    |
| Stylelint   | `npm run stylelint`                       | A style uses a physical property (`margin-left`)     |
| Typecheck   | `npm run typecheck`                       | Any type error                                       |
| Unit tests  | `npm run test:coverage`                   | A test fails or coverage drops below the thresholds  |
| Audit       | `npm audit --omit=dev --audit-level=high` | A runtime dependency has a high or critical advisory |
| Build & E2E | `npm run build`, then `npm run test:e2e`  | The production build or an e2e test fails            |

Actions are pinned to commit SHAs with the version in a comment (`actions/checkout@3d3c… # v7.0.1`): a tag can be moved to different code, a commit can't. Dependabot updates both.

Every check reports on its own, even when another fails. Make them required for merging in the repository's branch protection settings.

## Dependency updates

`.github/dependabot.yml` opens pull requests:

- **npm**, weekly: all minor and patch updates in one pull request, each major update in its own
- **GitHub Actions**, monthly

CI runs on each one, so a passing update can usually be merged as is. Read the changelog before merging a major update.
