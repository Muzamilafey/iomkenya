import { useState } from 'react';
import { getErrorMessage } from '../../../api/client';
import type { FamilyMember } from '../../../api/types';
import WizardStepShell from '../../../components/apply/WizardStepShell';
import DateField from '../../../components/form/DateField';
import SelectField from '../../../components/form/SelectField';
import TextField from '../../../components/form/TextField';
import { useApplicationDraft } from '../../../context/ApplicationDraftContext';
import { useDebouncedAutosave } from '../../../hooks/useDebouncedAutosave';
import { FAMILY_RELATIONSHIPS } from '../../../utils/constants';
import { toDateInput } from '../../../utils/format';
import type { StepProps } from '../types';

const MAX = 20;
type Row = { key: string; fullName: string; relationship: string; dateOfBirth: string };
let keySeq = 0;
const newKey = () => `m${++keySeq}`;

export default function Step2Family({ application, goTo }: StepProps) {
  const { save, saveState } = useApplicationDraft();
  const [rows, setRows] = useState<Row[]>(() =>
    application.familyMembers.map((m) => ({
      key: newKey(),
      fullName: m.fullName || '',
      relationship: m.relationship || '',
      dateOfBirth: toDateInput(m.dateOfBirth),
    }))
  );
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toPayload = (list: Row[]): FamilyMember[] =>
    list.map((r) => ({ fullName: r.fullName, relationship: r.relationship, dateOfBirth: r.dateOfBirth || null }));

  const { flush } = useDebouncedAutosave(rows, (v) => save({ familyMembers: toPayload(v) }));

  const update = (i: number, k: keyof Omit<Row, 'key'>, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  async function next() {
    const e: Record<number, string> = {};
    rows.forEach((r, i) => {
      if (!r.fullName.trim() || !r.relationship || !r.dateOfBirth) e[i] = 'Complete all fields or remove this member';
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError(null);
    try {
      await flush();
      goTo(3);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WizardStepShell
      title="Family members"
      description="List family members travelling or included with this application. Skip this step if there are none."
      onBack={() => goTo(1)}
      onNext={next}
      nextLabel={rows.length ? 'Save & continue' : 'No family members — continue'}
      busy={busy}
      error={error}
      saveState={saveState}
    >
      {rows.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No family members added.</p>}
      {rows.map((r, i) => (
        <fieldset key={r.key} className="rounded-lg border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <legend className="text-sm font-semibold text-slate-700">Family member {i + 1}</legend>
            <button
              type="button"
              className="text-xs font-medium text-red-600 hover:underline"
              onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField id={`fm-name-${r.key}`} label="Full name" value={r.fullName} onChange={(v) => update(i, 'fullName', v)} required maxLength={120} />
            <SelectField id={`fm-rel-${r.key}`} label="Relationship" value={r.relationship} onChange={(v) => update(i, 'relationship', v)} options={FAMILY_RELATIONSHIPS} required />
            <DateField id={`fm-dob-${r.key}`} label="Date of birth" value={r.dateOfBirth} onChange={(v) => update(i, 'dateOfBirth', v)} required />
          </div>
          {errors[i] && <p className="mt-2 text-xs text-red-600">{errors[i]}</p>}
        </fieldset>
      ))}
      {rows.length < MAX && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setRows((rs) => [...rs, { key: newKey(), fullName: '', relationship: '', dateOfBirth: '' }])}
        >
          + Add family member
        </button>
      )}
    </WizardStepShell>
  );
}
