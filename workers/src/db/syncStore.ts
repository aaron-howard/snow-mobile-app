import type { NeonQueryFunction, NeonQueryPromise } from '@neondatabase/serverless';
import {
  TABLE_DATA_COLUMNS,
  type PulledRows,
  type RawRecord,
  type SyncStore,
  type TableChange,
  type TableScope,
} from '../sync/protocol';

/**
 * Neon-backed {@link SyncStore}. All table/column identifiers come from the
 * trusted {@link TABLE_DATA_COLUMNS} allow-list (never user input); only values
 * are bound as `$n` parameters, so the dynamic SQL is injection-safe.
 *
 * Timestamp (`*_at`) columns are stored as BIGINT and cast to double precision
 * on read so the Neon HTTP driver returns JS numbers (it returns int8 as string
 * otherwise), matching what WatermelonDB expects.
 */
export class NeonSyncStore implements SyncStore {
  constructor(private readonly sql: NeonQueryFunction<false, false>) {}

  async pullTable(
    table: string,
    scope: TableScope,
    userId: string,
    lastPulledAt: number,
  ): Promise<PulledRows> {
    const cols = columnsFor(table);
    const projection = [
      'id',
      ...cols.map((c) => (isTimestamp(c) ? `CAST(${c} AS double precision) AS ${c}` : c)),
      'CAST(sync_created_at AS double precision) AS sync_created_at',
      'CAST(sync_deleted_at AS double precision) AS sync_deleted_at',
    ].join(', ');

    let where: string;
    let params: unknown[];
    if (scope === 'content') {
      where = 'sync_updated_at > $1';
      params = [lastPulledAt];
    } else {
      where = `${scopeColumn(scope)} = $2 AND sync_updated_at > $1`;
      params = [lastPulledAt, userId];
    }

    const text = `SELECT ${projection} FROM ${table} WHERE ${where}`;
    const rows = (await this.sql(text, params)) as Record<string, unknown>[];

    const created: RawRecord[] = [];
    const updated: RawRecord[] = [];
    const deleted: string[] = [];
    for (const row of rows) {
      const id = String(row.id);
      if (row.sync_deleted_at != null) {
        deleted.push(id);
        continue;
      }
      const raw: RawRecord = { id };
      for (const c of cols) raw[c] = row[c];
      if (Number(row.sync_created_at) > lastPulledAt) created.push(raw);
      else updated.push(raw);
    }
    return { created, updated, deleted };
  }

  async pushTable(
    table: string,
    userId: string,
    change: TableChange,
    now: number,
  ): Promise<void> {
    const cols = columnsFor(table);
    const scope: TableScope = scopeOf(table);
    const scopeCol = scopeColumn(scope);

    const upserts = [...(change.created ?? []), ...(change.updated ?? [])];
    const statements: NeonQueryPromise<false, false>[] = [];

    for (const row of upserts) {
      // Self table: a user may only write their own row.
      if (scope === 'self' && row.id !== userId) continue;

      const insertCols = ['id', ...cols, 'sync_created_at', 'sync_updated_at'];
      const values: unknown[] = [
        row.id,
        // Force the scoping column to the authenticated user so a client can
        // never plant a row under someone else's id.
        ...cols.map((c) => (c === 'user_id' ? userId : (row[c] ?? null))),
        now,
        now,
      ];
      const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
      const setClause = cols
        .filter((c) => c !== 'user_id')
        .map((c) => `${c} = EXCLUDED.${c}`)
        .concat(['sync_updated_at = EXCLUDED.sync_updated_at', 'sync_deleted_at = NULL'])
        .join(', ');
      const text =
        `INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${placeholders}) ` +
        `ON CONFLICT (id) DO UPDATE SET ${setClause} ` +
        `WHERE ${table}.${scopeCol} = $${insertCols.length + 1}`;
      statements.push(this.sql(text, [...values, userId]));
    }

    for (const id of change.deleted ?? []) {
      const text =
        `UPDATE ${table} SET sync_deleted_at = $1, sync_updated_at = $2 ` +
        `WHERE id = $3 AND ${scopeCol} = $4`;
      statements.push(this.sql(text, [now, now, id, userId]));
    }

    if (statements.length === 0) return;
    // One atomic batch so a partial push never half-applies.
    await this.sql.transaction(statements);
  }
}

function columnsFor(table: string): readonly string[] {
  const cols = TABLE_DATA_COLUMNS[table];
  if (!cols) throw new Error(`Unknown sync table: ${table}`);
  return cols;
}

function scopeOf(table: string): TableScope {
  return table === 'users' ? 'self' : 'user';
}

function scopeColumn(scope: TableScope): string {
  return scope === 'self' ? 'id' : 'user_id';
}

function isTimestamp(column: string): boolean {
  return column.endsWith('_at');
}
