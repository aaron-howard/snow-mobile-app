import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Build a Neon HTTP query function from the Worker's DATABASE_URL secret.
 *
 * The Neon HTTP driver is well-suited to Cloudflare Workers: no persistent
 * TCP connection, no socket pool to manage, and cold-starts are fast.
 *
 * Usage:
 *   const sql = getSql(env.DATABASE_URL);
 *   const rows = await sql`SELECT id FROM users WHERE id = ${userId}`;
 */
export function getSql(databaseUrl: string): NeonQueryFunction<false, false> {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured for this Worker');
  }
  return neon(databaseUrl);
}
