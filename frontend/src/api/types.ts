export type ApplicationStatus =
  | 'DRAFT'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ADDITIONAL_INFO_REQUIRED'
  | 'PROCESSING'
  | 'APPROVED'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export type DocumentType = 'APPLICANT_PASSPORT_PHOTO' | 'MANIFEST_CARD' | 'SPONSOR_PASSPORT_PHOTO';

export type AdminRole = 'SUPER_ADMIN' | 'APPLICATION_OFFICER' | 'FINANCE_OFFICER' | 'VIEWER';

export interface FamilyMember {
  _id?: string;
  fullName: string;
  relationship: string;
  dateOfBirth: string | null;
}

export interface ApplicationDocument {
  type: DocumentType;
  originalName?: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface Application {
  id: string;
  applicationNumber: string | null;
  applicant: { fullName?: string; dateOfBirth?: string | null; gender?: string; nationality?: string };
  familyMembers: FamilyMember[];
  refugeeInfo: { refugeeId?: string; settlementName?: string; arrivalDate?: string | null };
  manifest: { hasManifest?: boolean; manifestNumber?: string };
  sponsor: { fullName?: string; relationship?: string; phone?: string; email?: string };
  documents: ApplicationDocument[];
  consent: { accuracyConfirmed?: boolean; termsAccepted?: boolean; consentedAt?: string };
  status: ApplicationStatus;
  paymentStatus: PaymentStatus | null;
  currentStep: number;
  applicationFeeAtSubmission: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNote {
  _id: string;
  note: string;
  authorName?: string;
  createdAt: string;
}

export interface AdminApplication extends Application {
  adminNotes: AdminNote[];
  reviewedAt?: string;
  paidAt?: string;
  submittedAt?: string;
}

export interface StatusHistoryEntry {
  _id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedByName: string;
  note?: string;
  createdAt: string;
}

export interface Payment {
  _id?: string;
  id?: string;
  applicationId?: string;
  applicationNumber?: string;
  applicantName?: string;
  phone: string;
  amount: number;
  status: PaymentStatus;
  checkoutRequestId?: string;
  mpesaReceiptNumber?: string;
  resultCode?: string;
  resultDesc?: string;
  resultSource?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentStatusResult {
  checkoutRequestId: string;
  status: PaymentStatus;
  amount: number;
  resultCode: string | null;
  resultDesc: string | null;
  mpesaReceiptNumber: string | null;
  applicationNumber: string | null;
  applicationStatus: ApplicationStatus | null;
  reused?: boolean;
}

export interface PublicSettings {
  agencyName: string;
  heroHeadline: string;
  heroSubheadline: string;
  logoUrl: string;
  heroImages: string[];
  contactEmail: string;
  contactPhone: string;
  address: string;
  whatsappNumber: string;
  applicationFee: number;
  manifestRequired: boolean;
}

export interface AdminSettings extends PublicSettings {
  applicationNumberPrefix: string;
  updatedAt: string;
  notificationEmails: string[];
  notifyOnSubmission: boolean;
  notifyOnPaymentFailure: boolean;
  email: {
    configured: boolean;
    source: 'portal' | 'env' | null;
    envConfigured: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    from: string;
    passwordSet: boolean;
  };
  mpesa: {
    configured: boolean;
    environment: string;
    shortcodeSet: boolean;
    callbackUrlSet: boolean;
    callbackUrlIsHttps: boolean;
    transactionType: string;
  };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MissingField {
  step: number;
  field: string;
  message: string;
}
