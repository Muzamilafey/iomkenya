import { api } from './client';
import type {
  AdminApplication,
  AdminSettings,
  AdminUser,
  ApplicationStatus,
  Pagination,
  Payment,
  PaymentStatus,
  StatusHistoryEntry,
  AdminNote,
  AdminRole,
} from './types';

export interface DashboardStats {
  totals: {
    applications: number;
    drafts: number;
    awaitingPayment: number;
    submitted: number;
    inReview: number;
    approved: number;
    declined: number;
    today: number;
  };
  statusCounts: Record<string, number>;
  revenue: { total: number; paidCount: number; pendingPayments: number };
  recentApplications: {
    id: string;
    applicationNumber: string;
    applicantName: string;
    status: ApplicationStatus;
    paymentStatus: PaymentStatus | null;
    createdAt: string;
  }[];
}

export interface ApplicationListItem {
  id: string;
  applicationNumber: string | null;
  applicantName?: string;
  sponsorName?: string;
  sponsorPhone?: string;
  familyCount: number;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus | null;
  fee?: number;
  createdAt: string;
  submittedAt?: string;
}

export type ListParams = Record<string, string | number | undefined>;

const clean = (params: ListParams) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));

export const adminApi = {
  async stats() {
    const { data } = await api.get<{ data: DashboardStats }>('/admin/dashboard/stats');
    return data.data;
  },
  async listApplications(params: ListParams) {
    const { data } = await api.get<{ data: { items: ApplicationListItem[]; pagination: Pagination } }>(
      '/admin/applications',
      { params: clean(params) }
    );
    return data.data;
  },
  async getApplication(id: string) {
    const { data } = await api.get<{
      data: { application: AdminApplication; history: StatusHistoryEntry[]; payments: Payment[] };
    }>(`/admin/applications/${id}`);
    return data.data;
  },
  async updateStatus(id: string, status: ApplicationStatus, note?: string) {
    const { data } = await api.patch<{ data: { status: ApplicationStatus; history: StatusHistoryEntry[] } }>(
      `/admin/applications/${id}/status`,
      { status, note }
    );
    return data.data;
  },
  async addNote(id: string, note: string) {
    const { data } = await api.post<{ data: { adminNotes: AdminNote[] } }>(`/admin/applications/${id}/notes`, { note });
    return data.data.adminNotes;
  },
  async listPayments(params: ListParams) {
    const { data } = await api.get<{ data: { items: Payment[]; pagination: Pagination } }>('/admin/payments', {
      params: clean(params),
    });
    return data.data;
  },
  async reportSummary(params: ListParams) {
    const { data } = await api.get<{
      data: {
        applicationsByStatus: Record<string, number>;
        paymentsByStatus: Record<string, { count: number; amount: number }>;
        totalRevenue: number;
        submissionsPerDay: { date: string; count: number }[];
      };
    }>('/admin/reports/summary', { params: clean(params) });
    return data.data;
  },
  async getSettings() {
    const { data } = await api.get<{ data: { settings: AdminSettings } }>('/admin/settings');
    return data.data.settings;
  },
  async updateSettings(patch: Partial<AdminSettings>) {
    const { data } = await api.patch<{ data: { settings: AdminSettings } }>('/admin/settings', patch);
    return data.data.settings;
  },
  async uploadLogo(file: File) {
    const form = new FormData();
    form.append('logo', file);
    const { data } = await api.post<{ data: { settings: AdminSettings } }>('/admin/settings/logo', form);
    return data.data.settings;
  },
  async removeLogo() {
    const { data } = await api.delete<{ data: { settings: AdminSettings } }>('/admin/settings/logo');
    return data.data.settings;
  },
  async uploadHeroImages(files: File[]) {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    const { data } = await api.post<{ data: { settings: AdminSettings } }>('/admin/settings/hero-images', form);
    return data.data.settings;
  },
  async deleteHeroImage(url: string) {
    const { data } = await api.delete<{ data: { settings: AdminSettings } }>('/admin/settings/hero-images', {
      data: { url },
    });
    return data.data.settings;
  },
  async listUsers() {
    const { data } = await api.get<{ data: { users: AdminUser[] } }>('/admin/users');
    return data.data.users;
  },
  async createUser(user: { name: string; email: string; password: string; role: AdminRole }) {
    const { data } = await api.post<{ data: { user: AdminUser } }>('/admin/users', user);
    return data.data.user;
  },
  async updateUser(id: string, patch: Partial<{ name: string; role: AdminRole; isActive: boolean; password: string }>) {
    const { data } = await api.patch<{ data: { user: AdminUser } }>(`/admin/users/${id}`, patch);
    return data.data.user;
  },
};
