import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import type { ApplicationStatus, PaymentStatus } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { CAN_VIEW_APPLICATIONS, CAN_VIEW_PAYMENTS, PAYMENT_LABELS, STATUS_LABELS } from '../../utils/constants';
import { downloadFile } from '../../utils/download';
import { formatKES } from '../../utils/format';

type Summary = Awaited<ReturnType<typeof adminApi.reportSummary>>;

export default function Reports() {
  const { hasRole } = useAuth();
  const canApps = hasRole(CAN_VIEW_APPLICATIONS);
  const canPayments = hasRole(CAN_VIEW_PAYMENTS);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!canApps) return;
    adminApi
      .reportSummary({ from, to })
      .then(setSummary)
      .catch((e) => setError(getErrorMessage(e)));
  }, [from, to, canApps]);

  async function exportCsv(kind: 'applications' | 'payments') {
    setBusy(kind);
    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (kind === 'applications') params.includeDrafts = 'false';
      await downloadFile(`/admin/reports/${kind}.csv`, `${kind}-${new Date().toISOString().slice(0, 10)}.csv`, params);
    } catch (e) {
      setError(getErrorMessage(e, 'Export failed'));
    } finally {
      setBusy(null);
    }
  }

  const maxDay = Math.max(1, ...(summary?.submissionsPerDay.map((d) => d.count) || [1]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>

      <div className="card flex flex-col gap-3 !p-4 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="label">From</span>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex-1">
          <span className="label">To</span>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <div className="flex gap-2">
          {canApps && (
            <button className="btn-primary" onClick={() => exportCsv('applications')} disabled={busy !== null}>
              {busy === 'applications' ? 'Exporting…' : 'Applications CSV'}
            </button>
          )}
          {canPayments && (
            <button className="btn-primary" onClick={() => exportCsv('payments')} disabled={busy !== null}>
              {busy === 'payments' ? 'Exporting…' : 'Payments CSV'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!canApps && <p className="text-sm text-slate-500">Use the export above to download payment records for the selected period.</p>}

      {summary && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card">
            <h2 className="mb-3 font-semibold text-slate-900">Applications by status</h2>
            <ul className="divide-y divide-slate-100 text-sm">
              {Object.entries(summary.applicationsByStatus).map(([s, n]) => (
                <li key={s} className="flex justify-between py-2">
                  <span>{STATUS_LABELS[s as ApplicationStatus] || s}</span>
                  <span className="font-semibold">{n}</span>
                </li>
              ))}
              {Object.keys(summary.applicationsByStatus).length === 0 && <li className="py-2 text-slate-400">No data</li>}
            </ul>
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold text-slate-900">Payments</h2>
            <p className="text-sm text-slate-500">Confirmed revenue</p>
            <p className="text-2xl font-bold text-emerald-700">{formatKES(summary.totalRevenue)}</p>
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {Object.entries(summary.paymentsByStatus).map(([s, v]) => (
                <li key={s} className="flex justify-between py-2">
                  <span>{PAYMENT_LABELS[s as PaymentStatus] || s}</span>
                  <span>
                    <span className="font-semibold">{v.count}</span>
                    <span className="ml-2 text-xs text-slate-400">{formatKES(v.amount)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card lg:col-span-2">
            <h2 className="mb-3 font-semibold text-slate-900">Submissions per day (last 30 active days)</h2>
            {summary.submissionsPerDay.length === 0 ? (
              <p className="text-sm text-slate-400">No submissions in this period.</p>
            ) : (
              <ul className="space-y-1.5">
                {summary.submissionsPerDay.map((d) => (
                  <li key={d.date} className="flex items-center gap-3 text-xs">
                    <span className="w-20 shrink-0 text-slate-500">{d.date}</span>
                    <span className="h-3 rounded bg-brand-500" style={{ width: `${(d.count / maxDay) * 100}%`, minWidth: '4px' }} />
                    <span className="font-medium text-slate-700">{d.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
