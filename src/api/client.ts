import Constants from 'expo-constants';

/**
 * HTTP client for the Cloudflare Worker API.
 *
 * Authentication: every request carries a `Bearer` header containing a fresh
 * Clerk session JWT. Callers obtain the token via `getToken()` from
 * `@clerk/clerk-expo` (typically inside a React hook) and pass it in.
 *
 * Keeping the token-acquisition outside this module avoids coupling pure
 * network code to React hooks, which keeps unit tests cheap.
 */

export interface ApiClientOptions {
  /** Override the API base URL (e.g. for tests pointing at a local Worker). */
  baseUrl?: string;
  /** Optional fetch shim — defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
}

export interface ApiRequestOptions {
  /** Clerk session JWT to attach as `Authorization: Bearer <token>`. */
  token: string;
  /** Abort signal for client-side timeouts. */
  signal?: AbortSignal;
}

function resolveBaseUrl(override?: string): string {
  if (override) return override;
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  const fromExtra = extra.API_BASE_URL as string | undefined;
  const url = fromEnv ?? fromExtra ?? '';
  if (!url) {
    // eslint-disable-next-line no-console
    console.warn(
      '[api] EXPO_PUBLIC_API_BASE_URL not configured. Sync requests will fail until the ' +
        'Cloudflare Worker base URL is provided.',
    );
  }
  return url;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ApiClientOptions = {}) {
    this.baseUrl = resolveBaseUrl(opts.baseUrl);
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  /** POST to the Worker; throws on non-2xx. */
  async post<TRequest, TResponse>(
    path: string,
    body: TRequest,
    opts: ApiRequestOptions,
  ): Promise<TResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.token}`,
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new ApiError(response.status, text || response.statusText);
    }
    return (await response.json()) as TResponse;
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(`API error ${status}: ${message}`);
    this.name = 'ApiError';
  }
}

/** Default singleton client. Tests should construct their own. */
export const apiClient = new ApiClient();
