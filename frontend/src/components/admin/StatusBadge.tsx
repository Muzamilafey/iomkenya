import type { ApplicationStatus, PaymentStatus } from '../../api/types';
import { PAYMENT_BADGE, PAYMENT_LABELS, STATUS_BADGE, STATUS_LABELS } from '../../utils/constants';

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus | null | undefined }) {
  if (!status) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_BADGE[status]}`}>
      {PAYMENT_LABELS[status] || status}
    </span>
  );
}

export default StatusBadge;
