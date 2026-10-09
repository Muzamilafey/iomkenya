import { useState } from 'react';
import { getErrorMessage } from '../../../api/client';
import WizardStepShell from '../../../components/apply/WizardStepShell';
import DateField from '../../../components/form/DateField';
import FileUploadField from '../../../components/form/FileUploadField';
import SelectField from '../../../components/form/SelectField';
import TextField from '../../../components/form/TextField';
import { useApplicationDraft } from '../../../context/ApplicationDraftContext';
import { useDebouncedAutosave } from '../../../hooks/useDebouncedAutosave';
import { toDateInput } from '../../../utils/format';
import type { StepProps } from '../types';

export default function Step1Applicant({ application, goTo }: StepProps) {
  const { save, upload, saveState } = useApplicationDraft();
  const [form, setForm] = useState({
    fullName: application.applicant?.fullName || '',
    dateOfBirth: toDateInput(application.applicant?.dateOfBirth),
    gender: application.applicant?.gender || '',
    nationality: application.applicant?.nationality || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { flush } = useDebouncedAutosave(form, (v) => save({ applicant: { ...v, dateOfBirth: v.dateOfBirth || null } }));
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const photo = application.documents.find((d) => d.type === 'APPLICANT_PASSPORT_PHOTO');

  async function next() {
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 3) e.fullName = 'Enter the applicant’s full name';
    if (!form.dateOfBirth) e.dateOfBirth = 'Enter the date of birth';
    if (!photo) e.photo = 'Upload a passport photo';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError(null);
    try {
      await flush();
      goTo(2);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WizardStepShell
      title="Applicant information"
      description="Details of the person applying, as they appear on official documents."
      onNext={next}
      busy={busy}
      error={error || errors.photo}
      saveState={saveState}
    >
      <TextField label="Full name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} required autoComplete="name" maxLength={120} />
      <div className="grid gap-5 sm:grid-cols-2">
        <DateField label="Date of birth" value={form.dateOfBirth} onChange={set('dateOfBirth')} error={errors.dateOfBirth} required />
        <SelectField label="Gender" value={form.gender} onChange={set('gender')} options={['Female', 'Male', 'Other']} />
      </div>
      <TextField label="Nationality" value={form.nationality} onChange={set('nationality')} maxLength={60} placeholder="e.g. Somali" />
      <FileUploadField
        label="Applicant passport photo"
        description="A clear, recent, front-facing photo with a plain background."
        existing={photo}
        required
        onUpload={(file, onProgress) => upload('APPLICANT_PASSPORT_PHOTO', file, onProgress)}
      />
    </WizardStepShell>
  );
}
