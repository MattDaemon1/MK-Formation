/**
 * MK Formation — Domain Types & Data Contracts
 * Strict types for Matt Konnect Training Management System
 */

export type UserRole = 'ADMIN' | 'TRAINER' | 'CLIENT_CONTACT' | 'BENEFICIARY';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  companyId?: string; // Set for CLIENT_CONTACT and BENEFICIARY
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, 'passwordHash' | 'salt'>;

export interface Company {
  id: string;
  name: string;
  siren: string;
  siret?: string;
  address: string;
  city: string;
  postalCode: string;
  contactEmail: string;
  contactPhone: string;
  opcoName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingProgram {
  id: string;
  title: string;
  referenceCode: string; // e.g. "MK-DEV-01"
  category: string;
  summary: string;
  currentVersionId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramModule {
  title: string;
  duration: string;
  topics: string[];
}

export interface ProgramVersion {
  id: string;
  programId: string;
  versionNumber: number; // e.g. 1, 2, 3
  changelogNotes?: string;
  durationHours: number;
  durationDays: number;
  priceHtCents: number; // Stored strictly in integer cents (e.g. 150000 = 1500.00 EUR)
  objectives: string[];
  prerequisites: string[];
  targetAudience: string[];
  evaluationMethods: string[];
  pedagogicalMeans: string[];
  modules: ProgramModule[];
  createdAt: string;
}

export type SessionModality = 'PRESENTIEL' | 'DISTANCIEL' | 'HYBRIDE';
export type SessionStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface TrainingSession {
  id: string;
  referenceCode: string; // e.g. "SESS-2026-001"
  programId: string;
  programVersionId: string;
  title: string;
  modality: SessionModality;
  status: SessionStatus;
  startDate: string; // ISO date "YYYY-MM-DD"
  endDate: string; // ISO date "YYYY-MM-DD"
  location: string; // Physical address or secure video conference link
  maxParticipants: number;
  trainerId: string;
  createdAt: string;
  updatedAt: string;
}

export type EnrollmentStatus = 'REGISTERED' | 'CONVOKED' | 'ATTENDING' | 'COMPLETED' | 'CANCELLED';

export interface Enrollment {
  id: string;
  sessionId: string;
  beneficiaryId: string; // User with role BENEFICIARY
  companyId: string; // Company paying / employing the beneficiary
  status: EnrollmentStatus;
  convocationSentAt?: string;
  satisfactionScore?: number; // 1 to 5 scale
  satisfactionComment?: string;
  completionRate?: number; // 0 to 100 percentage
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  beneficiaryId: string;
  date: string; // "YYYY-MM-DD"
  period: 'MORNING' | 'AFTERNOON';
  present: boolean;
  justification?: string;
  signedAt?: string;
  signedByName?: string;
}

export type DocumentType =
  | 'CONVENTION'
  | 'CONVOCATION'
  | 'EMARGEMENT'
  | 'ATTESTATION_FIN'
  | 'CERTIFICAT_REALISATION'
  | 'DEVIS'
  | 'FACTURE'
  | 'PROGRAMME';

export type DocumentStatus = 'DRAFT' | 'GENERATED' | 'SENT' | 'ARCHIVED';

export interface DocumentRecord {
  id: string;
  referenceCode: string; // e.g. "DOC-CNV-2026-0042"
  type: DocumentType;
  title: string;
  status: DocumentStatus;
  relatedEntityType: 'SESSION' | 'ENROLLMENT' | 'INVOICE' | 'COMPANY' | 'PROGRAM';
  relatedEntityId: string;
  companyId?: string; // For client access restriction
  beneficiaryId?: string; // For personal learner access restriction
  sha256Fingerprint: string; // Cryptographic hash of content snapshot
  contentSnapshot: Record<string, any>; // Immutable frozen snapshot of data at generation time
  createdAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceHtCents: number;
  totalHtCents: number;
}

export interface InvoicePayment {
  id: string;
  amountCents: number;
  date: string;
  method: 'VIREMENT' | 'CB' | 'CHEQUE';
  reference: string;
  recordedByUserId: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "FAC-2026-001"
  companyId: string;
  sessionId?: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  totalHtCents: number;
  tvaRateBps: number; // Basis points (e.g. 2000 for 20.00% or 0 if formation exonérée Art. 261-4-4a du CGI)
  totalTvaCents: number;
  totalTtcCents: number;
  paidCents: number;
  currency: 'EUR';
  items: InvoiceItem[];
  payments: InvoicePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface QualiopiIndicator {
  id: string;
  criteriaNumber: number; // 1 to 7
  indicatorNumber: number; // 1 to 32
  title: string;
  requirement: string;
  status: 'CONFORME' | 'EN_COURS' | 'A_VERIFIER';
  evidenceDocumentIds: string[];
  notes: string;
  lastAuditedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress?: string;
}

export type AutomationTrigger =
  | 'CONVOCATION_ISSUED'
  | 'SESSION_REMINDER_J7'
  | 'SESSION_REMINDER_J1'
  | 'EVALUATION_REQUEST'
  | 'ATTESTATION_ISSUED';

export type JobDeliveryStatus = 'PENDING' | 'ACCEPTED' | 'FAILED' | 'DELIVERED';

export interface AutomationJob {
  id: string;
  idempotencyKey: string; // Unique digest: `${trigger}:${entityId}:${recipientEmail}`
  trigger: AutomationTrigger;
  recipientEmail: string;
  recipientName: string;
  relatedEntityType: 'SESSION' | 'ENROLLMENT';
  relatedEntityId: string;
  status: JobDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  payload: Record<string, any>;
  resultMessage?: string;
  createdAt: string;
  lastExecutedAt?: string;
}

export interface SatisfactionSurvey {
  id: string;
  enrollmentId: string;
  sessionId: string;
  beneficiaryId: string;
  submittedAt: string;
  pedagogicalClarityRating: number; // 1 to 5
  exercisesRelevanceRating: number; // 1 to 5
  trainerPacingRating: number; // 1 to 5
  overallRating: number; // 1 to 5
  comment: string;
  wouldRecommend: boolean;
}
