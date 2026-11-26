import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { clearSession, getAccessToken, getRefreshToken, setTokens } from './session';
import type { TokenPair } from './types';

// The portal always calls its own origin. Vite (dev) and Vercel (prod) proxy
// /api to the backend's /api/v1, so the browser never calls Render directly.
export const http = axios.create({
  baseURL: '/api',
  // The staging server sleeps on the free plan and can take about a minute to
  // wake, so allow a long first request instead of failing early.
  timeout: 90_000,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// One refresh at a time: concurrent 401s all wait on the same call.
let refreshing: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');
      // A bare axios call so this request skips the 401 interceptor.
      const { data } = await axios.post<TokenPair>('/api/auth/refresh', { refreshToken }, { timeout: 90_000 });
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
}

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isAuthCall = config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      let token: string;
      try {
        token = await refreshAccessToken();
      } catch {
        clearSession();
        return Promise.reject(error);
      }
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      return http(config);
    }
    return Promise.reject(error);
  },
);

// ── Errors ──

interface ApiErrorBody { statusCode?: number; message?: string | string[]; error?: string }

export const statusOf = (err: unknown): number | undefined =>
  axios.isAxiosError(err) ? err.response?.status : undefined;

export const isWakeError = (err: unknown) =>
  axios.isAxiosError(err) &&
  (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || [502, 503, 504].includes(err.response?.status ?? 0));

// Turns any API error into text for the user. Validation errors arrive as an
// array of messages; everything else as a single string.
export function errorText(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (isWakeError(err)) return 'The server is not responding. It may still be waking up, so please try again.';
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    const msg = body?.message;
    if (Array.isArray(msg) && msg.length) return msg.map(humanise).join('. ');
    if (typeof msg === 'string' && msg) return humanise(msg);
    if (err.response?.status === 403) return 'You do not have permission to do that.';
    if (err.response?.status === 404) return 'That record could not be found.';
  }
  return fallback;
}

const humanise = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);
