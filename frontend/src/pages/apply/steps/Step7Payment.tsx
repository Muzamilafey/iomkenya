import { useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../../../api/client';
import { fetchPaymentStatus, initiatePayment } from '../../../api/payments';
import type { PaymentStatusResult } from '../../../api/types';
import WizardStepShell from '../../../components/apply/WizardStepShell';
import TextField from '../../../components/form/TextField';
import { useApplicationDraft } from '../../../context/ApplicationDraftContext';
import { formatKES } from '../../../utils/format';
import { formatKenyanPhone, isValidKenyanPhone } from '../../../utils/phone';
import type { StepProps } from '../types';

const POLL_MS = 4000;
const MAX_POLL_MS = 3 * 60 * 1000;

type Phase = 'idle' | 'sending' | 'waiting' | 'paid' | 'failed';

const FAIL_TEXT: Record<string, string> = {
  CANCELLED: 'The payment was cancelled on the phone.',
  EXPIRED: 'The payment request expired before it was completed.',
  FAILED: 'The payment did not go through.',
};

export default function Step7Payment({ application, goTo }: StepProps) {
  const { token, reload } = useApplicationDraft();
  const [phone, setPhone] = useState(formatKenyanPhone(application.sponsor?.phone));
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentStatusResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const amount = application.applicationFeeAtSubmission;

  function poll(checkoutRequestId: string) {
    timer.current = setTimeout(async () => {
      try {
        const res = await fetchPaymentStatus(checkoutRequestId);
        setPayment(res);
        if (res.status === 'PAID') {
          setPhase('paid');
          await reload();
          goTo(8);
          return;
        }
        if (res.status !== 'PENDING') {
          setPhase('failed');
          setError(`${FAIL_TEXT[res.status] || 'The payment did not go through.'}${res.resultDesc ? ` (${res.resultDesc})` : ''}`);
          return;
        }
      } catch {
        /* transient — keep polling */
      }
      if (Date.now() - startedAt.current > MAX_POLL_MS) {
        setPhase('failed');
        setError(
          'We have not received confirmation yet. If you completed the payment, it will be confirmed shortly — check your status later. Otherwise, try again.'
        );
        return;
      }
      poll(checkoutRequestId);
    }, POLL_MS);
  }

  async function pay() {
    setError(null);
    setMessage(null);
    if (!isValidKenyanPhone(phone)) {
      setError('Enter a valid Safaricom M-Pesa number, e.g. 0712 345 678.');
      return;
    }
    if (!token) return;
    setPhase('sending');
    try {
      const { result, message: msg } = await initiatePayment(application.id, token, phone);
      setPayment(result);
      setMessage(msg || 'Check your phone and enter your M-Pesa PIN.');
      setPhase('waiting');
      startedAt.current = Date.now();
      poll(result.checkoutRequestId);
    } catch (err) {
      setPhase('failed');
      setError(getErrorMessage(err));
    }
  }

  const waiting = phase === 'sending' || phase === 'waiting';

  return (
    <WizardStepShell
      title="Pay with M-Pesa"
      description="Your application will be submitted as soon as payment is confirmed."
      onBack={waiting ? undefined : () => goTo(6)}
      error={error}
    >
      <div className="rounded-lg bg-brand-50 p-4">
        <p className="text-sm text-slate-600">Application number</p>
        <p className="text-lg font-semibold text-slate-900">{application.applicationNumber}</p>
        <p className="mt-2 text-sm text-slate-600">Amount to pay</p>
        <p className="text-2xl font-bold text-brand-800">{formatKES(amount)}</p>
      </div>

      <TextField
        label="M-Pesa phone number"
        value={phone}
        onChange={setPhone}
        hint="The Safaricom number that will receive the payment prompt."
        inputMode="tel"
        disabled={waiting}
        required
      />

      {phase === 'waiting' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" aria-live="polite">
          <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          <div>
            <p className="font-semibold">Waiting for payment confirmation…</p>
            <p className="mt-1">{message}</p>
            <p className="mt-1 text-xs">Keep this page open. Never share your M-Pesa PIN with anyone.</p>
          </div>
        </div>
      )}

      {phase === 'paid' && (
        <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
          Payment confirmed{payment?.mpesaReceiptNumber ? ` (receipt ${payment.mpesaReceiptNumber})` : ''}.
        </p>
      )}

      <button type="button" className="btn-primary w-full" onClick={pay} disabled={waiting || phase === 'paid'}>
        {phase === 'sending'
          ? 'Sending request…'
          : phase === 'waiting'
            ? 'Waiting for confirmation…'
            : phase === 'failed'
              ? 'Try again'
              : `Pay ${formatKES(amount)}`}
      </button>
    </WizardStepShell>
  );
}
