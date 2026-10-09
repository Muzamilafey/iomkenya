import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../api/client';
import type { Application } from '../../api/types';
import ProgressBar from '../../components/form/ProgressBar';
import { useApplicationDraft } from '../../context/ApplicationDraftContext';
import { useSettings } from '../../context/SettingsContext';
import { WIZARD_STEPS } from '../../utils/constants';
import { formatKES } from '../../utils/format';
import Step1Applicant from './steps/Step1Applicant';
import Step2Family from './steps/Step2Family';
import Step3RefugeeManifest from './steps/Step3RefugeeManifest';
import Step4Sponsor from './steps/Step4Sponsor';
import Step5Documents from './steps/Step5Documents';
import Step6Review from './steps/Step6Review';
import Step7Payment from './steps/Step7Payment';
import Step8Confirmation from './steps/Step8Confirmation';

const STEP_COMPONENTS = [
  Step1Applicant,
  Step2Family,
  Step3RefugeeManifest,
  Step4Sponsor,
  Step5Documents,
  Step6Review,
  Step7Payment,
  Step8Confirmation,
];

/** Which step an application should resume on, based on its server state. */
function resumeStep(app: Application): number {
  if (!['DRAFT', 'AWAITING_PAYMENT'].includes(app.status) || app.paymentStatus === 'PAID') return 8;
  if (app.status === 'AWAITING_PAYMENT') return 7;
  return Math.min(Math.max(app.currentStep || 1, 1), 6);
}

export default function ApplyWizard() {
  const { application, loading, error, start, save, clear } = useApplicationDraft();
  const { settings } = useSettings();
  const [step, setStep] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (application && step === null) setStep(resumeStep(application));
    if (!application) setStep(null);
  }, [application, step]);

  // A paid/submitted application always lands on the confirmation screen.
  useEffect(() => {
    if (application && resumeStep(application) === 8 && step !== null && step !== 8) setStep(8);
  }, [application, step]);

  const goTo = useCallback(
    (next: number) => {
      setStep(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (application && application.status === 'DRAFT' && next <= 6) {
        save({ currentStep: next }).catch(() => {});
      }
    },
    [application, save]
  );

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      const app = await start();
      setStep(resumeStep(app));
    } catch (err) {
      setStartError(getErrorMessage(err, 'Could not start a new application. Please try again.'));
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Loading your application…</div>;
  }

  if (!application || step === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="card">
          <h1 className="text-2xl font-bold text-slate-900">Start your application</h1>
          <p className="mt-2 text-sm text-slate-600">
            The application has {WIZARD_STEPS.length - 2} short sections followed by payment. Your answers are saved
            automatically on this device, so you can close the page and come back later.
          </p>
          <ul className="mt-4 list-inside list-disc text-sm text-slate-600">
            <li>Takes about 10–15 minutes</li>
            <li>Have passport photos of the applicant and sponsor ready (JPG or PNG)</li>
            {settings.applicationFee > 0 && <li>Application fee: {formatKES(settings.applicationFee)} via M-Pesa</li>}
          </ul>
          {(error || startError) && (
            <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{startError || error}</p>
          )}
          <button className="btn-primary mt-6 w-full sm:w-auto" onClick={handleStart} disabled={starting}>
            {starting ? 'Starting…' : 'Start new application'}
          </button>
        </div>
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[step - 1];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-6">
        <ProgressBar steps={WIZARD_STEPS} current={step} />
      </div>
      <StepComponent application={application} goTo={goTo} />
      {step < 8 && (
        <p className="mt-6 text-center text-xs text-slate-400">
          Want to start over?{' '}
          <button
            className="underline hover:text-slate-600"
            onClick={() => {
              if (window.confirm('Discard this application on this device and start again?')) clear();
            }}
          >
            Discard this application
          </button>
        </p>
      )}
    </div>
  );
}
