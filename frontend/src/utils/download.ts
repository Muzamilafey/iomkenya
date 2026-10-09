import { api } from '../api/client';

/** Downloads an authenticated file (CSV/PDF) and triggers a browser save. */
export async function downloadFile(url: string, filename: string, params?: Record<string, string>) {
  const res = await api.get(url, { responseType: 'blob', params });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
