import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import type { AdminApplication, ApplicationStatus, DocumentType, Payment, StatusHistoryEntry } from '../../api/types';
import SecureImage from '../../components/admin/SecureImage';
import { PaymentBadge, StatusBadge } from '../../components/admin/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_SETTABLE_STATUSES, CAN_EDIT_APPLICATIONS, DOCUMENT_LABELS, STATUS_LABELS } from '../../utils/constants';
import { downloadFile } from '../../utils/download';
import { formatDate, formatDateTime, formatKES } from '../../utils/format';
import { formatKenyanPhone } from '../../utils/phone';

function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export default function ApplicationDetail() {
  const { id = '' } = useParams();
  const { hasRole } = useAuth();
  const canEdit = hasRole(CAN_EDIT_APPLICATIONS);

  const [app, setApp] = useState<AdminApplication | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState<ApplicationStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [note, setNote] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(() => {
    adminApi
      .getApplication(id)
      .then((d) => {
        setApp(d.application);
        setHistory(d.history);
        setPayments(d.payments);
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, [id]);

  useEffect(load, [load]);

  async function changeStatus() {
    if (!newStatus) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      const res = await adminApi.updateStatus(id, newStatus, statusNote || undefined);
      setApp((a) => (a ? { ...a, status: res.status } : a));
      setHistory(res.history);
      setNewStatus('');
      setStatusNote('');
    } catch (e) {
      setStatusError(getErrorMessage(e));
    } finally {
      setStatusBusy(false);
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    setNoteBusy(true);
    try {
      const notes = await adminApi.addNote(id, note.trim());
      setApp((a) => (a ? { ...a, adminNotes: notes } : a));
      setNote('');
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setNoteBusy(false);
    }
  }

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      await downloadFile(`/admin/applications/${id}/summary.pdf`, `${app?.applicationNumber || id}-summary.pdf`);
    } catch (e) {
      alert(getErrorMessage(e, 'Could not generate PDF'));
    } finally {
      setPdfBusy(false);
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!app) return <p className="text-sm text-slate-500">Loading…</p>;

  const docTypes: DocumentType[] = ['APPLICANT_PASSPORT_PHOTO', 'SPONSOR_PASSPORT_PHOTO', 'MANIFEST_CARD'];
  const isPaid = app.paymentStatus === 'PAID';
  const statusOptions = ADMIN_SETTABLE_STATUSES.filter((s) => s !== app.status && (isPaid || s === 'CANCELLED'));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/admin/applications" className="text-sm text-brand-700 hover:underline print:hidden">
            ← Applications
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{app.applicationNumber || 'Draft application'}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={app.status} />
            <PaymentBadge status={app.paymentStatus} />
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <button className="btn-secondary" onClick={() => window.print()}>Print</button>
          <button className="btn-primary" onClick={downloadPdf} disabled={pdfBusy}>
            {pdfBusy ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Applicant">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={app.applicant?.fullName} />
              <Field label="Date of birth" value={formatDate(app.applicant?.dateOfBirth)} />
              <Field label="Gender" value={app.applicant?.gender} />
              <Field label="Nationality" value={app.applicant?.nationality} />
            </dl>
          </Panel>

          <Panel title={`Family members (${app.familyMembers.length})`}>
            {app.familyMembers.length === 0 ? (
              <p className="text-sm text-slate-500">None listed.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {app.familyMembers.map((m, i) => (
                  <li key={m._id || i} className="flex justify-between py-2">
                    <span className="font-medium text-slate-800">{m.fullName}</span>
                    <span className="text-slate-500">{m.relationship} · {formatDate(m.dateOfBirth)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Refugee stay & manifest">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Refugee ID" value={app.refugeeInfo?.refugeeId} />
              <Field label="Camp / settlement" value={app.refugeeInfo?.settlementName} />
              <Field label="Arrival date" value={formatDate(app.refugeeInfo?.arrivalDate)} />
              <Field label="Has manifest" value={app.manifest?.hasManifest ? 'Yes' : 'No'} />
              <Field label="Manifest number" value={app.manifest?.manifestNumber} />
            </dl>
          </Panel>

          <Panel title="Sponsor">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={app.sponsor?.fullName} />
              <Field label="Relationship" value={app.sponsor?.relationship} />
              <Field label="Phone" value={formatKenyanPhone(app.sponsor?.phone)} />
              <Field label="Email" value={app.sponsor?.email} />
            </dl>
          </Panel>

          <Panel title="Documents">
            <div className="grid gap-4 sm:grid-cols-3">
              {docTypes.map((t) => {
                const doc = app.documents.find((d) => d.type === t);
                return (
                  <div key={t}>
                    <p className="mb-2 text-xs font-medium text-slate-600">{DOCUMENT_LABELS[t]}</p>
                    {doc ? (
                      <SecureImage
                        src={`/admin/applications/${app.id}/documents/${t}`}
                        alt={DOCUMENT_LABELS[t]}
                        className="h-48 w-full rounded-md border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-slate-200 text-xs text-slate-400">
                        Not uploaded
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Payment attempts">
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payment attempts.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr>
                      <th className="table-th">Date</th>
                      <th className="table-th">Phone</th>
                      <th className="table-th">Amount</th>
                      <th className="table-th">Status</th>
                      <th className="table-th">Receipt</th>
                      <th className="table-th">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p._id}>
                        <td className="table-td">{formatDateTime(p.createdAt)}</td>
                        <td className="table-td">{formatKenyanPhone(p.phone)}</td>
                        <td className="table-td">{formatKES(p.amount)}</td>
                        <td className="table-td"><PaymentBadge status={p.status} /></td>
                        <td className="table-td font-mono text-xs">{p.mpesaReceiptNumber || '—'}</td>
                        <td className="table-td max-w-[16rem] truncate text-xs" title={p.resultDesc}>
                          {p.resultCode ? `${p.resultCode}: ` : ''}{p.resultDesc || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Summary">
            <dl className="space-y-3">
              <Field label="Fee" value={formatKES(app.applicationFeeAtSubmission)} />
              <Field label="Created" value={formatDateTime(app.createdAt)} />
              <Field label="Reviewed by client" value={formatDateTime(app.reviewedAt)} />
              <Field label="Paid" value={formatDateTime(app.paidAt)} />
              <Field label="Consent" value={app.consent?.accuracyConfirmed && app.consent?.termsAccepted ? `Given ${formatDateTime(app.consent.consentedAt)}` : 'Not given'} />
            </dl>
          </Panel>

          {canEdit && (
            <Panel title="Update status">
              {statusOptions.length === 0 ? (
                <p className="text-sm text-slate-500">No status changes available.</p>
              ) : (
                <div className="space-y-3 print:hidden">
                  {!isPaid && <p className="text-xs text-amber-700">Unpaid applications can only be cancelled.</p>}
                  <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}>
                    <option value="">Select new status…</option>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Note (optional, saved in history)"
                    value={statusNote}
                    maxLength={2000}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                  {statusError && <p className="text-xs text-red-600">{statusError}</p>}
                  <button className="btn-primary w-full" onClick={changeStatus} disabled={!newStatus || statusBusy}>
                    {statusBusy ? 'Updating…' : 'Update status'}
                  </button>
                </div>
              )}
            </Panel>
          )}

          <Panel title="Status history">
            <ol className="relative space-y-4 border-l border-slate-200 pl-4">
              {history.map((h) => (
                <li key={h._id}>
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-600" />
                  <p className="text-sm font-medium text-slate-800">
                    {h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} → ` : ''}
                    {STATUS_LABELS[h.toStatus]}
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(h.createdAt)} · {h.changedByName}</p>
                  {h.note && <p className="mt-1 text-xs text-slate-600">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Internal notes">
            <ul className="space-y-3">
              {app.adminNotes.length === 0 && <li className="text-sm text-slate-500">No notes yet.</li>}
              {app.adminNotes.map((n) => (
                <li key={n._id} className="rounded-md bg-slate-50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{n.note}</p>
                  <p className="mt-1 text-xs text-slate-500">{n.authorName} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
            {canEdit && (
              <div className="mt-4 space-y-2 print:hidden">
                <textarea className="input" rows={3} placeholder="Add an internal note…" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
                <button className="btn-secondary w-full" onClick={addNote} disabled={!note.trim() || noteBusy}>
                  {noteBusy ? 'Saving…' : 'Add note'}
                </button>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
