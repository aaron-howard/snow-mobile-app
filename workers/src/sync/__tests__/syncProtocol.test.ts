// Worker sync protocol tests (Task 16.5). These exercise the pure protocol
// orchestration (table policy, user scoping, content-table push rejection,
// created/updated/deleted bucketing) against an in-memory fake store that
// faithfully mirrors the Postgres semantics of NeonSyncStore. The live
// Worker → Neon-branch round-trip is the separately-deferred 15.4 piece.

import {
  pullChanges,
  pushChanges,
  TABLE_SCOPES,
  type ChangeSet,
  type PulledRows,
  type RawRecord,
  type SyncStore,
  type TableChange,
  type TableScope,
} from '../protocol';

interface StoredRow {
  id: string;
  owner: string; // user_id (user tables) or id (self table); '' for content
  data: Record<string, unknown>;
  syncCreatedAt: number;
  syncUpdatedAt: number;
  syncDeletedAt: number | null;
}

/** In-memory store mirroring NeonSyncStore's scoping + bucketing + tombstones. */
class FakeStore implements SyncStore {
  private readonly tables = new Map<string, Map<string, StoredRow>>();

  private table(name: string): Map<string, StoredRow> {
    let t = this.tables.get(name);
    if (!t) {
      t = new Map();
      this.tables.set(name, t);
    }
    return t;
  }

  /** Seed a server-authored content row (content tables are pull-only). */
  seedContent(table: string, row: RawRecord, at: number): void {
    const { id, ...data } = row;
    this.table(table).set(id, {
      id,
      owner: '',
      data,
      syncCreatedAt: at,
      syncUpdatedAt: at,
      syncDeletedAt: null,
    });
  }

  async pullTable(
    table: string,
    scope: TableScope,
    userId: string,
    lastPulledAt: number,
  ): Promise<PulledRows> {
    const created: RawRecord[] = [];
    const updated: RawRecord[] = [];
    const deleted: string[] = [];
    for (const row of this.table(table).values()) {
      if (scope !== 'content' && row.owner !== userId) continue;
      if (row.syncUpdatedAt <= lastPulledAt) continue;
      if (row.syncDeletedAt != null) {
        deleted.push(row.id);
        continue;
      }
      const raw: RawRecord = { id: row.id, ...row.data };
      if (row.syncCreatedAt > lastPulledAt) created.push(raw);
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
    const scope = TABLE_SCOPES[table];
    const t = this.table(table);
    const ownerOf = (row: RawRecord): string => (scope === 'self' ? row.id : userId);

    for (const row of [...(change.created ?? []), ...(change.updated ?? [])]) {
      if (scope === 'self' && row.id !== userId) continue; // can't write another user's self row
      const existing = t.get(row.id);
      if (existing && existing.owner !== userId && scope !== 'self') continue; // ON CONFLICT scope guard
      const { id, ...data } = row;
      if (scope !== 'self') data.user_id = userId; // force scoping column
      t.set(row.id, {
        id,
        owner: ownerOf(row),
        data,
        syncCreatedAt: existing?.syncCreatedAt ?? now,
        syncUpdatedAt: now,
        syncDeletedAt: null,
      });
    }

    for (const id of change.deleted ?? []) {
      const existing = t.get(id);
      if (!existing) continue;
      if (existing.owner !== userId) continue; // scope guard
      existing.syncDeletedAt = now;
      existing.syncUpdatedAt = now;
    }
  }
}

const USER_A = 'user_a';
const USER_B = 'user_b';

function bookmark(id: string, examId = 'exam-1'): RawRecord {
  return { id, item_type: 'question', item_id: 'q1', exam_id: examId, created_at: 1 };
}

describe('worker sync protocol', () => {
  test('bookmark round-trip: push then pull returns it as created', async () => {
    const store = new FakeStore();
    const changes: ChangeSet = { bookmarks: { created: [bookmark('bm-1')], updated: [], deleted: [] } };

    const push = await pushChanges(store, USER_A, changes, 100);
    expect(push.rejectedTables).toEqual([]);

    const pull = await pullChanges(store, USER_A, 0, 150);
    expect(pull.timestamp).toBe(150);
    expect(pull.changes.bookmarks?.created.map((r) => r.id)).toEqual(['bm-1']);
    // user_id is forced to the authenticated user.
    expect(pull.changes.bookmarks?.created[0]?.user_id).toBe(USER_A);
  });

  test('delete is reported as a tombstone to a later cursor', async () => {
    const store = new FakeStore();
    await pushChanges(store, USER_A, { bookmarks: { created: [bookmark('bm-1')] } }, 100);

    // Delete at t=200.
    await pushChanges(store, USER_A, { bookmarks: { deleted: ['bm-1'] } }, 200);

    const pull = await pullChanges(store, USER_A, 150, 250);
    expect(pull.changes.bookmarks?.deleted).toEqual(['bm-1']);
    expect(pull.changes.bookmarks?.created ?? []).toEqual([]);
    expect(pull.changes.bookmarks?.updated ?? []).toEqual([]);
  });

  test('created vs updated bucketing keys off the server create time', async () => {
    const store = new FakeStore();
    await pushChanges(store, USER_A, { bookmarks: { created: [bookmark('bm-1')] } }, 100);
    // Mutate the same row at t=200.
    await pushChanges(store, USER_A, { bookmarks: { updated: [bookmark('bm-1')] } }, 200);

    // A cursor between create (100) and update (200) sees an *update*, not a create.
    const pull = await pullChanges(store, USER_A, 150, 250);
    expect(pull.changes.bookmarks?.updated.map((r) => r.id)).toEqual(['bm-1']);
    expect(pull.changes.bookmarks?.created ?? []).toEqual([]);
  });

  test('user scoping: a second user cannot see or overwrite another user’s rows', async () => {
    const store = new FakeStore();
    await pushChanges(store, USER_A, { bookmarks: { created: [bookmark('bm-1')] } }, 100);

    // User B sees nothing.
    const pullB = await pullChanges(store, USER_B, 0, 150);
    expect(pullB.changes.bookmarks).toBeUndefined();

    // User B tries to overwrite A's row id — must not affect A's data.
    await pushChanges(
      store,
      USER_B,
      { bookmarks: { updated: [{ ...bookmark('bm-1'), item_id: 'hijacked' }] } },
      200,
    );
    const pullA = await pullChanges(store, USER_A, 0, 250);
    expect(pullA.changes.bookmarks?.created[0]?.item_id).toBe('q1');
    // And B still owns nothing.
    const pullB2 = await pullChanges(store, USER_B, 0, 260);
    expect(pullB2.changes.bookmarks).toBeUndefined();
  });

  test('content-table pushes are rejected, not applied', async () => {
    const store = new FakeStore();
    const result = await pushChanges(
      store,
      USER_A,
      { exams: { created: [{ id: 'exam-x', name: 'Rogue', content_version: 'v9' }] } },
      100,
    );
    expect(result.rejectedTables).toEqual(['exams']);

    const pull = await pullChanges(store, USER_A, 0, 150);
    expect(pull.changes.exams).toBeUndefined();
  });

  test('unknown tables are rejected', async () => {
    const store = new FakeStore();
    const result = await pushChanges(
      store,
      USER_A,
      { not_a_table: { created: [{ id: 'x' }] } },
      100,
    );
    expect(result.rejectedTables).toEqual(['not_a_table']);
  });

  test('content tables pull (pull-only) to any authenticated user', async () => {
    const store = new FakeStore();
    store.seedContent('exams', { id: 'exam-1', name: 'CSA', content_version: 'v1' }, 50);

    const pull = await pullChanges(store, USER_A, 0, 150);
    expect(pull.changes.exams?.created.map((r) => r.id)).toEqual(['exam-1']);
  });

  test('the self (users) row is scoped by id', async () => {
    const store = new FakeStore();
    // User A writes their own row + (maliciously) a row with B's id — only A's lands.
    await pushChanges(
      store,
      USER_A,
      {
        users: {
          created: [
            { id: USER_A, email: 'a@x.com', display_name: 'A' },
            { id: USER_B, email: 'b@x.com', display_name: 'B' },
          ],
        },
      },
      100,
    );

    const pullA = await pullChanges(store, USER_A, 0, 150);
    expect(pullA.changes.users?.created.map((r) => r.id)).toEqual([USER_A]);
    const pullB = await pullChanges(store, USER_B, 0, 160);
    expect(pullB.changes.users).toBeUndefined();
  });

  test('an empty push is a no-op that reports nothing rejected', async () => {
    const store = new FakeStore();
    const result = await pushChanges(store, USER_A, {}, 100);
    expect(result).toEqual({ ok: true, rejectedTables: [] });
  });
});
