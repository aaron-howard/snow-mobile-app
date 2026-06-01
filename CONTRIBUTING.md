# Contributing to SN Cert Prep

Thanks for your interest in this project.

## Before you start

- Read **[requirements.md](requirements.md)** (what the app must do) and **[design.md](design.md)** (architecture, data model, and testing strategy) so changes stay aligned with the product contract.
- **Unofficial:** this app is not affiliated with or endorsed by ServiceNow, Inc. Do not imply official certification training or endorsement in contributions or marketing copy.

## Development setup

- **Node.js** 20 or newer  
- **pnpm** 9+ (this repo uses pnpm; see [README.md](README.md#package-manager) for why `.npmrc` is configured the way it is)

```bash
pnpm install
cp .env.example .env
# Fill in at least:
#   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
#   EXPO_PUBLIC_API_BASE_URL  (e.g. http://localhost:8787 when running the worker locally)
```

The Expo app targets a **dev client** build (WatermelonDB has native modules; Expo Go is not sufficient). See [README.md](README.md#getting-started) for `pnpm run ios` / `pnpm run android`.

### Worker (API) development

The Cloudflare Worker lives under [`workers/`](workers/). Follow **[workers/README.md](workers/README.md)** for `npm install`, Neon schema, `.dev.vars`, and `npm run dev` / deploy.

## Commands to run before opening a PR

From the repository root:

| Command | Purpose |
|--------|---------|
| `pnpm run typecheck` | TypeScript (`tsc --noEmit`) for the app |
| `pnpm run lint` | ESLint on `.ts` / `.tsx` |
| `pnpm test` | Full Jest suite |

If you change worker TypeScript, also run `pnpm tsc --noEmit` from the [`workers/`](workers/) directory when that package has a separate `tsconfig`.

## Pull requests

- Keep changes focused; match existing style and patterns.
- Reference related issues or tasks when applicable.
- For UI changes, include brief **screenshots** or screen recordings when helpful.
- Do not commit secrets (`.env`, keys, tokens). If you need to document a variable, use `.env.example`.
- When opening a **bug** or **feature** issue, use the repository templates under [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/) (GitHub shows them in the “New issue” flow).

Use the [pull request template](.github/pull_request_template.md) checklist when you open a PR.

## Security

If you believe you have found a **security vulnerability**, follow **[SECURITY.md](SECURITY.md)**. Do not file a public issue for undisclosed vulnerabilities.

## Issue templates (maintainers)

The GitHub form templates under [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/) use the placeholder `OWNER/REPO` in a few URLs. After the repository is public (or before first heavy use), **replace every `OWNER/REPO`** in `bug_report.yml` and `feature_request.yml` with your real GitHub `organization/repository` slug so in-form links resolve.

## License

By contributing, you agree that your contributions are licensed under the **Apache License 2.0** — see [LICENSE](LICENSE).

---

## GitHub repository metadata (copy-paste)

Use these on the GitHub repository **About** box (description, website, topics). They cannot be set from a file in the repo.

**Description (≤350 characters):**

```text
Unofficial Expo + React Native study app for ServiceNow certs (CSA, CAD, CIS-*). Offline-first catalog, WatermelonDB sync to Cloudflare Worker + Neon, Clerk auth. Not affiliated with ServiceNow, Inc.
```

**Suggested topics (tags):**

`expo`, `react-native`, `typescript`, `watermelondb`, `cloudflare-workers`, `hono`, `neon`, `clerk`, `servicenow`
