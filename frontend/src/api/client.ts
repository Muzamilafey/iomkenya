import axios, { AxiosError } from 'axios';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// Origin serving /uploads/public (the API base without the trailing /api).
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

const ADMIN_TOKEN_KEY = 'hta_admin_token';

export const adminToken = {
  get: () => {
    try {
      return sessionStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string | null) => {
    try {
      if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
      else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 60000,
});

// The httpOnly cookie is primary; the bearer token covers browsers that block
// cross-site cookies.
api.interceptors.request.use((config) => {
  const token = adminToken.get();
  if (token && config.url?.startsWith('/admin')) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  if (token && config.url?.startsWith('/auth')) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

export interface ApiErrorBody {
  success: false;
  message: string;
  details?: { missing?: { step: number; field: string; message: string }[] };
  errors?: { field: string; message: string }[];
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<ApiErrorBody>;
    if (e.response?.data?.message) return e.response.data.message;
    if (e.code === 'ECONNABORTED') return 'The request timed out. Please check your connection.';
    if (!e.response) return 'Could not reach the server. Please check your connection.';
  }
  return fallback;
}

export function getErrorBody(err: unknown): ApiErrorBody | undefined {
  if (axios.isAxiosError(err)) return (err as AxiosError<ApiErrorBody>).response?.data;
  return undefined;
}

export function assetUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}
