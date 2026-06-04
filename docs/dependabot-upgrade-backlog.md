# Dependabot / dependency upgrade backlog

This document tracks **deferred** or **major** dependency upgrades that should not be merged as isolated Dependabot PRs without a dedicated spike. It complements GitHub Dependabot alerts.

---

## Expo SDK 56 alignment (closed Dependabot PRs)

The following were **closed** because they target the **Expo SDK 56** package line while this app is pinned to **Expo SDK 54** (`expo ~54`, `expo-router ~4`, etc.):

| Original PR | Package | Notes |
|-------------|---------|--------|
| [#10](https://github.com/aaron-howard/snow-mobile-app/pull/10) | `expo-status-bar` → 56.x | Revisit inside a full `expo upgrade` to SDK 56. |
| [#14](https://github.com/aaron-howard/snow-mobile-app/pull/14) | `expo-secure-store` → 56.x | Security-sensitive; must move with the whole Expo + Clerk matrix. |
| [#16](https://github.com/aaron-howard/snow-mobile-app/pull/16) | `eslint-config-expo` → 56.x | Lint config must match installed Expo SDK. |

**When ready:** Use [Expo upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) for SDK 55 then 56 (or direct per release notes), run `npx expo-doctor`, rebuild dev clients, and re-open equivalent bumps in one coordinated PR.

---

## Major upgrades (open or future Dependabot PRs)

Treat each as its **own** task: read upstream changelog / migration guide, run CI, manual smoke.

| PR | Area | Risk | Migration / review pointers |
|----|------|------|-----------------------------|
| [#3](https://github.com/aaron-howard/snow-mobile-app/pull/3) | Workers `@clerk/backend` 1 → 3 | High | [Clerk Backend SDK](https://clerk.com/docs); verify `verifyToken` in [`workers/src/middleware/auth.ts`](../workers/src/middleware/auth.ts). |
| [#6](https://github.com/aaron-howard/snow-mobile-app/pull/6) | `@neondatabase/serverless` 0.10 → 1.x | High | [Neon serverless migration](https://github.com/neondatabase/serverless/blob/main/MIGRATION.md); [`workers/src/db/`](../workers/src/db/). |
| [#7](https://github.com/aaron-howard/snow-mobile-app/pull/7) | Workers `typescript` 5 → 6 | Medium | Wrangler + `tsconfig`; stricter types. |
| [#11](https://github.com/aaron-howard/snow-mobile-app/pull/11) | `zustand` 4 → 5 | Medium | [Zustand v5 migration](https://github.com/pmndrs/zustand/releases); grep `zustand` in repo. |
| [#15](https://github.com/aaron-howard/snow-mobile-app/pull/15) | React / `@types/react` | Inspect | Read PR diff; ensure alignment with Expo 54 + RN 0.81 supported React versions. |
| [#17](https://github.com/aaron-howard/snow-mobile-app/pull/17) | `react-native-gesture-handler` 2 → 3 | High | Major native API; coordinate with Expo / RN compatibility matrix. |

---

## Recently merged (reference)

Low-risk and verified PRs were merged from the Dependabot safety plan (parser patch, workers-types, eslint-config-prettier, reanimated 3.19.x, netinfo 12) — see GitHub **Merged** PRs for exact numbers and dates.
