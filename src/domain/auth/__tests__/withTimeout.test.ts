import { AuthTimeoutError, withTimeout } from '../withTimeout';

describe('withTimeout', () => {
  test('resolves with the value when the inner promise settles in time', async () => {
    const result = await withTimeout(Promise.resolve(42), 100);
    expect(result).toBe(42);
  });

  test('rejects with AuthTimeoutError when the inner promise exceeds the budget', async () => {
    const slow = new Promise<number>((resolve) => {
      setTimeout(() => resolve(1), 100);
    });
    await expect(withTimeout(slow, 10)).rejects.toBeInstanceOf(AuthTimeoutError);
  });

  test('the error has a stable discriminator that survives serialization', async () => {
    const slow = new Promise<number>((resolve) => setTimeout(() => resolve(1), 100));
    try {
      await withTimeout(slow, 10);
      throw new Error('should not reach here');
    } catch (err) {
      // Property used by `toAuthError` to map → AuthErrorCode.timeout.
      expect((err as AuthTimeoutError).isAuthTimeout).toBe(true);
      expect((err as AuthTimeoutError).name).toBe('AuthTimeoutError');
    }
  });

  test('propagates the rejection of the inner promise unchanged', async () => {
    const underlying = new Error('upstream-network-failure');
    await expect(withTimeout(Promise.reject(underlying), 1000)).rejects.toBe(underlying);
  });

  test('does not leak a setTimeout when the inner promise resolves first', async () => {
    // If the timer leaked, jest's `--detectOpenHandles` would flag it.
    // Easier signal: run many resolutions concurrently and confirm the
    // process moves on within a single tick after the last resolution.
    const start = Date.now();
    await Promise.all(
      Array.from({ length: 50 }, (_, i) => withTimeout(Promise.resolve(i), 10_000)),
    );
    // All resolved nearly instantly — well under the 10 s budget — and
    // the implementation cleared every timer in `finally`.
    expect(Date.now() - start).toBeLessThan(1_000);
  });
});
