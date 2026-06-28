import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

// Supabase auth via its REST API — no SDK dependency. The session lives in
// chrome.storage.local so it survives the popup closing and is readable from
// anywhere in the extension.

export const SESSION_STORAGE_KEY = 'sb_session';

export type StoredSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  email: string | null;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user?: { email?: string | null } | null;
};

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_PUBLISHABLE_KEY,
  };
}

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as
    | { error_description?: string; msg?: string; error?: string; message?: string }
    | null;
  return (
    data?.error_description ||
    data?.msg ||
    data?.message ||
    data?.error ||
    `Request failed (${res.status})`
  );
}

function toSession(data: TokenResponse): StoredSession {
  const expiresAt =
    data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    email: data.user?.email ?? null,
  };
}

async function saveSession(session: StoredSession): Promise<void> {
  await chrome.storage.local.set({ [SESSION_STORAGE_KEY]: session });
}

export async function getSession(): Promise<StoredSession | null> {
  const result = await chrome.storage.local.get(SESSION_STORAGE_KEY);
  return (result[SESSION_STORAGE_KEY] as StoredSession | undefined) ?? null;
}

export async function logout(): Promise<void> {
  await chrome.storage.local.remove(SESSION_STORAGE_KEY);
}

export async function login(email: string, password: string): Promise<StoredSession> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const session = toSession((await res.json()) as TokenResponse);
  await saveSession(session);
  return session;
}

async function refreshSession(refreshToken: string): Promise<StoredSession | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    await logout();
    return null;
  }
  const session = toSession((await res.json()) as TokenResponse);
  await saveSession(session);
  return session;
}

/** A valid access token, refreshing first if it's expired or about to expire. */
export async function getValidAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at - now > 60) {
    return session.access_token;
  }

  const refreshed = await refreshSession(session.refresh_token);
  return refreshed?.access_token ?? null;
}
