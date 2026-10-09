import type { ReactNode } from 'react';
import type { SaveState } from '../../context/ApplicationDraftContext';

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
  error?: string | null;
  saveState?: SaveState;
}

const SAVE_TEXT: Record<SaveState, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'All changes saved',
  error: 'Could not save — check your connection',
};

export default function WizardStepShell({
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = 'Save & continue',
  nextDisabled,
  busy,
  error,
  saveState = 'idle',
}: Props) {
  return (
    <section className="card">
      <header className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        <span className={`text-xs ${saveState === 'error' ? 'text-red-600' : 'text-slate-400'}`} aria-live="polite">
          {SAVE_TEXT[saveState]}
        </span>
      </header>

      <div className="space-y-5">{children}</div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {(onBack || onNext) && (
        <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
          {onBack ? (
            <button type="button" className="btn-secondary" onClick={onBack} disabled={busy}>
              ← Back
            </button>
          ) : (
            <span />
          )}
          {onNext && (
            <button type="button" className="btn-primary" onClick={onNext} disabled={busy || nextDisabled}>
              {busy ? 'Please wait…' : nextLabel}
            </button>
          )}
        </footer>
      )}
    </section>
  );
}
