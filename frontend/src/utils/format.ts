export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const formatKES = (amount?: number | null) =>
  amount === undefined || amount === null ? '—' : `KES ${amount.toLocaleString('en-KE')}`;

/** ISO date string → yyyy-mm-dd for <input type="date"> */
export const toDateInput = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '');
