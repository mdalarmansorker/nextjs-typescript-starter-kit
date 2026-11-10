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

- `typescript-eslint` recommended rules
- React Hooks rules (`react-hooks/exhaustive-deps` is turned off)
- Next.js `recommended` and `core-web-vitals` rules, e.g. using `next/link` for internal links and `next/script` for scripts
- Import sorting by group; see [project-structure.md](project-structure.md#imports)
- Unused variables are warnings; prefix with `_` to keep one on purpose
- `eslint-config-prettier` last, so ESLint never fights Prettier over formatting

### Prettier

Formats every file type it knows (TypeScript, CSS, JSON, Markdown, YAML). `.prettierignore` skips generated files. Settings: single quotes, semicolons, 120-character lines, trailing commas, no parentheses around a single arrow-function parameter.

### Stylelint

Requires logical CSS properties (`margin-inline-start` instead of `margin-left`) so layouts work in right-to-left languages. Applies to CSS files and styles in TS/TSX.

### TypeScript

`strict` mode. Types belong in `.ts` files: `skipLibCheck` skips every `.d.ts` file, including your own.

## Node version

`.nvmrc` sets Node 26, which CI uses too. `package.json` requires at least Node 22.18 (`engines`), the first version that runs the TypeScript generator scripts without a build step. With nvm:

```bash
nvm use
```

## CI

`.github/workflows/pr-checks.yml` runs on every pull request and every push to `master`. A new push to a pull request cancels the run still going for the previous commit.

| Check       | Runs                                     | Fails when                                          |
| ----------- | ---------------------------------------- | --------------------------------------------------- |
| Lint        | `npm run lint`                           | Any ESLint error                                    |
| Format      | `npm run format:check`                   | Any file isn't Prettier-formatted                   |
| Stylelint   | `npm run stylelint`                      | A style uses a physical property (`margin-left`)    |
| Typecheck   | `npm run typecheck`                      | Any type error                                      |
| Unit tests  | `npm run test:coverage`                  | A test fails or coverage drops below the thresholds |
| Build & E2E | `npm run build`, then `npm run test:e2e` | The production build or an e2e test fails           |

Every check reports on its own, even when another fails. Make them required for merging in the repository's branch protection settings.

## Dependency updates

`.github/dependabot.yml` opens pull requests:

- **npm**, weekly: all minor and patch updates in one pull request, each major update in its own
- **GitHub Actions**, monthly

CI runs on each one, so a passing update can usually be merged as is. Read the changelog before merging a major update.
