import type { AdminRole, ApplicationStatus, DocumentType, PaymentStatus } from '../api/types';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  AWAITING_PAYMENT: 'Awaiting payment',
  PAID: 'Paid',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  ADDITIONAL_INFO_REQUIRED: 'Additional info required',
  PROCESSING: 'Processing',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
};

export const STATUS_BADGE: Record<ApplicationStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  SUBMITTED: 'bg-sky-100 text-sky-800',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-800',
  ADDITIONAL_INFO_REQUIRED: 'bg-orange-100 text-orange-800',
  PROCESSING: 'bg-violet-100 text-violet-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-200 text-slate-700',
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

export const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-200 text-slate-700',
  EXPIRED: 'bg-slate-200 text-slate-700',
};

export const APPLICATION_STATUSES = Object.keys(STATUS_LABELS) as ApplicationStatus[];
export const PAYMENT_STATUSES = Object.keys(PAYMENT_LABELS) as PaymentStatus[];

export const ADMIN_SETTABLE_STATUSES: ApplicationStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ADDITIONAL_INFO_REQUIRED',
  'PROCESSING',
  'APPROVED',
  'COMPLETED',
  'DECLINED',
  'CANCELLED',
];

export const SPONSOR_RELATIONSHIPS = ['Parent', 'Brother/Sister', 'Spouse', 'Relative', 'Friend', 'Other'];
export const FAMILY_RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Brother/Sister', 'Relative', 'Other'];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  APPLICANT_PASSPORT_PHOTO: "Applicant's passport photo",
  MANIFEST_CARD: 'Manifest card',
  SPONSOR_PASSPORT_PHOTO: "Sponsor's passport photo",
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  APPLICATION_OFFICER: 'Application Officer',
  FINANCE_OFFICER: 'Finance Officer',
  VIEWER: 'Viewer',
};

export const ROLES: AdminRole[] = ['SUPER_ADMIN', 'APPLICATION_OFFICER', 'FINANCE_OFFICER', 'VIEWER'];

export const CAN_VIEW_APPLICATIONS: AdminRole[] = ['SUPER_ADMIN', 'APPLICATION_OFFICER', 'VIEWER'];
export const CAN_EDIT_APPLICATIONS: AdminRole[] = ['SUPER_ADMIN', 'APPLICATION_OFFICER'];
export const CAN_VIEW_PAYMENTS: AdminRole[] = ['SUPER_ADMIN', 'FINANCE_OFFICER'];
export const SUPER_ONLY: AdminRole[] = ['SUPER_ADMIN'];

export const MAX_UPLOAD_MB = 5;

export const WIZARD_STEPS = [
  'Applicant',
  'Family',
  'Refugee stay',
  'Sponsor',
  'Documents',
  'Review',
  'Payment',
  'Done',
];
