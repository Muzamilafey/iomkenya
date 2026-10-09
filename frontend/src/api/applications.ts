import { api } from './client';
import type { Application, DocumentType, PublicSettings } from './types';

const draftHeaders = (token: string) => ({ 'X-Draft-Token': token });

export type ApplicationPatch = Partial<
  Pick<Application, 'applicant' | 'familyMembers' | 'refugeeInfo' | 'manifest' | 'sponsor' | 'consent' | 'currentStep'>
>;

export async function createApplication() {
  const { data } = await api.post<{ data: { application: Application; draftToken: string } }>('/applications');
  return data.data;
}

export async function fetchApplication(id: string, token: string) {
  const { data } = await api.get<{ data: { application: Application } }>(`/applications/${id}`, {
    headers: draftHeaders(token),
  });
  return data.data.application;
}

export async function patchApplication(id: string, token: string, patch: ApplicationPatch) {
  const { data } = await api.patch<{ data: { application: Application } }>(`/applications/${id}`, patch, {
    headers: draftHeaders(token),
  });
  return data.data.application;
}

export async function uploadDocument(
  id: string,
  token: string,
  type: DocumentType,
  file: File,
  onProgress?: (pct: number) => void
) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<{ data: { application: Application } }>(`/applications/${id}/documents/${type}`, form, {
    headers: draftHeaders(token),
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data.data.application;
}

export async function reviewApplication(id: string, token: string) {
  const { data } = await api.post<{ data: { application: Application } }>(`/applications/${id}/review`, null, {
    headers: draftHeaders(token),
  });
  return data.data.application;
}

export async function fetchPublicSettings() {
  const { data } = await api.get<{ data: { settings: PublicSettings } }>('/public/settings');
  return data.data.settings;
}

export interface StatusCheckResult {
  applicationNumber: string;
  applicantFirstName: string | null;
  status: Application['status'];
  paymentStatus: Application['paymentStatus'];
  submittedAt?: string;
  lastUpdated: string;
}

export async function checkStatus(applicationNumber: string, phone: string) {
  const { data } = await api.post<{ data: StatusCheckResult }>('/public/status-check', { applicationNumber, phone });
  return data.data;
}
