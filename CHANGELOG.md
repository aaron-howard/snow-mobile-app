# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub-facing documentation: `LICENSE` (Apache-2.0), `SECURITY.md`, `CONTRIBUTING.md`, this changelog, and PR template.

### Changed

- (Document user-facing changes here as you ship them.)

## [0.1.0] - 2026-06-01

Initial documented baseline for the SN Cert Prep codebase (unofficial ServiceNow cert study app).

### Highlights

- **Client:** Expo ~54, React Native, Expo Router, TypeScript, WatermelonDB, Clerk auth, offline catalog and content download, high-contrast theme with persisted preference.
- **Server:** Hono on Cloudflare Workers, Neon Postgres, WatermelonDB sync (`pull_changes` / `push_changes`) with Clerk-scoped access.
- **Quality:** Jest + React Native Testing Library, fast-check property tests per `design.md`, ESLint + Prettier.

When this repository has a public default remote, add compare/release links at the bottom of this file (see [Keep a Changelog](https://keepachangelog.com/) examples).
