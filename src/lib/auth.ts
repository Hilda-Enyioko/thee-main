const ACCESS_KEY = 'theeinsurance_access';
const REFRESH_KEY = 'theeinsurance_refresh';

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

export const refreshAccessToken = async (): Promise<string> => {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('No refresh token');

  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/partners/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  setTokens(data.access, refresh);
  return data.access;
};
