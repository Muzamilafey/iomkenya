import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import { useApplicationDraft } from '../../../context/ApplicationDraftContext';
import { useSettings } from '../../../context/SettingsContext';
import type { StepProps } from '../types';

export default function Step8Confirmation({ application }: StepProps) {
  const { clear } = useApplicationDraft();
  const { settings } = useSettings();

  return (
    <section className="card text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
        <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="mt-4 text-2xl font-bold text-slate-900">Application submitted</h2>
      <p className="mt-2 text-sm text-slate-600">Thank you. Your payment was received and your application is now with our team.</p>

      <div className="mx-auto mt-6 max-w-sm rounded-lg border-2 border-dashed border-brand-200 bg-brand-50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Your reference number</p>
        <p className="mt-1 select-all text-2xl font-bold tracking-wide text-brand-800">{application.applicationNumber}</p>
        <div className="mt-2">
          <StatusBadge status={application.status} />
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-md text-sm text-slate-600">
        Save this number. You can check your progress at any time using this number and the sponsor’s phone number.
        {settings.contactPhone && ` For questions, call ${settings.contactPhone}.`}
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/status" className="btn-primary">
          Check status
        </Link>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          Print this page
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            if (window.confirm('Start a new, separate application? Make sure you have saved your reference number.')) clear();
          }}
        >
          Start another application
        </button>
      </div>
    </section>
  );
}
