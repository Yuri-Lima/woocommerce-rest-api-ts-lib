# CodeRabbit free PR reviews

This repository uses **[CodeRabbit](https://coderabbit.ai)** on the **free tier** for automatic AI code reviews on pull requests. Public GitHub repositories are eligible; no paid plan is required for basic PR reviews.

Configuration lives in the repo root: [`.coderabbit.yaml`](../.coderabbit.yaml).

## One-time setup (repo owner)

CodeRabbit needs the GitHub App installed on this repository. Config alone is not enough.

1. Open **[https://app.coderabbit.ai/login](https://app.coderabbit.ai/login)** and sign in with GitHub.
2. **Add repositories** → select **`Yuri-Lima/woocommerce-rest-api-ts-lib`** (or install for all public repos you own).
3. Approve the GitHub App permissions when prompted.
4. Confirm the repo appears under [repository settings](https://app.coderabbit.ai/settings/repositories).

Official quickstart: [CodeRabbit Quickstart](https://docs.coderabbit.ai/getting-started/quickstart).

## What happens on each PR

When the App is installed and a non-draft PR is opened (or updated):

1. CodeRabbit posts a **walkthrough** summary on the PR.
2. It leaves **inline comments** on issues it finds (security, bugs, API risk, etc.).
3. Optional tools (ESLint, ShellCheck, Gitleaks, actionlint, …) add extra signal when relevant.
4. Pushing new commits triggers an **incremental** re-review (with auto-pause after several reviewed commits to avoid noise).

Reviews are **skipped** when:

| Condition | Why |
|-----------|-----|
| Draft PR | `reviews.auto_review.drafts: false` |
| Title contains `WIP`, `DO NOT MERGE`, `[skip review]`, or `[skip cr]` | Title keyword ignore list |
| Author is Dependabot / Renovate / `github-actions[bot]` | Bot noise reduction |
| PR base is not a configured branch pattern | See `base_branches` in YAML |

## Useful PR comments

Anyone with write access (or as allowed by chat settings) can comment:

| Comment | Effect |
|---------|--------|
| `@coderabbitai review` | Request / re-run a full review |
| `@coderabbitai summary` | Refresh the high-level summary (also a PR description placeholder) |
| `@coderabbitai configuration` | Dump the **resolved** config (YAML + sources) |
| `@coderabbitai resolve` | Resolve review threads CodeRabbit opened (when supported) |
| `@coderabbitai generate docstrings` | Finishing touch: docstring PR |
| `@coderabbitai generate unit tests` | Finishing touch: unit-test suggestions / PR |

More commands: [CodeRabbit chat / commands](https://docs.coderabbit.ai/overview/pull-request-review).

## Monorepo review focus

Path-specific guidance in `.coderabbit.yaml` steers the free reviewer toward:

| Path | Focus |
|------|--------|
| `src/**` | Library API, auth, HTTP client, types (`woocommerce-rest-ts-api`) |
| `packages/mcp-server/**` | MCP tools/resources, secrets, agent-facing errors (`woo-mcp-server`) |
| `**/*.{test,spec}.*` | Meaningful tests, nock isolation |
| `ui/**` | XSS / credentials in the demo UI |
| `.github/workflows/**` | Permissions, secrets, dual-publish safety |
| `scripts/**` | Publish scripts and token handling |
| `docs/**` | Accuracy for install/publish/MCP |

Generated and lockfile noise is excluded via `path_filters` (`dist/`, `coverage/`, `node_modules/`, `pnpm-lock.yaml`, images, etc.).

## Free tier notes

- `enable_free_tier: true` keeps free features available for users not on a paid plan.
- Review **profile** is `chill` (fewer nits). Switch to `assertive` in YAML if you want stricter feedback.
- CodeRabbit does **not** replace CI (Jest, typecheck, Snyk, publish workflows). Treat it as an extra review pass.
- Paid plans add org features and higher limits; this repo is configured to work well on the free public-repo path.

## Verify it works

1. Install the GitHub App (steps above).
2. Open a small non-draft PR against `main` (this docs/config PR is a good first run).
3. Within a few minutes you should see:
   - A commit status from CodeRabbit (if `commit_status` is enabled), and
   - A walkthrough comment from **`@coderabbitai`**.
4. If nothing appears, re-check App install on the correct repo and comment `@coderabbitai review`.

## Related docs

- [Publishing dual npm packages](./PUBLISHING.md)
- [Security policy](../SECURITY.md)
- [CodeRabbit configuration reference](https://docs.coderabbit.ai/reference/configuration)
