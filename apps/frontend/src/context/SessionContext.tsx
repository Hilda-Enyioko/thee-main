import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi, orgApi, staffApi, type OrgKind } from '../lib/api';
import { refreshAccessToken, statusOf, errorText } from '../lib/http';
import {
  clearSession, decodeToken, getAccessToken, getRefreshToken, onSessionCleared, setTokens, type Kind,
} from '../lib/session';
import type { OrgMe, OrgRole, StaffRole } from '../lib/types';

// There is no GET /auth/me yet. Until there is, the viewer's own name and role
// come from the team list (org admins) or the staff account list (Super
// Admins), matched on the token's `sub`. A 403 on those lists tells us the
// viewer is an org MEMBER, or a staff member below Super Admin.
export interface Viewer {
  id: string;
  fullName: string | null;
  email: string | null;
  role: OrgRole | StaffRole | null; // null: staff role below SUPER_ADMIN, not knowable yet
}

interface State {
  phase: 'loading' | 'anon' | 'ready';
  kind: Kind | null;
  viewer: Viewer | null;
  org: OrgMe | null;
  suspended: boolean;
  notice: string | null; // shown on the login page after a forced sign-out
}

interface SessionValue extends State {
  waking: boolean;
  login: (kind: Kind, email: string, password: string) => Promise<void>;
  logout: (notice?: string) => void;
  reloadOrg: () => Promise<void>;
  setOrg: (org: OrgMe) => void;
  isAdmin: boolean;
}

const Ctx = createContext<SessionValue | undefined>(undefined);

const initial: State = { phase: 'loading', kind: null, viewer: null, org: null, suspended: false, notice: null };

async function loadViewer(kind: Kind, sub: string): Promise<Pick<State, 'viewer' | 'org' | 'suspended'>> {
  if (kind === 'staff') {
    try {
      const self = (await staffApi.accounts()).find((a) => a.id === sub);
      return { viewer: { id: sub, fullName: self?.fullName ?? null, email: self?.email ?? null, role: self?.role ?? 'SUPER_ADMIN' }, org: null, suspended: false };
    } catch (e) {
      if (statusOf(e) === 403) return { viewer: { id: sub, fullName: null, email: null, role: null }, org: null, suspended: false };
      throw e;
    }
  }
  const [me, team] = await Promise.allSettled([orgApi.me(kind), orgApi.team(kind)]);
  if (me.status === 'rejected') {
    if (statusOf(me.reason) === 403 && /suspended/i.test(errorText(me.reason))) {
      return { viewer: { id: sub, fullName: null, email: null, role: null }, org: null, suspended: true };
    }
    throw me.reason;
  }
  const self = team.status === 'fulfilled' ? team.value.find((m) => m.id === sub) : undefined;
  const role: OrgRole = team.status === 'fulfilled' ? (self?.role ?? 'ADMIN') : 'MEMBER';
  return { viewer: { id: sub, fullName: self?.fullName ?? null, email: self?.email ?? null, role }, org: me.value, suspended: false };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => (getRefreshToken() ? initial : { ...initial, phase: 'anon' }));
  const [waking, setWaking] = useState(false);
  const booted = useRef(false);

  const hydrate = useCallback(async () => {
    const claims = decodeToken(getAccessToken());
    if (!claims) throw new Error('No session');
    const loaded = await loadViewer(claims.kind, claims.sub);
    setState({ phase: 'ready', kind: claims.kind, notice: null, ...loaded });
  }, []);

  // Restore a session after a reload using the stored refresh token.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (!getRefreshToken()) return;
    const slow = window.setTimeout(() => setWaking(true), 4000);
    refreshAccessToken()
      .then(hydrate)
      .catch(() => { clearSession(); setState({ ...initial, phase: 'anon' }); })
      .finally(() => { window.clearTimeout(slow); setWaking(false); });
  }, [hydrate]);

  // The API client clears the session when a refresh fails.
  useEffect(() => onSessionCleared(() => {
    setState((s) => (s.phase === 'anon' ? s : { ...initial, phase: 'anon', notice: 'Your session ended. Please sign in again.' }));
  }), []);

  const login = useCallback(async (kind: Kind, email: string, password: string) => {
    const tokens = await authApi.login(kind, email, password);
    setTokens(tokens.accessToken, tokens.refreshToken);
    try {
      await hydrate();
    } catch (e) {
      clearSession();
      throw e;
    }
  }, [hydrate]);

  const logout = useCallback((notice?: string) => {
    clearSession();
    setState({ ...initial, phase: 'anon', notice: notice ?? null });
  }, []);

  const reloadOrg = useCallback(async () => {
    if (state.kind !== 'provider' && state.kind !== 'distributor') return;
    try {
      const org = await orgApi.me(state.kind);
      setState((s) => ({ ...s, org, suspended: false }));
    } catch (e) {
      if (statusOf(e) === 403 && /suspended/i.test(errorText(e))) setState((s) => ({ ...s, suspended: true }));
      else throw e;
    }
  }, [state.kind]);

  const setOrg = useCallback((org: OrgMe) => setState((s) => ({ ...s, org })), []);

  const value = useMemo<SessionValue>(() => ({
    ...state,
    waking,
    login,
    logout,
    reloadOrg,
    setOrg,
    isAdmin: state.kind === 'staff'
      ? state.viewer?.role === 'SUPER_ADMIN' || state.viewer?.role === 'ADMIN'
      : state.viewer?.role === 'ADMIN',
  }), [state, waking, login, logout, reloadOrg, setOrg]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* eslint-disable-next-line react-refresh/only-export-components */
export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}

/* eslint-disable-next-line react-refresh/only-export-components */
export function useOrgKind(): OrgKind {
  const { kind } = useSession();
  if (kind !== 'provider' && kind !== 'distributor') throw new Error('Not an organisation session');
  return kind;
}
