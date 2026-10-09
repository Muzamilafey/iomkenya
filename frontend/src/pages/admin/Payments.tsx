import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import type { Pagination, Payment } from '../../api/types';
import Pager from '../../components/admin/Pager';
import { PaymentBadge } from '../../components/admin/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { CAN_VIEW_APPLICATIONS, PAYMENT_LABELS, PAYMENT_STATUSES } from '../../utils/constants';
import { formatDateTime, formatKES } from '../../utils/format';
import { formatKenyanPhone } from '../../utils/phone';

export default function Payments() {
  const { hasRole } = useAuth();
  const [items, setItems] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    adminApi
      .listPayments({ status, q: search, page })
      .then((d) => {
        setItems(d.items);
        setPagination(d.pagination);
        setError(null);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [status, search, page]);

  const linkApps = hasRole(CAN_VIEW_APPLICATIONS);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
      <div className="card grid gap-3 !p-4 sm:grid-cols-3">
        <input className="input sm:col-span-2" placeholder="Search phone, receipt or checkout ID…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{PAYMENT_LABELS[s]}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Application</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Status</th>
                <th className="table-th">Receipt</th>
                <th className="table-th">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={7} className="table-td text-center text-slate-400">Loading…</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={7} className="table-td text-center text-slate-400">No payments found.</td></tr>}
              {!loading &&
                items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="table-td">{formatDateTime(p.createdAt)}</td>
                    <td className="table-td">
                      {linkApps && p.applicationId ? (
                        <Link className="text-brand-700 hover:underline" to={`/admin/applications/${p.applicationId}`}>
                          {p.applicationNumber || '—'}
                        </Link>
                      ) : (
                        p.applicationNumber || '—'
                      )}
                      {p.applicantName && <span className="block text-xs text-slate-400">{p.applicantName}</span>}
                    </td>
                    <td className="table-td">{formatKenyanPhone(p.phone)}</td>
                    <td className="table-td">{formatKES(p.amount)}</td>
                    <td className="table-td"><PaymentBadge status={p.status} /></td>
                    <td className="table-td font-mono text-xs">{p.mpesaReceiptNumber || '—'}</td>
                    <td className="table-td max-w-[18rem] truncate text-xs" title={p.resultDesc}>
                      {p.resultCode ? `${p.resultCode}: ` : ''}{p.resultDesc || '—'}
                      {p.resultSource && <span className="ml-1 text-slate-400">({p.resultSource.toLowerCase()})</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pagination && <Pager pagination={pagination} onPage={setPage} />}
      </div>
    </div>
  );
}
