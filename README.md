# SN Cert Prep (Unofficial)

[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo)](https://expo.dev/)

> **Unofficial. Not affiliated with or endorsed by ServiceNow, Inc.**

Cross-platform mobile study app (iOS + Android) for ServiceNow certification exams. Built with React Native + Expo.

## License, security, and contributing

- [LICENSE](LICENSE) — **Apache License 2.0** (Copyright 2026 City of Dallas).
- [SECURITY.md](SECURITY.md) — how to report vulnerabilities (private GitHub reporting and email).
- [CONTRIBUTING.md](CONTRIBUTING.md) — dev setup, checks before a PR, and **copy-paste text for the GitHub repo Description and topics**.
- [CHANGELOG.md](CHANGELOG.md) — release notes; pair with [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) when you tag versions.
- [docs/security-review-tasks.md](docs/security-review-tasks.md) — security review checklist and SR-xx tracking (supply chain, Worker hardening, open risks).
- [.github/DISCUSSIONS.md](.github/DISCUSSIONS.md) — copy-paste **welcome post body** and category blurbs when you enable GitHub Discussions.
- **Issues:** [Bug report](.github/ISSUE_TEMPLATE/bug_report.yml) and [Feature request](.github/ISSUE_TEMPLATE/feature_request.yml) templates (YAML forms; shown on **New issue**).

## Releases

- Version tags use **`vMAJOR.MINOR.PATCH`** (e.g. `v0.1.0`). Summarize each release in [CHANGELOG.md](CHANGELOG.md), then create a **GitHub Release** from that tag and paste the same notes there.
- Mobile binaries (TestFlight, Google Play internal testing, store builds) are **not** attached to this repository unless you add CI artifacts later.

## Project documentation

The authoritative specs live alongside the code:

- [requirements.md](requirements.md) — what the app must do (EARS-format acceptance criteria, 11 requirement areas).
- [design.md](design.md) — how it works (architecture, data models, 27 correctness properties, testing strategy).
- [tasks.md](tasks.md) — implementation plan (17 checkpoints / task groups + dependency graph).
- [content-authoring.md](content-authoring.md) — how exam content is created, reviewed, and published.
- [docs/local-dev-and-device-testing.md](docs/local-dev-and-device-testing.md) — run Metro + Worker locally and test on a **physical** iPhone or Android device (LAN IP, `adb reverse`, Clerk, troubleshooting).
- [docs/dependabot-upgrade-backlog.md](docs/dependabot-upgrade-backlog.md) — deferred Expo SDK 56 bumps and major dependency upgrade spikes (Clerk, Neon, Zustand, etc.).

First-time setup from a clean clone: install with **pnpm**, copy `.env`, then build the **dev client** (Expo Go is not supported—WatermelonDB uses native modules). For physical devices and the local Worker, use [docs/local-dev-and-device-testing.md](docs/local-dev-and-device-testing.md).

```bash
# 1. Install dependencies (requires Node 20+ and pnpm 9+).
#    Install pnpm globally if you don't have it: `npm install -g pnpm`.
pnpm install

# 2. Copy and fill in env values (Expo reads `EXPO_PUBLIC_*` at bundle time).
cp .env.example .env
# Required for auth and API calls:
#   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — Clerk Dashboard → API Keys (publishable).
#   EXPO_PUBLIC_API_BASE_URL — Worker base URL (e.g. http://localhost:8787 from `pnpm dev` in workers/).
# Clerk Dashboard should also match the security settings documented in tasks.md (session lifetime, lockout, password reset TTL).

# 3. Placeholder app icons live under assets/ so local `expo prebuild` / dev client builds succeed.
#    Replace them with branded artwork before any store release.

# 4. Run on a simulator/emulator or a physical device (requires a dev build — Expo Go won't work
#    because WatermelonDB has native modules). For phones on Wi‑Fi, LAN IP, and Worker binding,
#    see docs/local-dev-and-device-testing.md.
pnpm run ios       # iOS Simulator or connected iPhone
pnpm run android   # Android Emulator or connected device
```

## Useful scripts

| Script | What it does |
|---|---|
| `pnpm test` | Run all Jest tests once. |
| `pnpm run test:watch` | Run Jest in watch mode. |
| `pnpm run test:properties` | Run only fast-check property tests. |
| `pnpm run lint` | ESLint over `.ts` / `.tsx`. |
| `pnpm run format` | Prettier over the repo. |
| `pnpm run typecheck` | `tsc --noEmit`. |

## Package manager

This repo uses **pnpm**. The [.npmrc](.npmrc) at the root sets `node-linker=hoisted` and `public-hoist-pattern[]=*` so the resulting `node_modules` layout is flat enough for Metro and React Native's native-module resolution to work. `strict-peer-dependencies=false` mirrors what `--legacy-peer-deps` does on npm — the RN ecosystem's peer ranges are noisy and strict mode rejects otherwise-valid installs.

## Directory layout

```
app/                  Expo Router routes (file-based)
  (auth)/             login, register, forgot-password
  (tabs)/             home, catalog, progress, profile
  exam/[examId]/      quiz, flashcards, simulator, review
src/
  api/                Cloudflare Worker API client (fetch + Clerk JWT)
  db/                 WatermelonDB schema, models, repositories, sync
  domain/             Auth, enrollment/catalog hooks, pure domain modules
  ui/                 Shared UI (e.g. enrollment limit modal)
  utils/              Cross-cutting helpers
workers/              Hono on Cloudflare Workers — the server-side API and Neon glue
```

## Backend stack

- **Neon** (managed Postgres) — source of truth for synced data.
- **Cloudflare Workers + Hono** — hosts the `pull_changes` / `push_changes` sync RPCs and any future server logic. Source under [workers/](workers/).
- **Clerk** — authentication: email/password, social login, session management.

WatermelonDB syncs with Neon via the Worker; each Worker request carries the user's Clerk session JWT, which the Worker verifies before scoping queries by `user_id`.

**API endpoint trust:** `EXPO_PUBLIC_API_BASE_URL` is embedded at build time. For production, set it only through your trusted CI/EAS secrets so the app cannot be trivially repointed to a hostile origin. The client uses standard TLS (no certificate pinning); risk and optional mitigations are tracked in [docs/security-review-tasks.md](docs/security-review-tasks.md) (SR-06).

**Data at rest on device:** Clerk session material uses the OS keystore via `expo-secure-store`. Local WatermelonDB SQLite and offline exam JSON files are **not** app-level encrypted; treat device loss and backups as an organizational risk decision (see SR-05 in the security review doc).

In **development**, after you sign in, the app seeds two sample exams (CSA + CAD) into an empty local database so the catalog tab has content to browse. Clear app data or uninstall to re-seed.
