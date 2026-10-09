import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type DashboardStats } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import { PaymentBadge, StatusBadge } from '../../components/admin/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { CAN_VIEW_PAYMENTS } from '../../utils/constants';
import { formatDateTime, formatKES } from '../../utils/format';

function Stat({ label, value, tone = 'text-slate-900' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="card !p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { admin, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.stats().then(setStats).catch((e) => setError(getErrorMessage(e)));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats) return <p className="text-sm text-slate-500">Loading…</p>;

  const t = stats.totals;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {admin?.name.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500">Overview of applications and payments.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Applications" value={t.applications} />
        <Stat label="New today" value={t.today} />
        <Stat label="Awaiting payment" value={t.awaitingPayment} tone="text-amber-700" />
        <Stat label="Submitted (new)" value={t.submitted} tone="text-sky-700" />
        <Stat label="In review / processing" value={t.inReview} tone="text-indigo-700" />
        <Stat label="Approved / completed" value={t.approved} tone="text-emerald-700" />
        <Stat label="Declined" value={t.declined} tone="text-red-700" />
        {hasRole(CAN_VIEW_PAYMENTS) ? (
          <Stat label="Revenue" value={formatKES(stats.revenue.total)} tone="text-emerald-700" />
        ) : (
          <Stat label="Drafts" value={t.drafts} />
        )}
      </div>

      {hasRole(CAN_VIEW_PAYMENTS) && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Paid transactions" value={stats.revenue.paidCount} />
          <Stat label="Pending STK pushes" value={stats.revenue.pendingPayments} />
        </div>
      )}

      {stats.recentApplications.length > 0 && (
        <div className="card !p-0">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent applications</h2>
            <Link to="/admin/applications" className="text-sm text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-th">Number</th>
                  <th className="table-th">Applicant</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Payment</th>
                  <th className="table-th">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentApplications.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="table-td font-medium">
                      <Link className="text-brand-700 hover:underline" to={`/admin/applications/${a.id}`}>
                        {a.applicationNumber || '—'}
                      </Link>
                    </td>
                    <td className="table-td">{a.applicantName || '—'}</td>
                    <td className="table-td"><StatusBadge status={a.status} /></td>
                    <td className="table-td"><PaymentBadge status={a.paymentStatus} /></td>
                    <td className="table-td">{formatDateTime(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
