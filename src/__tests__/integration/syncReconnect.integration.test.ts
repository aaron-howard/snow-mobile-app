// Integration test (Task 15.4): sync begins within 60s of a stable reconnect.
// Drives the connectivity watcher with a mocked NetInfo + fake timers and a fake
// API client, asserting the WatermelonDB sync protocol fires after the device is
// stably online for ≥5s. Requirements 9.5, 9.6.

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { startSyncWatcher } from '../../db/sync';
import type { ApiClient } from '../../api/client';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
}));

// The native SQLite adapter cannot load under jest; the watcher only needs a
// `database` reference to hand to `synchronize`, which we stub below.
jest.mock('@db/database', () => ({ __esModule: true, database: {} }));

jest.mock('@nozbe/watermelondb/sync', () => ({
  __esModule: true,
  synchronize: jest.fn(
    async ({
      pullChanges,
    }: {
      pullChanges: (args: {
        lastPulledAt: number | null;
        schemaVersion: number;
        migration: null;
      }) => Promise<unknown>;
    }) => {
      await pullChanges({ lastPulledAt: null, schemaVersion: 1, migration: null });
    },
  ),
}));

type StateListener = (state: Partial<NetInfoState>) => void;

describe('integration: connectivity-driven sync', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('triggers a sync after a stable (>=5s) reconnect, within the 60s budget', async () => {
    jest.useFakeTimers();
    const post = jest.fn().mockResolvedValue({ changes: {}, timestamp: 1 });
    const client = { post } as unknown as ApiClient;

    const handle = startSyncWatcher({ getToken: async () => 'jwt-token', client });

    // Capture the watcher's NetInfo listener and report a stable online state.
    const listener = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0] as StateListener;
    listener({ isConnected: true, isInternetReachable: true });

    // 5s confirms stability; up to ~20s more covers the jittered sync trigger.
    await jest.advanceTimersByTimeAsync(5_000);
    await jest.advanceTimersByTimeAsync(20_000);

    expect(post).toHaveBeenCalledWith(
      '/sync/pull_changes',
      expect.anything(),
      expect.objectContaining({ token: 'jwt-token' }),
    );

    handle.unsubscribe();
  });

  test('does not sync if the connection drops before the stable window elapses', async () => {
    jest.useFakeTimers();
    const post = jest.fn().mockResolvedValue({ changes: {}, timestamp: 1 });
    const client = { post } as unknown as ApiClient;

    const handle = startSyncWatcher({ getToken: async () => 'jwt-token', client });
    const listener = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0] as StateListener;

    listener({ isConnected: true, isInternetReachable: true });
    await jest.advanceTimersByTimeAsync(3_000); // not yet stable
    listener({ isConnected: false }); // dropped
    await jest.advanceTimersByTimeAsync(60_000);

    expect(post).not.toHaveBeenCalled();
    handle.unsubscribe();
  });
});
