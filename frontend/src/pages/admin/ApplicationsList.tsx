import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi, type ApplicationListItem } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import type { Pagination } from '../../api/types';
import Pager from '../../components/admin/Pager';
import { PaymentBadge, StatusBadge } from '../../components/admin/StatusBadge';
import { APPLICATION_STATUSES, PAYMENT_LABELS, PAYMENT_STATUSES, STATUS_LABELS } from '../../utils/constants';
import { formatDateTime } from '../../utils/format';
import { formatKenyanPhone } from '../../utils/phone';

const FILTER_KEYS = ['q', 'status', 'paymentStatus', 'from', 'to'] as const;

export default function ApplicationsList() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<ApplicationListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(params.get('q') || '');

  const query = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || undefined]));
  const page = Number(params.get('page') || 1);
  const queryKey = params.toString();

  useEffect(() => {
    setLoading(true);
    adminApi
      .listApplications({ ...query, page })
      .then((d) => {
        setItems(d.items);
        setPagination(d.pagination);
        setError(null);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  // Debounced search box.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') || '') !== q) setParam('q', q);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Applications</h1>

      <div className="card grid gap-3 !p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input className="input lg:col-span-2" placeholder="Search name, sponsor, number or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={params.get('status') || ''} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses (excl. drafts)</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select className="input" value={params.get('paymentStatus') || ''} onChange={(e) => setParam('paymentStatus', e.target.value)}>
          <option value="">Any payment status</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{PAYMENT_LABELS[s]}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input type="date" className="input" aria-label="From date" value={params.get('from') || ''} onChange={(e) => setParam('from', e.target.value)} />
          <input type="date" className="input" aria-label="To date" value={params.get('to') || ''} onChange={(e) => setParam('to', e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Number</th>
                <th className="table-th">Applicant</th>
                <th className="table-th">Sponsor</th>
                <th className="table-th">Family</th>
                <th className="table-th">Status</th>
                <th className="table-th">Payment</th>
                <th className="table-th">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={7} className="table-td text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center text-slate-400">No applications found.</td></tr>
              )}
              {!loading &&
                items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="table-td font-medium">
                      <Link className="text-brand-700 hover:underline" to={`/admin/applications/${a.id}`}>
                        {a.applicationNumber || 'Draft'}
                      </Link>
                    </td>
                    <td className="table-td">{a.applicantName || '—'}</td>
                    <td className="table-td">
                      {a.sponsorName || '—'}
                      {a.sponsorPhone && <span className="block text-xs text-slate-400">{formatKenyanPhone(a.sponsorPhone)}</span>}
                    </td>
                    <td className="table-td">{a.familyCount}</td>
                    <td className="table-td"><StatusBadge status={a.status} /></td>
                    <td className="table-td"><PaymentBadge status={a.paymentStatus} /></td>
                    <td className="table-td">{formatDateTime(a.createdAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pagination && <Pager pagination={pagination} onPage={(p) => setParam('page', String(p))} />}
      </div>
    </div>
  );
}
