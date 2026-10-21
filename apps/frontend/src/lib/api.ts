import axios from 'axios';
import { getAccessToken, refreshAccessToken, clearTokens } from './auth';

export const api = axios.create({
  // Always use the portal's origin. In development Vite proxies this path; in
  // production Vercel rewrites it to Django. The browser never calls Django's
  // cross-origin URL directly, so CORS is not part of the portal request path.
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        clearTokens();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
