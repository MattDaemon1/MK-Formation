/**
 * MK Formation — Reactive Client-Side State Manager
 * Bridges UI components with the DatabaseStore, enforcing RBAC and real-time updates
 */

import { DatabaseStore } from '../server/database.ts';
import { auditService } from '../server/audit.ts';
import { automationEngine } from '../server/automations.ts';
import { generateUUID } from '../server/crypto.ts';
import {
  User,
  SafeUser,
  Company,
  TrainingProgram,
  ProgramVersion,
  TrainingSession,
  Enrollment,
  AttendanceRecord,
  DocumentRecord,
  Invoice,
  QualiopiIndicator,
  AuditLog,
  AutomationJob,
  SatisfactionSurvey,
  UserRole,
} from '../types/index.ts';

const LOCAL_STORAGE_KEY = 'mk_formation_db_state_v1';
const SESSION_AUTH_KEY = 'mk_formation_auth_session';
const SESSION_USER_KEY = 'mk_formation_active_user';

class AppStateManager {
  private db: DatabaseStore;
  private currentUser: User;
  private currentToken: string;
  private authenticated: boolean = true;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.db = new DatabaseStore();
    
    let initialUser = this.db.users.get('USR-ADMIN-01')!;
    let isAuth = true;

    if (typeof window !== 'undefined') {
      try {
        const authStatus = sessionStorage.getItem(SESSION_AUTH_KEY);
        const savedUserId = sessionStorage.getItem(SESSION_USER_KEY);
        if (authStatus === 'logged_out') {
          isAuth = false;
        } else if (savedUserId && this.db.users.has(savedUserId)) {
          const found = this.db.users.get(savedUserId);
          if (found && found.active) {
            initialUser = found;
          }
        }
      } catch {
        // Ignore sessionStorage restrictions in some environments
      }
    }

    this.currentUser = initialUser;
    this.authenticated = isAuth;
    const auth = this.db.authenticate(
      initialUser.email,
      initialUser.role === 'ADMIN'
        ? 'AdminPass2026!'
        : initialUser.role === 'TRAINER'
        ? 'TrainerPass2026!'
        : initialUser.role === 'CLIENT_CONTACT'
        ? 'ClientPass2026!'
        : 'LearnerPass2026!'
    );
    this.currentToken = auth ? auth.token : '';
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getDb(): DatabaseStore {
    return this.db;
  }

  public isAuthenticated(): boolean {
    return this.authenticated && !!this.currentUser && !!this.currentUser.active;
  }

  public getCurrentUser(): User {
    return this.currentUser;
  }

  public getCurrentSafeUser(): SafeUser {
    return this.db.toSafeUser(this.currentUser);
  }

  public logout(): void {
    this.authenticated = false;
    this.currentToken = '';
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_AUTH_KEY, 'logged_out');
        sessionStorage.removeItem(SESSION_USER_KEY);
      } catch {
        // Ignore
      }
    }

    auditService.log({
      user: this.currentUser,
      action: 'USER_LOGOUT',
      entityType: 'USER',
      entityId: this.currentUser.id,
      details: `Déconnexion de l'utilisateur ${this.currentUser.email}`,
    });

    this.notify();
  }

  /**
   * Switches user context (simulates login / role switcher to demonstrate RBAC and isolation)
   */
  public switchUser(userId: string): boolean {
    const targetUser = this.db.users.get(userId);
    if (!targetUser || !targetUser.active) return false;

    this.currentUser = targetUser;
    const auth = this.db.authenticate(
      targetUser.email,
      targetUser.role === 'ADMIN'
        ? 'AdminPass2026!'
        : targetUser.role === 'TRAINER'
        ? 'TrainerPass2026!'
        : targetUser.role === 'CLIENT_CONTACT'
        ? 'ClientPass2026!'
        : 'LearnerPass2026!'
    );
    if (auth) {
      this.currentToken = auth.token;
    }
    this.authenticated = true;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_AUTH_KEY, 'authenticated');
        sessionStorage.setItem(SESSION_USER_KEY, targetUser.id);
      } catch {
        // Ignore
      }
    }

    auditService.log({
      user: targetUser,
      action: 'USER_CONTEXT_SWITCHED',
      entityType: 'USER',
      entityId: targetUser.id,
      details: `Session basculée vers ${targetUser.firstName} ${targetUser.lastName} (${targetUser.role})`,
    });

    this.notify();
    return true;
  }

  /**
   * Real email + password authentication
   */
  public login(email: string, pass: string): boolean {
    const auth = this.db.authenticate(email, pass);
    if (!auth) return false;

    const user = this.db.users.get(auth.user.id);
    if (!user) return false;

    this.currentUser = user;
    this.currentToken = auth.token;
    this.authenticated = true;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_AUTH_KEY, 'authenticated');
        sessionStorage.setItem(SESSION_USER_KEY, user.id);
      } catch {
        // Ignore
      }
    }
    this.notify();
    return true;
  }

  /**
   * Public Self-Registration for Enterprises and Trainees
   */
  public selfRegister(params: {
    accountType: 'COMPANY_CLIENT' | 'BENEFICIARY';
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    companyName?: string;
    siren?: string;
    siret?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    opcoName?: string;
    companyId?: string;
  }): SafeUser {
    const res = this.db.selfRegister(params);
    const user = this.db.users.get(res.user.id)!;
    this.currentUser = user;
    this.currentToken = res.token;
    this.authenticated = true;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_AUTH_KEY, 'authenticated');
        sessionStorage.setItem(SESSION_USER_KEY, user.id);
      } catch {
        // Ignore
      }
    }
    this.notify();
    return res.user;
  }

  public createUser(params: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    companyId?: string;
    phone?: string;
    password?: string;
  }): User {
    const user = this.db.createUser({
      ...params,
      actor: this.currentUser,
    });
    this.notify();
    return user;
  }

  public toggleUserActive(userId: string): User {
    const user = this.db.toggleUserActive(userId, this.currentUser);
    this.notify();
    return user;
  }

  public resetUserPassword(userId: string, newPass: string): void {
    this.db.resetUserPassword(userId, newPass, this.currentUser);
    this.notify();
  }

  public getAllUsers(): User[] {
    return Array.from(this.db.users.values());
  }

  public getCompanies(): Company[] {
    return Array.from(this.db.companies.values());
  }

  public getPrograms(): TrainingProgram[] {
    return Array.from(this.db.programs.values());
  }

  public getProgramVersions(programId?: string): ProgramVersion[] {
    const all = Array.from(this.db.programVersions.values());
    if (programId) {
      return all.filter((v) => v.programId === programId);
    }
    return all;
  }

  public getSessions(): TrainingSession[] {
    return Array.from(this.db.sessions.values());
  }

  public getEnrollments(sessionId?: string): Enrollment[] {
    const all = Array.from(this.db.enrollments.values());
    if (sessionId) {
      return all.filter((e) => e.sessionId === sessionId);
    }
    return all;
  }

  public getAttendance(sessionId?: string): AttendanceRecord[] {
    const all = Array.from(this.db.attendance.values());
    if (sessionId) {
      return all.filter((a) => a.sessionId === sessionId);
    }
    return all;
  }

  public getDocuments(): DocumentRecord[] {
    return Array.from(this.db.documents.values());
  }

  public getInvoices(): Invoice[] {
    return Array.from(this.db.invoices.values());
  }

  public getQualiopi(): QualiopiIndicator[] {
    return Array.from(this.db.qualiopi.values());
  }

  public getAuditLogs(): AuditLog[] {
    return auditService.getAllLogs();
  }

  // Domain Actions

  public createProgram(params: {
    title: string;
    referenceCode: string;
    category: string;
    summary: string;
    durationHours: number;
    durationDays: number;
    priceHtCents: number;
    objectives: string[];
    prerequisites: string[];
    targetAudience: string[];
    modules?: { title: string; duration: string; topics: string[] }[];
  }): TrainingProgram {
    const program = this.db.createProgram({
      ...params,
      actor: this.currentUser,
    });
    this.notify();
    return program;
  }

  public updateProgram(params: {
    id: string;
    title: string;
    referenceCode: string;
    category: string;
    summary: string;
    active?: boolean;
  }): TrainingProgram {
    const program = this.db.updateProgram({
      ...params,
      actor: this.currentUser,
    });
    this.notify();
    return program;
  }

  public deleteProgram(programId: string): boolean {
    const result = this.db.deleteProgram(programId, this.currentUser);
    this.notify();
    return result;
  }

  public toggleProgramActive(programId: string): TrainingProgram {
    const program = this.db.toggleProgramActive(programId, this.currentUser);
    this.notify();
    return program;
  }

  public createProgramVersion(params: {
    programId: string;
    durationHours: number;
    durationDays: number;
    priceHtCents: number;
    objectives: string[];
    prerequisites: string[];
    targetAudience: string[];
    evaluationMethods: string[];
    pedagogicalMeans: string[];
    modules: { title: string; duration: string; topics: string[] }[];
    changelogNotes?: string;
  }): ProgramVersion {
    const version = this.db.createProgramVersion({
      ...params,
      actor: this.currentUser,
    });
    this.notify();
    return version;
  }

  public updateProgramVersion(params: {
    versionId: string;
    durationHours: number;
    durationDays: number;
    priceHtCents: number;
    objectives: string[];
    prerequisites: string[];
    targetAudience: string[];
    evaluationMethods?: string[];
    pedagogicalMeans?: string[];
    modules: { title: string; duration: string; topics: string[] }[];
    changelogNotes?: string;
  }): ProgramVersion {
    const version = this.db.updateProgramVersion({
      ...params,
      actor: this.currentUser,
    });
    this.notify();
    return version;
  }

  public createCompany(params: {
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
  }): Company {
    const company = this.db.createCompany({
      ...params,
      actor: this.currentUser,
    });
    this.notify();
    return company;
  }

  public updateCompany(params: {
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
  }): Company {
    const company = this.db.updateCompany({
      ...params,
      actor: this.currentUser,
    });
    this.notify();
    return company;
  }

  public createCompanyUser(params: {
    email: string;
    firstName: string;
    lastName: string;
    role: 'CLIENT_CONTACT' | 'BENEFICIARY';
    companyId: string;
    phone?: string;
    password?: string;
  }): User {
    const user = this.db.createCompanyUser({
      ...params,
      actor: this.currentUser,
    });
    this.notify();
    return user;
  }

  public createSession(params: {
    referenceCode: string;
    programId: string;
    title: string;
    modality: 'PRESENTIEL' | 'DISTANCIEL' | 'HYBRIDE';
    startDate: string;
    endDate: string;
    location: string;
    maxParticipants: number;
    trainerId: string;
  }): TrainingSession {
    const session = this.db.createSession({
      ...params,
      actor: this.currentUser,
    });
    this.notify();
    return session;
  }

  public enrollBeneficiary(sessionId: string, beneficiaryId: string, companyId: string): Enrollment {
    const enrollment = this.db.enrollBeneficiary({
      sessionId,
      beneficiaryId,
      companyId,
      actor: this.currentUser,
    });
    this.notify();
    return enrollment;
  }

  public sendConvocation(enrollmentId: string): DocumentRecord {
    const enrollment = this.db.enrollments.get(enrollmentId);
    if (!enrollment) throw new Error('Inscription introuvable');

    const session = this.db.sessions.get(enrollment.sessionId);
    if (!session) throw new Error('Session introuvable');

    const beneficiary = this.db.users.get(enrollment.beneficiaryId);
    if (!beneficiary) throw new Error('Bénéficiaire introuvable');

    const company = this.db.companies.get(enrollment.companyId);
    const program = this.db.programs.get(session.programId);
    const version = program ? this.db.programVersions.get(session.programVersionId) : null;

    const snapshot = {
      reference: `DOC-CNV-${Date.now().toString().slice(-4)}`,
      beneficiaryName: `${beneficiary.firstName} ${beneficiary.lastName}`,
      beneficiaryEmail: beneficiary.email,
      companyName: company?.name || 'Entreprise',
      trainingTitle: session.title,
      modality: session.modality,
      dates: `${session.startDate} au ${session.endDate}`,
      durationHours: version?.durationHours || 14,
      location: session.location,
      organizer: 'Matt Konnect Organisme de Formation',
      generatedAt: new Date().toISOString(),
    };

    const doc = this.db.generateDocument({
      referenceCode: snapshot.reference,
      type: 'CONVOCATION',
      title: `Convocation officielle — ${beneficiary.firstName} ${beneficiary.lastName}`,
      relatedEntityType: 'ENROLLMENT',
      relatedEntityId: enrollment.id,
      companyId: enrollment.companyId,
      beneficiaryId: enrollment.beneficiaryId,
      contentSnapshot: snapshot,
      actor: this.currentUser,
    });

    enrollment.status = 'CONVOKED';
    enrollment.convocationSentAt = new Date().toISOString();
    enrollment.updatedAt = new Date().toISOString();

    this.notify();
    return doc;
  }

  public markAttendance(sessionId: string, beneficiaryId: string, date: string, period: 'MORNING' | 'AFTERNOON', present: boolean): AttendanceRecord {
    const record = this.db.markAttendance({
      sessionId,
      beneficiaryId,
      date,
      period,
      present,
      actor: this.currentUser,
    });
    this.notify();
    return record;
  }

  public createInvoice(params: {
    invoiceNumber: string;
    companyId: string;
    sessionId?: string;
    issueDate: string;
    dueDate: string;
    tvaRateBps: number;
    items: { description: string; quantity: number; unitPriceHtCents: number }[];
  }): Invoice {
    const invoice = this.db.createInvoice({
      ...params,
      actor: this.currentUser,
    });
    this.notify();
    return invoice;
  }

  public recordPayment(params: {
    invoiceId: string;
    amountCents: number;
    method: 'VIREMENT' | 'CB' | 'CHEQUE';
    reference: string;
    date: string;
  }): void {
    this.db.recordPayment({
      ...params,
      actor: this.currentUser,
    });
    this.notify();
  }

  public updateQualiopiIndicator(indicatorId: string, status: 'CONFORME' | 'EN_COURS' | 'A_VERIFIER', notes: string): void {
    const indicator = this.db.qualiopi.get(indicatorId);
    if (!indicator) return;

    indicator.status = status;
    indicator.notes = notes;
    indicator.lastAuditedAt = new Date().toISOString();

    auditService.log({
      user: this.currentUser,
      action: 'QUALIOPI_INDICATOR_UPDATED',
      entityType: 'QUALIOPI_INDICATOR',
      entityId: indicator.id,
      details: `Indicateur ${indicator.indicatorNumber} mis à jour : Statut=${status}`,
    });

    this.notify();
  }

  public generateConvention(sessionId: string, companyId: string): DocumentRecord {
    const session = this.db.sessions.get(sessionId);
    if (!session) throw new Error('Session introuvable');
    const company = this.db.companies.get(companyId);
    if (!company) throw new Error('Entreprise introuvable');
    const program = this.db.programs.get(session.programId);
    const version = program ? this.db.programVersions.get(session.programVersionId) : null;

    const participants = Array.from(this.db.enrollments.values())
      .filter((e) => e.sessionId === sessionId && e.companyId === companyId)
      .map((e) => {
        const u = this.db.users.get(e.beneficiaryId);
        return u ? `${u.firstName} ${u.lastName}` : 'Stagiaire';
      });

    const snapshot = {
      reference: `CNV-${Date.now().toString().slice(-4)}`,
      companyName: company.name,
      companySiren: company.siren,
      companyAddress: `${company.address}, ${company.postalCode} ${company.city}`,
      sessionTitle: session.title,
      modality: session.modality,
      durationHours: version?.durationHours || 14,
      dates: `${session.startDate} au ${session.endDate}`,
      location: session.location,
      priceHtCents: version?.priceHtCents || 180000,
      participants,
      organizer: 'Matt Konnect SAS - Déclaration d’activité 11 75 00000 75',
      generatedAt: new Date().toISOString(),
    };

    const doc = this.db.generateDocument({
      referenceCode: snapshot.reference,
      type: 'CONVENTION',
      title: `Convention de formation professionnelle — ${company.name}`,
      relatedEntityType: 'SESSION',
      relatedEntityId: sessionId,
      companyId: company.id,
      contentSnapshot: snapshot,
      actor: this.currentUser,
    });

    this.notify();
    return doc;
  }

  // ==========================================
  // AUTOMATIONS & SURVEY MANAGEMENT
  // ==========================================

  public surveys: Map<string, SatisfactionSurvey> = new Map();

  public getAutomationJobs(): AutomationJob[] {
    return automationEngine.getAllJobs();
  }

  public triggerSessionReminders(sessionId: string, trigger: 'SESSION_REMINDER_J7' | 'SESSION_REMINDER_J1'): number {
    const session = this.db.sessions.get(sessionId);
    if (!session) throw new Error('Session introuvable');

    const enrollments = Array.from(this.db.enrollments.values()).filter(
      (e) => e.sessionId === sessionId && e.status !== 'CANCELLED'
    );

    let queuedCount = 0;
    for (const enr of enrollments) {
      const ben = this.db.users.get(enr.beneficiaryId);
      if (!ben) continue;

      const { job, isNew } = automationEngine.queueJob({
        trigger,
        recipientEmail: ben.email,
        recipientName: `${ben.firstName} ${ben.lastName}`,
        relatedEntityType: 'SESSION',
        relatedEntityId: session.id,
        payload: {
          sessionTitle: session.title,
          startDate: session.startDate,
          location: session.location,
        },
      });

      if (isNew) {
        // Process delivery immediately in test environment
        automationEngine.processJob(job.id, false);
        queuedCount += 1;
      }
    }

    this.notify();
    return queuedCount;
  }

  public submitSatisfactionSurvey(params: {
    enrollmentId: string;
    pedagogicalClarityRating: number;
    exercisesRelevanceRating: number;
    trainerPacingRating: number;
    overallRating: number;
    comment: string;
    wouldRecommend: boolean;
  }): SatisfactionSurvey {
    const enrollment = this.db.enrollments.get(params.enrollmentId);
    if (!enrollment) throw new Error('Inscription introuvable');

    const survey: SatisfactionSurvey = {
      id: generateUUID(),
      enrollmentId: params.enrollmentId,
      sessionId: enrollment.sessionId,
      beneficiaryId: enrollment.beneficiaryId,
      submittedAt: new Date().toISOString(),
      pedagogicalClarityRating: params.pedagogicalClarityRating,
      exercisesRelevanceRating: params.exercisesRelevanceRating,
      trainerPacingRating: params.trainerPacingRating,
      overallRating: params.overallRating,
      comment: params.comment,
      wouldRecommend: params.wouldRecommend,
    };

    this.surveys.set(survey.id, survey);
    enrollment.satisfactionScore = survey.overallRating;
    enrollment.satisfactionComment = survey.comment;
    enrollment.status = 'COMPLETED';

    auditService.log({
      user: this.currentUser,
      action: 'SURVEY_SUBMITTED',
      entityType: 'SATISFACTION_SURVEY',
      entityId: survey.id,
      details: `Évaluation de satisfaction enregistrée : Note globale ${survey.overallRating}/5 (Recommande: ${survey.wouldRecommend ? 'OUI' : 'NON'})`,
    });

    this.notify();
    return survey;
  }

  public getSurveys(): SatisfactionSurvey[] {
    return Array.from(this.surveys.values());
  }

  // ==========================================
  // OFFICIAL ATTESTATIONS & RGPD EXPORT
  // ==========================================

  public generateCertificatRealisation(enrollmentId: string): DocumentRecord {
    const enrollment = this.db.enrollments.get(enrollmentId);
    if (!enrollment) throw new Error('Inscription introuvable');
    const session = this.db.sessions.get(enrollment.sessionId);
    if (!session) throw new Error('Session introuvable');
    const beneficiary = this.db.users.get(enrollment.beneficiaryId);
    if (!beneficiary) throw new Error('Bénéficiaire introuvable');
    const company = this.db.companies.get(enrollment.companyId);
    const program = this.db.programs.get(session.programId);
    const version = program ? this.db.programVersions.get(session.programVersionId) : null;

    // Calculate completed hours from attendance records
    const attendanceRecords = Array.from(this.db.attendance.values()).filter(
      (a) => a.sessionId === session.id && a.beneficiaryId === beneficiary.id && a.present
    );
    // 3.5 hours per half day
    const completedHours = attendanceRecords.length * 3.5;
    const totalHours = version?.durationHours || 14;

    const snapshot = {
      reference: `CERT-REAL-${Date.now().toString().slice(-4)}`,
      beneficiaryName: `${beneficiary.firstName} ${beneficiary.lastName}`,
      beneficiaryEmail: beneficiary.email,
      companyName: company?.name || 'Entreprise',
      trainingTitle: session.title,
      modality: session.modality,
      dates: `${session.startDate} au ${session.endDate}`,
      completedHours,
      totalHours,
      organizer: 'Matt Konnect SAS - Déclaration d’activité 11 75 00000 75',
      generatedAt: new Date().toISOString(),
    };

    const doc = this.db.generateDocument({
      referenceCode: snapshot.reference,
      type: 'CERTIFICAT_REALISATION',
      title: `Certificat de réalisation officiel — ${beneficiary.firstName} ${beneficiary.lastName}`,
      relatedEntityType: 'ENROLLMENT',
      relatedEntityId: enrollment.id,
      companyId: enrollment.companyId,
      beneficiaryId: enrollment.beneficiaryId,
      contentSnapshot: snapshot,
      actor: this.currentUser,
    });

    this.notify();
    return doc;
  }

  public generateAttestationFin(enrollmentId: string): DocumentRecord {
    const enrollment = this.db.enrollments.get(enrollmentId);
    if (!enrollment) throw new Error('Inscription introuvable');
    const session = this.db.sessions.get(enrollment.sessionId);
    if (!session) throw new Error('Session introuvable');
    const beneficiary = this.db.users.get(enrollment.beneficiaryId);
    if (!beneficiary) throw new Error('Bénéficiaire introuvable');
    const company = this.db.companies.get(enrollment.companyId);
    const program = this.db.programs.get(session.programId);
    const version = program ? this.db.programVersions.get(session.programVersionId) : null;

    const snapshot = {
      reference: `ATT-FIN-${Date.now().toString().slice(-4)}`,
      beneficiaryName: `${beneficiary.firstName} ${beneficiary.lastName}`,
      companyName: company?.name || 'Entreprise',
      trainingTitle: session.title,
      durationHours: version?.durationHours || 14,
      dates: `${session.startDate} au ${session.endDate}`,
      evaluationResult: enrollment.satisfactionScore ? `Objectifs validés (${enrollment.satisfactionScore}/5)` : 'Objectifs validés avec succès',
      attendanceRate: '100%',
      organizer: 'Matt Konnect SAS',
      generatedAt: new Date().toISOString(),
    };

    const doc = this.db.generateDocument({
      referenceCode: snapshot.reference,
      type: 'ATTESTATION_FIN',
      title: `Attestation de fin de formation — ${beneficiary.firstName} ${beneficiary.lastName}`,
      relatedEntityType: 'ENROLLMENT',
      relatedEntityId: enrollment.id,
      companyId: enrollment.companyId,
      beneficiaryId: enrollment.beneficiaryId,
      contentSnapshot: snapshot,
      actor: this.currentUser,
    });

    this.notify();
    return doc;
  }

  public exportPersonalDataRgpd(userId: string): Record<string, any> {
    const targetUser = this.db.users.get(userId);
    if (!targetUser) throw new Error('Utilisateur introuvable');

    const enrollments = Array.from(this.db.enrollments.values()).filter(
      (e) => e.beneficiaryId === userId
    );

    const sessionIds = enrollments.map((e) => e.sessionId);
    const attendance = Array.from(this.db.attendance.values()).filter(
      (a) => a.beneficiaryId === userId
    );

    const documents = Array.from(this.db.documents.values()).filter(
      (d) => d.beneficiaryId === userId
    ).map((d) => ({
      reference: d.referenceCode,
      type: d.type,
      title: d.title,
      date: d.createdAt,
      sha256: d.sha256Fingerprint,
    }));

    const surveys = Array.from(this.surveys.values()).filter(
      (s) => s.beneficiaryId === userId
    );

    const safeExport = {
      rgpdNotice: 'Export de données personnelles conformément à l’article 15 du RGPD (Droit d’accès).',
      exportedAt: new Date().toISOString(),
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        role: targetUser.role,
        phone: targetUser.phone,
      },
      trainingsFollowed: enrollments.map((enr) => {
        const sess = this.db.sessions.get(enr.sessionId);
        return {
          sessionCode: sess?.referenceCode,
          sessionTitle: sess?.title,
          startDate: sess?.startDate,
          status: enr.status,
        };
      }),
      attendanceRecords: attendance.map((a) => ({
        date: a.date,
        period: a.period,
        present: a.present,
        signedAt: a.signedAt,
      })),
      documentsIssued: documents,
      evaluations: surveys,
    };

    auditService.log({
      user: this.currentUser,
      action: 'RGPD_DATA_EXPORTED',
      entityType: 'USER',
      entityId: userId,
      details: `Exportation du dossier RGPD pour l'utilisateur ${targetUser.email}`,
    });

    return safeExport;
  }

  public getRgpdRetentionPolicies() {
    return [
      {
        category: 'Pièces comptables & Factures de formation',
        duration: '10 ans',
        legalBasis: 'Article L123-22 du Code de Commerce',
        rule: 'Conservation obligatoire pour contrôle fiscal. Suppression prématurée interdite.',
      },
      {
        category: 'Feuilles d’émargement & Certificats de réalisation',
        duration: '3 ans',
        legalBasis: 'Article R. 6331-59 du Code du Travail / Contrôle DREETS & OPCO',
        rule: 'Conservation requise pour justification du service fait et vérification Qualiopi.',
      },
      {
        category: 'Données des stagiaires & comptes de formation',
        duration: '3 ans après le dernier contact',
        legalBasis: 'Délibération CNIL n° 2012-209',
        rule: 'Archivage intermédiaire avec limitation stricte des accès après fin de session.',
      },
      {
        category: 'Journaux d’audit applicatif & de sécurité',
        duration: '1 an',
        legalBasis: 'Recommandation ANSSI & Délibération CNIL',
        rule: 'Conservation immuable pour traçabilité des opérations sensibles et détection d’incidents.',
      },
    ];
  }
}

export const appState = new AppStateManager();

