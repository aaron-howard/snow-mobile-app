# SN Cert Prep (Unofficial)

> **Unofficial. Not affiliated with or endorsed by ServiceNow, Inc.**

Cross-platform mobile study app (iOS + Android) for ServiceNow certification exams. Built with React Native + Expo.

## Project documentation

The authoritative specs live alongside the code:

- [requirements.md](requirements.md) — what the app must do (EARS-format acceptance criteria, 11 requirement areas).
- [design.md](design.md) — how it works (architecture, data models, 27 correctness properties, testing strategy).
- [tasks.md](tasks.md) — implementation plan (16 task groups + dependency graph).
- [content-authoring.md](content-authoring.md) — how exam content is created, reviewed, and published.

## Getting started

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

# 4. Run on a simulator/emulator (requires a dev build — Expo Go won't work
#    because WatermelonDB has native modules).
pnpm run ios       # iOS Simulator
pnpm run android   # Android Emulator
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

In **development**, after you sign in, the app seeds two sample exams (CSA + CAD) into an empty local database so the catalog tab has content to browse. Clear app data or uninstall to re-seed.
