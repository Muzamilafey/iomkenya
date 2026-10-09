import { useState, type FormEvent } from 'react';
import { checkStatus, type StatusCheckResult } from '../../api/applications';
import { getErrorMessage } from '../../api/client';
import { PaymentBadge, StatusBadge } from '../../components/admin/StatusBadge';
import TextField from '../../components/form/TextField';
import { isValidKenyanPhone } from '../../utils/phone';
import { formatDateTime } from '../../utils/format';

const STATUS_HELP: Record<string, string> = {
  DRAFT: 'Your application has not been submitted yet. Continue it from the Apply page on the device you started on.',
  AWAITING_PAYMENT: 'Your application is complete but payment has not been confirmed yet.',
  SUBMITTED: 'We have received your application and payment. It will be reviewed shortly.',
  UNDER_REVIEW: 'Our team is reviewing your application.',
  ADDITIONAL_INFO_REQUIRED: 'We need more information from you. Please contact us.',
  PROCESSING: 'Your application is being processed.',
  APPROVED: 'Your application has been approved. We will contact you with next steps.',
  COMPLETED: 'Your application is complete.',
  DECLINED: 'Unfortunately your application was declined. Please contact us for details.',
  CANCELLED: 'This application was cancelled.',
};

export default function StatusChecker() {
  const [applicationNumber, setApplicationNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<StatusCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!isValidKenyanPhone(phone)) {
      setError('Enter the sponsor phone number used on the application, e.g. 0712 345 678.');
      return;
    }
    setLoading(true);
    try {
      setResult(await checkStatus(applicationNumber.trim(), phone));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Check application status</h1>
      <p className="mt-2 text-sm text-slate-600">
        Enter your application number and the sponsor's phone number exactly as provided on the application.
      </p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        <TextField
          label="Application number"
          value={applicationNumber}
          onChange={(v) => setApplicationNumber(v.toUpperCase())}
          placeholder="APP-2026-000001"
          required
          autoComplete="off"
        />
        <TextField
          label="Sponsor phone number"
          value={phone}
          onChange={setPhone}
          placeholder="0712 345 678"
          inputMode="tel"
          required
        />
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading || !applicationNumber || !phone}>
          {loading ? 'Checking…' : 'Check status'}
        </button>
      </form>

      {result && (
        <div className="card mt-6" aria-live="polite">
          <p className="text-sm text-slate-500">Application</p>
          <p className="text-lg font-semibold text-slate-900">{result.applicationNumber}</p>
          {result.applicantFirstName && <p className="text-sm text-slate-600">Applicant: {result.applicantFirstName}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge status={result.status} />
            <PaymentBadge status={result.paymentStatus} />
          </div>
          <p className="mt-4 text-sm text-slate-700">{STATUS_HELP[result.status]}</p>
          <p className="mt-3 text-xs text-slate-400">Last updated {formatDateTime(result.lastUpdated)}</p>
        </div>
      )}
    </div>
  );
}
