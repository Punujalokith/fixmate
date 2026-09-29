import { API_URL } from './config';
import { secureStorage } from './storage';
import type { AuthResponse } from './types';

const ACCESS_KEY = 'fixmate.accessToken';
const REFRESH_KEY = 'fixmate.refreshToken';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Tokens are kept in memory for speed and in secure storage so login survives app restarts.
let accessToken: string | null = null;
let refreshToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export const tokens = {
  async load() {
    [accessToken, refreshToken] = await Promise.all([secureStorage.get(ACCESS_KEY), secureStorage.get(REFRESH_KEY)]);
    return Boolean(refreshToken);
  },
  async save(pair: { accessToken: string; refreshToken: string }) {
    accessToken = pair.accessToken;
    refreshToken = pair.refreshToken;
    await Promise.all([secureStorage.set(ACCESS_KEY, pair.accessToken), secureStorage.set(REFRESH_KEY, pair.refreshToken)]);
  },
  async clear() {
    accessToken = null;
    refreshToken = null;
    await Promise.all([secureStorage.remove(ACCESS_KEY), secureStorage.remove(REFRESH_KEY)]);
  },
  get access() {
    return accessToken;
  },
  get refresh() {
    return refreshToken;
  },
  onExpired(callback: () => void) {
    onSessionExpired = callback;
  },
};

// If several requests get 401 at once, refresh only once and let them all wait for it.
let refreshing: Promise<boolean> | null = null;
async function refreshTokens(): Promise<boolean> {
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      await tokens.save((await res.json()) as AuthResponse);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

type Options = { method?: string; body?: unknown; auth?: boolean; form?: FormData };

/** Calls the API. Adds the token, refreshes it once on 401, and turns errors into ApiError. */
export async function api<T>(path: string, { method = 'GET', body, auth = true, form }: Options = {}): Promise<T> {
  const send = () =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(form ? {} : { 'Content-Type': 'application/json' }),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });

  let res: Response;
  try {
    res = await send();
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your internet connection.");
  }

  if (res.status === 401 && auth && refreshToken) {
    if (await refreshTokens()) res = await send();
    else {
      await tokens.clear();
      onSessionExpired?.();
    }
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message[0] : (data?.message ?? 'Something went wrong');
    throw new ApiError(res.status, message);
  }
  return data as T;
}

/** Turns any error into a sentence we can show the user. */
export const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Something went wrong';
