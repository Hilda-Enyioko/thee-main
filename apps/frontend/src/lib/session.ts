// Session tokens. The access token lives only in memory. The refresh token and
// the portal kind are kept in localStorage so a page reload can restore the
// session; both are removed on logout. Tokens are never logged.

export type Kind = 'staff' | 'provider' | 'distributor';

const REFRESH_KEY = 'thee.refresh';
const KIND_KEY = 'thee.kind';

let accessToken: string | null = null;
const listeners = new Set<() => void>();

const read = (key: string) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage blocked: the session just won't survive a reload */ }
};

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => read(REFRESH_KEY);

export const getStoredKind = (): Kind | null => {
  const k = read(KIND_KEY);
  return k === 'staff' || k === 'provider' || k === 'distributor' ? k : null;
};

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  write(REFRESH_KEY, refresh);
  const kind = decodeToken(access)?.kind;
  if (kind) write(KIND_KEY, kind);
}

// Clears tokens. The kind is kept so the user lands on the right login page.
export function clearSession() {
  accessToken = null;
  write(REFRESH_KEY, null);
  listeners.forEach((fn) => fn());
}

export function onSessionCleared(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export interface TokenClaims { sub: string; kind: Kind; exp?: number }

export function decodeToken(token: string | null): TokenClaims | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '='))
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const claims = JSON.parse(json) as TokenClaims;
    return claims.sub && claims.kind ? claims : null;
  } catch {
    return null;
  }
}
