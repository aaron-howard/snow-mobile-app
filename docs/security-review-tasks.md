# Security review tasks

Structured checklist for the SN Cert Prep stack (Expo client + Cloudflare Worker + Neon). Phases **A** = procedures executed during review, **B** = tracked findings (SR-xx), **C** = policy and hygiene. Update SR statuses as you work.

---

## Phase A — Review procedures

Execute in order; record evidence (date, command output, or PR link) in notes under each line when useful.

- [x] **A.1 Secrets and configuration** — Confirmed no live secrets in tracked files: [`.env.example`](../.env.example) and [`app.json`](../app.json) `extra` use empty placeholders; [`workers/wrangler.toml`](../workers/wrangler.toml) documents secrets via Wrangler only. **Gap closed:** `.dev.vars` added to [`.gitignore`](../.gitignore) (was missing; local Worker secrets could have been committed by mistake).
- [x] **A.2 Authentication and session (code)** — Clerk + SecureStore token cache in [`app/_layout.tsx`](../app/_layout.tsx); auth service and timeouts in [`src/domain/auth/`](../src/domain/auth/). **Dashboard:** session lifetime, lockout, password-reset TTL remain Clerk Dashboard configuration (see design / [tasks.md](../tasks.md)); not verifiable from repo alone — tracked as SR-07.
- [x] **A.3 Authorization / IDOR (sync)** — Worker exposes `/` (health) and `/sync/*` only ([`workers/src/index.ts`](../workers/src/index.ts)). `clerkAuth` sets `userId` from JWT `sub`. [`workers/src/sync/protocol.ts`](../workers/src/sync/protocol.ts) defines `TABLE_SCOPES` and push/pull order; [`workers/src/db/syncStore.ts`](../workers/src/db/syncStore.ts) forces `user_id` to authenticated user on upsert, skips `self` rows where `row.id !== userId`, scopes deletes by `user_id`/`id`. Content tables are pull-only at protocol level; unknown tables rejected on push. **No IDOR found** in reviewed paths; re-verify when new tables or routes are added.
- [x] **A.4 Input validation and abuse** — Sync handlers parse JSON without trusting table names from client for SQL (tables come from server policy). **Risk:** unbounded JSON body size / huge change sets could stress Worker + Neon — mitigated by SR-03 (payload limit middleware).
- [x] **A.5 Transport and client trust** — [`src/api/client.ts`](../src/api/client.ts) uses `EXPO_PUBLIC_API_BASE_URL`; builds can point at arbitrary HTTPS origins — MITM risk relative to device trust store; pinning not implemented. Documented under SR-06 and [README](../README.md) security note.
- [x] **A.6 Local data at rest** — WatermelonDB SQLite ([`src/db/database.ts`](../src/db/database.ts)) and offline exam JSON ([`src/offline/examContentDownload.ts`](../src/offline/examContentDownload.ts)) are unencrypted app storage; risk acceptance or hardening tracked as SR-05.
- [x] **A.7 Logging and PII** — Worker auth middleware previously logged full `Error` objects (could include sensitive details in CF logs). **Mitigated** in SR-04. Client `console.warn`/`error` remain; treat as SR-08 for release hardening if needed.
- [x] **A.8 Dependencies and supply chain** — `pnpm audit` (2026-06-01): initial root 12 issues (7 high, 5 moderate); workers 7 (2 high, 5 moderate). After remediation: **root 5 moderate** (transitive: `@babel/runtime` via WatermelonDB, `ajv` via expo-dev-client, `postcss` via Metro, `uuid` via jest-expo / Clerk); **workers 0**. High-severity items addressed via SR-09/SR-10/SR-11. **Dependabot** enabled ([`.github/dependabot.yml`](../.github/dependabot.yml)). Residual moderates tracked as **SR-12**.
- [x] **A.9 Deep links and notifications** — Scheme `sncertprep` in [`app.json`](../app.json). [`notificationRoute`](../src/domain/notifications/types.ts) maps fixed internal paths from typed `NotificationPayload`; no user-controlled URL navigation from notification data in current code. Re-check if push payloads gain dynamic paths.
- [x] **A.10 Disclosure policy** — [SECURITY.md](../SECURITY.md) updated to remove a specific placeholder org email; SR-01 remains for org-approved contact + SLA text.
- [x] **A.11 CI/CD and release** — No EAS/GitHub Actions deploy workflows in repo yet; note “N/A until pipeline exists” for signing and env injection review.

---

## Phase B — Findings (SR-xx)

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| SR-01 | Low (policy) | SECURITY.md: set org-approved security contact and response SLA | Open |
| SR-02 | Low | Supply chain: Dependabot + recurring `pnpm audit` (root + `workers/`) | **Done** — Dependabot weekly on `/` and `/workers` |
| SR-03 | Medium | Sync API: limit request body size / abuse | **Done** — `syncBodyLimit` middleware (5 MiB), [`workers/src/middleware/syncBodyLimit.ts`](../workers/src/middleware/syncBodyLimit.ts) |
| SR-04 | Low | Worker logs: avoid logging full errors on auth failure | **Done** — log safe `name` + `message` only |
| SR-05 | Low (risk acceptance) | Local SQLite + offline JSON at rest (no encryption) | Open — document threat model / backup sensitivity |
| SR-06 | Low | API base URL trust (no pinning); prefer locked EAS env for prod | Open — README note added; pinning optional future work |
| SR-07 | Medium (config) | Clerk Dashboard: session TTL, lockout, password-reset window vs requirements | Open — verify in Clerk console |
| SR-08 | Low | Strip or gate verbose client logging in production builds | Open |
| SR-09 | High | Transitive `@xmldom/xmldom` via Expo — XML advisories | **Done** — `pnpm.overrides` `>=0.8.13` in root `package.json` |
| SR-10 | High | `@clerk/clerk-expo` advisory GHSA-w24r-5266-9c3c (patched >=2.19.36) | **Done** — bumped to `^2.19.36` |
| SR-11 | Medium (dev) | `workers/`: wrangler → undici / esbuild / ws advisories | **Done** — bumped `wrangler` to `^4` (resolves to 4.x); `pnpm audit` in `workers/` → 0 issues |
| SR-12 | Low–moderate | Residual `pnpm audit` (root): Babel runtime, ajv, postcss, uuid — all transitive / dev-adjacent | Open — track Expo/Clerk/Jest upgrades; overrides risky without upstream testing |

### SR-01 — Disclosure policy (Open)

- **Verify:** Organization has a single approved channel for private vulnerability reports.
- **Done when:** [SECURITY.md](../SECURITY.md) lists that contact (or GitHub private reporting only) and a concrete response expectation (e.g. business days SLA).

### SR-05 — Local data at rest (Open)

- **Risk:** Device backup or filesystem access could expose study progress and mirrored user email/display name.
- **Done when:** Risk documented for stakeholders **or** encryption / exclusion from backup implemented (platform-specific).

### SR-06 — Transport trust (Open)

- **Done when:** Production build process documents how `EXPO_PUBLIC_API_BASE_URL` is set (EAS secrets only); optional: certificate pinning issue filed if required by policy.

### SR-07 — Clerk Dashboard (Open)

- **Done when:** Session lifetime, lockout thresholds, and password-reset TTL match product requirements (see [tasks.md](../tasks.md) auth notes).

### SR-08 — Client logging (Open)

- **Done when:** Release profile avoids logging PII tokens or use a gated logger (e.g. `__DEV__` only).

### SR-12 — Residual root `pnpm audit` (Open)

- **Context:** After Clerk bump and `@xmldom/xmldom` override, `pnpm audit` at repo root still reports **5 moderate** issues, all via transitive chains (`@babel/runtime` ← WatermelonDB; `ajv` ← expo-dev-client; `postcss` ← Metro; `uuid` ← jest-expo / Clerk). None are direct app dependencies.
- **Done when:** Cleared by upstream Expo / Clerk / Jest releases **or** org accepts risk for dev-only paths and documents sign-off.

---

## Phase C — Hygiene and ongoing

- [x] Add `.dev.vars` to `.gitignore` for Worker local secrets.
- [ ] Quarterly: re-run full Phase A after major dependency or auth changes.
- [ ] When adding Worker routes: require auth middleware + explicit `userId` scoping review.

---

## Audit command reference

```bash
# Root app
pnpm audit

# Worker package only
cd workers; pnpm audit
```

Re-run after `pnpm install` / lockfile updates.
