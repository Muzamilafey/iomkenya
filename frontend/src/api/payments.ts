import { api } from './client';
import type { PaymentStatusResult } from './types';

export async function initiatePayment(applicationId: string, token: string, phone: string) {
  const { data } = await api.post<{ data: PaymentStatusResult; message?: string }>(
    '/payments/initiate',
    { applicationId, phone },
    { headers: { 'X-Draft-Token': token } }
  );
  return { result: data.data, message: data.message };
}

export async function fetchPaymentStatus(checkoutRequestId: string) {
  const { data } = await api.get<{ data: PaymentStatusResult }>(
    `/payments/status/${encodeURIComponent(checkoutRequestId)}`
  );
  return data.data;
}
