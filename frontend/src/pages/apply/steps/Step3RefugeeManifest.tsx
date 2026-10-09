import { useState } from 'react';
import { getErrorMessage } from '../../../api/client';
import WizardStepShell from '../../../components/apply/WizardStepShell';
import DateField from '../../../components/form/DateField';
import FileUploadField from '../../../components/form/FileUploadField';
import TextField from '../../../components/form/TextField';
import { useApplicationDraft } from '../../../context/ApplicationDraftContext';
import { useSettings } from '../../../context/SettingsContext';
import { useDebouncedAutosave } from '../../../hooks/useDebouncedAutosave';
import { toDateInput } from '../../../utils/format';
import type { StepProps } from '../types';

export default function Step3RefugeeManifest({ application, goTo }: StepProps) {
  const { save, upload, saveState } = useApplicationDraft();
  const { settings } = useSettings();
  const [form, setForm] = useState({
    refugeeId: application.refugeeInfo?.refugeeId || '',
    settlementName: application.refugeeInfo?.settlementName || '',
    arrivalDate: toDateInput(application.refugeeInfo?.arrivalDate),
    hasManifest: settings.manifestRequired || Boolean(application.manifest?.hasManifest),
    manifestNumber: application.manifest?.manifestNumber || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { flush } = useDebouncedAutosave(form, (v) =>
    save({
      refugeeInfo: { refugeeId: v.refugeeId, settlementName: v.settlementName, arrivalDate: v.arrivalDate || null },
      manifest: { hasManifest: v.hasManifest, manifestNumber: v.manifestNumber },
    })
  );
  const set = (k: 'refugeeId' | 'settlementName' | 'arrivalDate' | 'manifestNumber') => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const manifestCard = application.documents.find((d) => d.type === 'MANIFEST_CARD');
  const manifestNeeded = settings.manifestRequired || form.hasManifest;

  async function next() {
    const e: Record<string, string> = {};
    if (!form.refugeeId.trim()) e.refugeeId = 'Enter the refugee ID';
    if (!form.settlementName.trim()) e.settlementName = 'Enter the camp or settlement';
    if (manifestNeeded) {
      if (!form.manifestNumber.trim()) e.manifestNumber = 'Enter the manifest number';
      if (!manifestCard) e.manifestCard = 'Upload a photo of the manifest card';
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError(null);
    try {
      await flush();
      goTo(4);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WizardStepShell
      title="Refugee stay & manifest"
      description="Information about the applicant's refugee registration and stay in Kenya."
      onBack={() => goTo(2)}
      onNext={next}
      busy={busy}
      error={error || errors.manifestCard}
      saveState={saveState}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Refugee ID / proGres number" value={form.refugeeId} onChange={set('refugeeId')} error={errors.refugeeId} required maxLength={60} />
        <TextField label="Camp or settlement" value={form.settlementName} onChange={set('settlementName')} error={errors.settlementName} required placeholder="e.g. Kakuma, Dadaab, Kalobeyei" maxLength={120} />
      </div>
      <DateField label="Date of arrival (approximate)" value={form.arrivalDate} onChange={set('arrivalDate')} />

      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800">Manifest</h3>
        {settings.manifestRequired ? (
          <p className="mt-1 text-xs text-slate-500">A manifest number and manifest card are required for all applications.</p>
        ) : (
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-700"
              checked={form.hasManifest}
              onChange={(e) => setForm((f) => ({ ...f, hasManifest: e.target.checked }))}
            />
            The applicant has a manifest
          </label>
        )}
        {manifestNeeded && (
          <div className="mt-4 space-y-4">
            <TextField label="Manifest number" value={form.manifestNumber} onChange={set('manifestNumber')} error={errors.manifestNumber} required maxLength={60} />
            <FileUploadField
              label="Manifest card"
              description="A clear photo of the manifest card showing all details."
              existing={manifestCard}
              required
              onUpload={(file, onProgress) => upload('MANIFEST_CARD', file, onProgress)}
            />
          </div>
        )}
      </div>
    </WizardStepShell>
  );
}
