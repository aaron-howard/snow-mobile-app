# SN Cert Prep — Worker API

Hono on Cloudflare Workers. Hosts the WatermelonDB sync RPCs and verifies Clerk session JWTs before talking to Neon Postgres.

## Architecture

```
Expo client
   │  Bearer <Clerk session JWT>
   ▼
Cloudflare Worker (this package)
   │  Neon serverless HTTP driver
   ▼
Neon Postgres
```

## Setup

1. **Install** — from `workers/`:

   ```bash
   npm install
   ```

2. **Create accounts:**
   - [Clerk](https://dashboard.clerk.com/) — create an application; copy the publishable + secret keys.
   - [Neon](https://console.neon.tech/) — create a project; copy the **pooled** connection string from the dashboard.

3. **Apply the schema:**

   ```bash
   psql "<your DATABASE_URL>" -f sql/schema.sql
   ```

4. **Set local-dev secrets:**

   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with CLERK_SECRET_KEY and DATABASE_URL.
   ```

5. **Run locally:**

   ```bash
   npm run dev
   # Worker exposes http://localhost:8787 — set this as
   # EXPO_PUBLIC_API_BASE_URL in the Expo app's .env to talk to it.
   ```

6. **Deploy:**

   ```bash
   # First-time secret upload (one-off per environment):
   wrangler secret put CLERK_SECRET_KEY
   wrangler secret put DATABASE_URL

   npm run deploy
   ```

## Routes

| Method | Path                  | Auth          | Purpose                                              |
|--------|-----------------------|---------------|------------------------------------------------------|
| `GET`  | `/`                   | public        | Health check + unofficial-status disclaimer          |
| `POST` | `/sync/pull_changes`  | Clerk JWT     | WatermelonDB pull (per-user delta since `lastPulledAt`) |
| `POST` | `/sync/push_changes`  | Clerk JWT     | WatermelonDB push (upsert per-user rows + tombstones)   |

## Status

The routes in [`src/routes/sync.ts`](src/routes/sync.ts) are wired end-to-end but return empty change sets — the per-table SQL is not written yet. That lands when content-side seeding begins. See the comment block at the top of that file for the SQL shape each table will use.
