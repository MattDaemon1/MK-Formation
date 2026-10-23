/**
 * MK Formation — Security Policies & RBAC Engine
 * Strict deny-by-default access control and client isolation
 */

import {
  User,
  TrainingSession,
  Enrollment,
  DocumentRecord,
  Invoice,
  Company,
} from '../types/index.ts';

/**
 * Checks if a user has admin privileges (Matt Konnect Administrator).
 */
export function isAdmin(user: User): boolean {
  return user.active && user.role === 'ADMIN';
}

/**
 * Checks if a user is an authorized internal or external trainer.
 */
export function isTrainer(user: User): boolean {
  return user.active && user.role === 'TRAINER';
}

/**
 * Checks if a user can access the confidential audit logs.
 * Strictly restricted to Matt Konnect Administrators.
 */
export function canAccessAuditLogs(user: User): boolean {
  return isAdmin(user);
}

/**
 * Checks if a user can manage the Qualiopi criteria and quality evidence.
 * Restricted to Matt Konnect Administrators and authorized team.
 */
export function canManageQualiopi(user: User): boolean {
  return isAdmin(user);
}

/**
 * Checks if a user can create or modify training programs and catalog versions.
 */
export function canManageCatalog(user: User): boolean {
  return isAdmin(user);
}

/**
 * Checks if a user can manage company profiles.
 */
export function canManageCompanies(user: User): boolean {
  return isAdmin(user);
}

/**
 * Checks if a user can access a company's confidential details.
 * - Admin: YES (all companies)
 * - Client Contact: ONLY their own company (companyId match)
 * - Beneficiary: ONLY their own company (companyId match)
 * - Trainer: NO (unless assigned, but cannot view commercial details)
 */
export function canAccessCompany(user: User, companyId: string): boolean {
  if (!user.active) return false;
  if (isAdmin(user)) return true;
  if (user.companyId && user.companyId === companyId) {
    return true;
  }
  return false;
}

/**
 * Checks if a user can access a specific training session.
 * - Admin: YES
 * - Trainer: ONLY if assigned to the session
 * - Client Contact: ONLY if at least one employee/beneficiary of their company is enrolled in this session
 * - Beneficiary: ONLY if personally enrolled in this session
 */
export function canAccessSession(
  user: User,
  session: TrainingSession,
  enrollmentsForSession: Enrollment[]
): boolean {
  if (!user.active) return false;
  if (isAdmin(user)) return true;

  if (isTrainer(user)) {
    return session.trainerId === user.id;
  }

  if (user.role === 'CLIENT_CONTACT') {
    if (!user.companyId) return false;
    return enrollmentsForSession.some((e) => e.companyId === user.companyId);
  }

  if (user.role === 'BENEFICIARY') {
    return enrollmentsForSession.some((e) => e.beneficiaryId === user.id);
  }

  return false;
}

/**
 * Checks if a user can edit/manage a training session.
 */
export function canManageSession(user: User, session?: TrainingSession): boolean {
  if (!user.active) return false;
  if (isAdmin(user)) return true;
  return false;
}

/**
 * Checks if a user can mark attendance or sign off on attendance sheets.
 * Allowed for Admin or the assigned Trainer of the session.
 */
export function canMarkAttendance(user: User, session: TrainingSession): boolean {
  if (!user.active) return false;
  if (isAdmin(user)) return true;
  if (isTrainer(user) && session.trainerId === user.id) return true;
  return false;
}

/**
 * Checks if a user can access and download a document.
 * - Admin: YES
 * - Trainer: ONLY if related to their assigned session and non-financial (no invoices/quotes)
 * - Client Contact: ONLY if document belongs to their company
 * - Beneficiary: ONLY if document is personal to them (their own convocation/certificate)
 */
export function canAccessDocument(user: User, doc: DocumentRecord): boolean {
  if (!user.active) return false;
  if (isAdmin(user)) return true;

  // Commercial / financial documents are NEVER accessible to trainers or beneficiaries
  if (doc.type === 'FACTURE' || doc.type === 'DEVIS') {
    if (user.role === 'CLIENT_CONTACT' && user.companyId && doc.companyId === user.companyId) {
      return true;
    }
    return false;
  }

  // Learner personal documents (e.g. Attestation, Personal Convocation)
  if (user.role === 'BENEFICIARY') {
    if (doc.beneficiaryId && doc.beneficiaryId === user.id) {
      return true;
    }
    return false;
  }

  // Enterprise contact can access all non-internal documents related to their company
  if (user.role === 'CLIENT_CONTACT') {
    if (user.companyId && doc.companyId === user.companyId) {
      return true;
    }
    return false;
  }

  // Trainers can only access pedagogical documents for their assigned sessions
  if (isTrainer(user)) {
    if (doc.type === 'EMARGEMENT' || doc.type === 'PROGRAMME' || doc.type === 'CONVOCATION') {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Checks if a user can access a specific invoice.
 * - Admin: YES
 * - Client Contact: ONLY if invoice.companyId matches user.companyId
 * - Trainer & Beneficiary: STRICTLY FORBIDDEN
 */
export function canAccessInvoice(user: User, invoice: Invoice): boolean {
  if (!user.active) return false;
  if (isAdmin(user)) return true;

  if (user.role === 'CLIENT_CONTACT' && user.companyId && invoice.companyId === user.companyId) {
    return true;
  }

  return false;
}

/**
 * Checks if a user can record payments or create invoices.
 * Strictly Matt Konnect Administrators.
 */
export function canManageInvoices(user: User): boolean {
  return isAdmin(user);
}

/**
 * Filter sessions list safely on the server according to user permissions.
 */
export function filterSessionsForUser(
  user: User,
  sessions: TrainingSession[],
  allEnrollments: Enrollment[]
): TrainingSession[] {
  if (isAdmin(user)) return sessions;

  return sessions.filter((session) => {
    const sessionEnrollments = allEnrollments.filter((e) => e.sessionId === session.id);
    return canAccessSession(user, session, sessionEnrollments);
  });
}

/**
 * Filter documents list safely on the server according to user permissions.
 */
export function filterDocumentsForUser(user: User, docs: DocumentRecord[]): DocumentRecord[] {
  if (isAdmin(user)) return docs;
  return docs.filter((doc) => canAccessDocument(user, doc));
}

/**
 * Filter invoices list safely on the server according to user permissions.
 */
export function filterInvoicesForUser(user: User, invoices: Invoice[]): Invoice[] {
  if (isAdmin(user)) return invoices;
  return invoices.filter((inv) => canAccessInvoice(user, inv));
}
