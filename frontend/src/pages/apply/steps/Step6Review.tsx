import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getErrorBody, getErrorMessage } from '../../../api/client';
import type { MissingField } from '../../../api/types';
import WizardStepShell from '../../../components/apply/WizardStepShell';
import { useApplicationDraft } from '../../../context/ApplicationDraftContext';
import { useSettings } from '../../../context/SettingsContext';
import { DOCUMENT_LABELS } from '../../../utils/constants';
import { formatDate, formatKES } from '../../../utils/format';
import { formatKenyanPhone } from '../../../utils/phone';
import type { StepProps } from '../types';

function Section({ title, step, goTo, children }: { title: string; step: number; goTo: (s: number) => void; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <button type="button" className="text-xs font-medium text-brand-700 hover:underline" onClick={() => goTo(step)}>
          Edit
        </button>
      </div>
      <dl className="grid gap-x-6 gap-y-2 px-4 py-3 text-sm sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function Item({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export default function Step6Review({ application: app, goTo }: StepProps) {
  const { save, review } = useApplicationDraft();
  const { settings } = useSettings();
  const [accuracy, setAccuracy] = useState(Boolean(app.consent?.accuracyConfirmed));
  const [terms, setTerms] = useState(Boolean(app.consent?.termsAccepted));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<MissingField[]>([]);

  const fee = app.applicationFeeAtSubmission ?? settings.applicationFee;

  async function setConsent(next: { accuracyConfirmed: boolean; termsAccepted: boolean }) {
    setAccuracy(next.accuracyConfirmed);
    setTerms(next.termsAccepted);
    save({ consent: next }).catch(() => setError('Could not save your confirmation. Please try again.'));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setMissing([]);
    try {
      await save({ consent: { accuracyConfirmed: accuracy, termsAccepted: terms } });
      await review();
      goTo(7);
    } catch (err) {
      const body = getErrorBody(err);
      if (body?.details?.missing?.length) setMissing(body.details.missing);
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const docs = app.documents.map((d) => DOCUMENT_LABELS[d.type]).join(', ');

  return (
    <WizardStepShell
      title="Review & consent"
      description="Check every detail carefully before continuing to payment."
      onBack={() => goTo(5)}
      onNext={submit}
      nextLabel={`Continue to payment (${formatKES(fee)})`}
      nextDisabled={!accuracy || !terms}
      busy={busy}
      error={error}
    >
      <Section title="Applicant" step={1} goTo={goTo}>
        <Item label="Full name" value={app.applicant?.fullName} />
        <Item label="Date of birth" value={formatDate(app.applicant?.dateOfBirth)} />
        <Item label="Gender" value={app.applicant?.gender} />
        <Item label="Nationality" value={app.applicant?.nationality} />
      </Section>

      <Section title={`Family members (${app.familyMembers.length})`} step={2} goTo={goTo}>
        {app.familyMembers.length === 0 && <Item label="Family" value="None" />}
        {app.familyMembers.map((m, i) => (
          <Item key={m._id || i} label={`${i + 1}. ${m.relationship || '—'}`} value={`${m.fullName} · born ${formatDate(m.dateOfBirth)}`} />
        ))}
      </Section>

      <Section title="Refugee stay & manifest" step={3} goTo={goTo}>
        <Item label="Refugee ID" value={app.refugeeInfo?.refugeeId} />
        <Item label="Camp / settlement" value={app.refugeeInfo?.settlementName} />
        <Item label="Arrival date" value={formatDate(app.refugeeInfo?.arrivalDate)} />
        <Item label="Manifest number" value={app.manifest?.manifestNumber || (app.manifest?.hasManifest ? '' : 'Not applicable')} />
      </Section>

      <Section title="Sponsor" step={4} goTo={goTo}>
        <Item label="Full name" value={app.sponsor?.fullName} />
        <Item label="Relationship" value={app.sponsor?.relationship} />
        <Item label="Phone" value={formatKenyanPhone(app.sponsor?.phone)} />
        <Item label="Email" value={app.sponsor?.email} />
      </Section>

      <Section title="Documents" step={5} goTo={goTo}>
        <Item label="Uploaded" value={docs} />
      </Section>

      {missing.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Please complete the following:</p>
          <ul className="mt-2 space-y-1">
            {missing.map((m) => (
              <li key={m.field}>
                <button type="button" className="text-left underline" onClick={() => goTo(m.step)}>
                  {m.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3 rounded-lg bg-slate-50 p-4">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700"
            checked={accuracy}
            onChange={(e) => setConsent({ accuracyConfirmed: e.target.checked, termsAccepted: terms })}
          />
          I confirm that the information and documents provided are true and accurate, and that I have permission to
          share the details of everyone included in this application.
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700"
            checked={terms}
            onChange={(e) => setConsent({ accuracyConfirmed: accuracy, termsAccepted: e.target.checked })}
          />
          <span>
            I agree to the{' '}
            <Link to="/terms" target="_blank" className="text-brand-700 underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" target="_blank" className="text-brand-700 underline">
              Privacy Policy
            </Link>
            , and understand that {settings.agencyName} is not affiliated with IOM, UNHCR, any embassy or government.
          </span>
        </label>
      </div>
    </WizardStepShell>
  );
}
