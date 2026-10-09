import { api, adminToken } from './client';
import type { AdminUser } from './types';

export async function login(email: string, password: string) {
  const { data } = await api.post<{ data: { admin: AdminUser; token: string } }>('/auth/login', { email, password });
  adminToken.set(data.data.token);
  return data.data.admin;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    adminToken.set(null);
  }
}

export async function fetchMe() {
  const { data } = await api.get<{ data: { admin: AdminUser } }>('/auth/me');
  return data.data.admin;
}
