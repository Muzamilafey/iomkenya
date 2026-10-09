import type { DocumentType } from '../../../api/types';
import WizardStepShell from '../../../components/apply/WizardStepShell';
import FileUploadField from '../../../components/form/FileUploadField';
import { useApplicationDraft } from '../../../context/ApplicationDraftContext';
import { useSettings } from '../../../context/SettingsContext';
import { DOCUMENT_LABELS } from '../../../utils/constants';
import type { StepProps } from '../types';

export default function Step5Documents({ application, goTo }: StepProps) {
  const { upload } = useApplicationDraft();
  const { settings } = useSettings();
  const manifestNeeded = settings.manifestRequired || Boolean(application.manifest?.hasManifest);

  const docs: { type: DocumentType; required: boolean; description: string }[] = [
    { type: 'APPLICANT_PASSPORT_PHOTO', required: true, description: 'Front-facing, plain background.' },
    { type: 'SPONSOR_PASSPORT_PHOTO', required: true, description: 'Front-facing, plain background.' },
    {
      type: 'MANIFEST_CARD',
      required: manifestNeeded,
      description: manifestNeeded ? 'Required — all details must be readable.' : 'Optional — upload if available.',
    },
  ];

  const find = (t: DocumentType) => application.documents.find((d) => d.type === t);
  const missing = docs.filter((d) => d.required && !find(d.type));

  return (
    <WizardStepShell
      title="Document uploads"
      description="Check that every required document is uploaded and clearly readable. You can replace any file."
      onBack={() => goTo(4)}
      onNext={() => goTo(6)}
      nextDisabled={missing.length > 0}
      nextLabel="Continue to review"
      error={missing.length ? `Still needed: ${missing.map((d) => DOCUMENT_LABELS[d.type]).join(', ')}` : null}
    >
      {docs.map((d) => (
        <FileUploadField
          key={d.type}
          label={DOCUMENT_LABELS[d.type]}
          description={d.description}
          existing={find(d.type)}
          required={d.required}
          onUpload={(file, onProgress) => upload(d.type, file, onProgress)}
        />
      ))}
    </WizardStepShell>
  );
}
