import { useState } from 'react';
import { getErrorMessage } from '../../../api/client';
import WizardStepShell from '../../../components/apply/WizardStepShell';
import FileUploadField from '../../../components/form/FileUploadField';
import SelectField from '../../../components/form/SelectField';
import TextField from '../../../components/form/TextField';
import { useApplicationDraft } from '../../../context/ApplicationDraftContext';
import { useDebouncedAutosave } from '../../../hooks/useDebouncedAutosave';
import { SPONSOR_RELATIONSHIPS } from '../../../utils/constants';
import { formatKenyanPhone, isValidKenyanPhone } from '../../../utils/phone';
import type { StepProps } from '../types';

export default function Step4Sponsor({ application, goTo }: StepProps) {
  const { save, upload, saveState } = useApplicationDraft();
  const [form, setForm] = useState({
    fullName: application.sponsor?.fullName || '',
    relationship: application.sponsor?.relationship || '',
    phone: formatKenyanPhone(application.sponsor?.phone),
    email: application.sponsor?.email || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { flush } = useDebouncedAutosave(form, (v) => save({ sponsor: v }));
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const photo = application.documents.find((d) => d.type === 'SPONSOR_PASSPORT_PHOTO');

  async function next() {
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 3) e.fullName = 'Enter the sponsor’s full name';
    if (!form.relationship) e.relationship = 'Select the relationship';
    if (!isValidKenyanPhone(form.phone)) e.phone = 'Enter a valid Kenyan number, e.g. 0712 345 678';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email or leave blank';
    if (!photo) e.photo = 'Upload the sponsor’s passport photo';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError(null);
    try {
      await flush();
      goTo(5);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WizardStepShell
      title="Sponsor information"
      description="The person supporting this application. Their phone number is used to check application status."
      onBack={() => goTo(3)}
      onNext={next}
      busy={busy}
      error={error || errors.photo}
      saveState={saveState}
    >
      <TextField label="Sponsor full name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} required maxLength={120} />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Relationship to applicant" value={form.relationship} onChange={set('relationship')} options={SPONSOR_RELATIONSHIPS} error={errors.relationship} required />
        <TextField
          label="Sponsor phone number"
          value={form.phone}
          onChange={set('phone')}
          error={errors.phone}
          hint="Kenyan number: 07…, 01… or +254…"
          required
          inputMode="tel"
          autoComplete="tel"
        />
      </div>
      <TextField label="Sponsor email (optional)" type="email" value={form.email} onChange={set('email')} error={errors.email} maxLength={160} />
      <FileUploadField
        label="Sponsor passport photo"
        description="A clear, recent, front-facing photo of the sponsor."
        existing={photo}
        required
        onUpload={(file, onProgress) => upload('SPONSOR_PASSPORT_PHOTO', file, onProgress)}
      />
    </WizardStepShell>
  );
}
