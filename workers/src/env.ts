/**
 * Bindings & secrets available on every Worker request.
 *
 * `Env` is the type used by Hono's generics. Add new vars here whenever
 * you add them to `wrangler.toml` or as Wrangler secrets.
 */
export interface Env {
  /** Clerk server secret key — for `verifyToken` and any backend API calls. */
  CLERK_SECRET_KEY: string;
  /** Neon Postgres connection string (the pooled HTTP-driver URL). */
  DATABASE_URL: string;
}
