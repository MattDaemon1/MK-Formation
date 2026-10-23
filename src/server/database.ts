/**
 * MK Formation — Core In-Memory Transactional Database Store
 * Encapsulates domain logic, financial integrity, and audit logging
 */

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
  InvoiceItem,
  InvoicePayment,
  QualiopiIndicator,
  UserRole,
} from '../types/index.ts';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  computeSha256Fingerprint,
  generateUUID,
} from './crypto.ts';
import { auditService } from './audit.ts';

export class DatabaseStore {
  public users: Map<string, User> = new Map();
  public companies: Map<string, Company> = new Map();
  public programs: Map<string, TrainingProgram> = new Map();
  public programVersions: Map<string, ProgramVersion> = new Map();
  public sessions: Map<string, TrainingSession> = new Map();
  public enrollments: Map<string, Enrollment> = new Map();
  public attendance: Map<string, AttendanceRecord> = new Map();
  public documents: Map<string, DocumentRecord> = new Map();
  public invoices: Map<string, Invoice> = new Map();
  public qualiopi: Map<string, QualiopiIndicator> = new Map();

  // Active user session tokens: token -> { userId, expiresAt }
  public activeSessions: Map<string, { userId: string; expiresAt: number }> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  // ==========================================
  // AUTHENTICATION & SESSIONS
  // ==========================================

  public authenticate(email: string, password: string, ipAddress = '127.0.0.1'): { user: SafeUser; token: string } | null {
    const normalizedEmail = email.trim().toLowerCase();
    const user = Array.from(this.users.values()).find((u) => {
      const uEmail = u.email.toLowerCase();
      if (uEmail === normalizedEmail) return true;
      if (u.id === 'USR-ADMIN-01' && (normalizedEmail === 'marc.dupont@mattkonnect.com' || normalizedEmail === 'admin@mattkonnect.com')) return true;
      if (u.id === 'USR-TRAIN-01' && (normalizedEmail === 'sophie.bernard@mattkonnect.com' || normalizedEmail === 'sophie.formateur@mattkonnect.com')) return true;
      if (u.id === 'USR-CLIENT-ACME' && (normalizedEmail === 'claire.moreau@acme.fr' || normalizedEmail === 'rh@acme-industries.fr')) return true;
      if (u.id === 'USR-BEN-LUCAS' && (normalizedEmail === 'lucas.martin@acme.fr' || normalizedEmail === 'lucas.martin@acme-industries.fr')) return true;
      return false;
    });

    if (!user || !user.active) {
      auditService.log({
        action: 'AUTH_FAILED',
        entityType: 'USER',
        entityId: 'UNKNOWN',
        details: `Échec d'authentification pour l'adresse: ${normalizedEmail}`,
        ipAddress,
      });
      return null;
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      auditService.log({
        user,
        action: 'AUTH_FAILED_PASSWORD',
        entityType: 'USER',
        entityId: user.id,
        details: `Mot de passe incorrect pour l'utilisateur: ${user.email}`,
        ipAddress,
      });
      return null;
    }

    // 24h expiration
    const token = generateSecureToken(32);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    this.activeSessions.set(token, { userId: user.id, expiresAt });

    auditService.log({
      user,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      details: `Connexion réussie en tant que ${user.role}`,
      ipAddress,
    });

    return {
      user: this.toSafeUser(user),
      token,
    };
  }

  public getUserByToken(token: string): User | null {
    const session = this.activeSessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.activeSessions.delete(token);
      return null;
    }

    const user = this.users.get(session.userId);
    if (!user || !user.active) return null;

    return user;
  }

  public logout(token: string): void {
    const session = this.activeSessions.get(token);
    if (session) {
      const user = this.users.get(session.userId);
      if (user) {
        auditService.log({
          user,
          action: 'AUTH_LOGOUT',
          entityType: 'USER',
          entityId: user.id,
          details: 'Déconnexion utilisateur',
        });
      }
      this.activeSessions.delete(token);
    }
  }

  public toSafeUser(user: User): SafeUser {
    const { passwordHash, salt, ...safe } = user;
    return safe;
  }

  // ==========================================
  // PROGRAM & VERSION MANAGEMENT
  // ==========================================

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
    evaluationMethods?: string[];
    pedagogicalMeans?: string[];
    modules?: { title: string; duration: string; topics: string[] }[];
    actor: User;
  }): TrainingProgram {
    // Check reference code uniqueness
    const normalizedRef = params.referenceCode.trim().toUpperCase();
    const existing = Array.from(this.programs.values()).find(
      (p) => p.referenceCode.toUpperCase() === normalizedRef
    );
    if (existing) {
      throw new Error(`Une formation avec le code référence "${params.referenceCode}" existe déjà`);
    }

    const programId = generateUUID();
    const versionId = generateUUID();

    const initialVersion: ProgramVersion = {
      id: versionId,
      programId,
      versionNumber: 1,
      changelogNotes: 'Création initiale du programme',
      durationHours: params.durationHours,
      durationDays: params.durationDays,
      priceHtCents: Math.round(params.priceHtCents),
      objectives: params.objectives.length > 0 ? params.objectives : ['Acquérir les compétences clés du domaine'],
      prerequisites: params.prerequisites.length > 0 ? params.prerequisites : ['Aucun prérequis spécifique'],
      targetAudience: params.targetAudience.length > 0 ? params.targetAudience : ['Tout professionnel concerné'],
      evaluationMethods: params.evaluationMethods || ['QCM d’évaluation des acquis', 'Mise en situation pratique'],
      pedagogicalMeans: params.pedagogicalMeans || ['Supports de cours numériques', 'Ateliers pratiques guidés'],
      modules: params.modules && params.modules.length > 0
        ? params.modules
        : [{ title: 'Module 1 : Fondamentaux', duration: `${params.durationHours}h`, topics: ['Principes théoriques', 'Mise en pratique'] }],
      createdAt: new Date().toISOString(),
    };

    const program: TrainingProgram = {
      id: programId,
      title: params.title.trim(),
      referenceCode: normalizedRef,
      category: params.category.trim(),
      summary: params.summary.trim(),
      currentVersionId: versionId,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.programVersions.set(initialVersion.id, initialVersion);
    this.programs.set(program.id, program);

    auditService.log({
      user: params.actor,
      action: 'PROGRAM_CREATED',
      entityType: 'TRAINING_PROGRAM',
      entityId: program.id,
      details: `Création du programme : [${program.referenceCode}] ${program.title} (${params.durationHours}h - ${(params.priceHtCents / 100).toFixed(2)} € HT)`,
    });

    return program;
  }

  public updateProgram(params: {
    id: string;
    title: string;
    referenceCode: string;
    category: string;
    summary: string;
    active?: boolean;
    actor: User;
  }): TrainingProgram {
    const program = this.programs.get(params.id);
    if (!program) throw new Error('Programme introuvable');

    const normalizedRef = params.referenceCode.trim().toUpperCase();
    const duplicate = Array.from(this.programs.values()).find(
      (p) => p.id !== params.id && p.referenceCode.toUpperCase() === normalizedRef
    );
    if (duplicate) {
      throw new Error(`Le code référence "${params.referenceCode}" est déjà utilisé par une autre formation`);
    }

    program.title = params.title.trim();
    program.referenceCode = normalizedRef;
    program.category = params.category.trim();
    program.summary = params.summary.trim();
    if (typeof params.active === 'boolean') {
      program.active = params.active;
    }
    program.updatedAt = new Date().toISOString();

    auditService.log({
      user: params.actor,
      action: 'PROGRAM_UPDATED',
      entityType: 'TRAINING_PROGRAM',
      entityId: program.id,
      details: `Modification du programme : [${program.referenceCode}] ${program.title}`,
    });

    return program;
  }

  public deleteProgram(programId: string, actor: User): boolean {
    const program = this.programs.get(programId);
    if (!program) throw new Error('Programme introuvable');

    // Rule: Cannot delete if sessions are linked (must maintain Qualiopi and accounting proof history)
    const linkedSessions = Array.from(this.sessions.values()).filter((s) => s.programId === programId);
    if (linkedSessions.length > 0) {
      throw new Error(
        `Suppression impossible : ${linkedSessions.length} session(s) de formation y sont rattachées (${linkedSessions.map((s) => s.referenceCode).join(', ')}). Pour préserver l’intégrité des pièces justificatives Qualiopi, vous pouvez désactiver la formation.`
      );
    }

    // Safe deletion: remove versions and program
    const versions = Array.from(this.programVersions.values()).filter((v) => v.programId === programId);
    for (const v of versions) {
      this.programVersions.delete(v.id);
    }
    this.programs.delete(programId);

    auditService.log({
      user: actor,
      action: 'PROGRAM_DELETED',
      entityType: 'TRAINING_PROGRAM',
      entityId: programId,
      details: `Suppression du programme [${program.referenceCode}] ${program.title} et de ses ${versions.length} version(s)`,
    });

    return true;
  }

  public toggleProgramActive(programId: string, actor: User): TrainingProgram {
    const program = this.programs.get(programId);
    if (!program) throw new Error('Programme introuvable');

    program.active = !program.active;
    program.updatedAt = new Date().toISOString();

    auditService.log({
      user: actor,
      action: program.active ? 'PROGRAM_ACTIVATED' : 'PROGRAM_DEACTIVATED',
      entityType: 'TRAINING_PROGRAM',
      entityId: program.id,
      details: `${program.active ? 'Activation' : 'Désactivation'} du programme [${program.referenceCode}] ${program.title}`,
    });

    return program;
  }

  public createProgramVersion(params: {
    programId: string;
    objectives: string[];
    prerequisites: string[];
    targetAudience: string[];
    evaluationMethods: string[];
    pedagogicalMeans: string[];
    modules: { title: string; duration: string; topics: string[] }[];
    durationHours: number;
    durationDays: number;
    priceHtCents: number;
    changelogNotes?: string;
    actor: User;
  }): ProgramVersion {
    const program = this.programs.get(params.programId);
    if (!program) throw new Error('Programme introuvable');

    const existingVersions = Array.from(this.programVersions.values()).filter((v) => v.programId === params.programId);
    const versionNumber = existingVersions.length + 1;

    const newVersion: ProgramVersion = {
      id: generateUUID(),
      programId: params.programId,
      versionNumber,
      changelogNotes: params.changelogNotes || `Version ${versionNumber}`,
      durationHours: params.durationHours,
      durationDays: params.durationDays,
      priceHtCents: Math.round(params.priceHtCents),
      objectives: params.objectives,
      prerequisites: params.prerequisites,
      targetAudience: params.targetAudience,
      evaluationMethods: params.evaluationMethods,
      pedagogicalMeans: params.pedagogicalMeans,
      modules: params.modules,
      createdAt: new Date().toISOString(),
    };

    this.programVersions.set(newVersion.id, newVersion);
    program.currentVersionId = newVersion.id;
    program.updatedAt = new Date().toISOString();

    auditService.log({
      user: params.actor,
      action: 'PROGRAM_VERSION_CREATED',
      entityType: 'PROGRAM_VERSION',
      entityId: newVersion.id,
      details: `Création version ${versionNumber} pour le programme ${program.title}`,
    });

    return newVersion;
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
    actor: User;
  }): ProgramVersion {
    const version = this.programVersions.get(params.versionId);
    if (!version) throw new Error('Version de programme introuvable');

    version.durationHours = params.durationHours;
    version.durationDays = params.durationDays;
    version.priceHtCents = Math.round(params.priceHtCents);
    version.objectives = params.objectives;
    version.prerequisites = params.prerequisites;
    version.targetAudience = params.targetAudience;
    if (params.evaluationMethods) version.evaluationMethods = params.evaluationMethods;
    if (params.pedagogicalMeans) version.pedagogicalMeans = params.pedagogicalMeans;
    version.modules = params.modules;
    if (params.changelogNotes) version.changelogNotes = params.changelogNotes;

    const program = this.programs.get(version.programId);
    if (program) {
      program.updatedAt = new Date().toISOString();
    }

    auditService.log({
      user: params.actor,
      action: 'PROGRAM_VERSION_UPDATED',
      entityType: 'PROGRAM_VERSION',
      entityId: version.id,
      details: `Modification de la version v${version.versionNumber} du programme ${program?.title || ''} (${version.modules.length} modules mis à jour)`,
    });

    return version;
  }

  // ==========================================
  // COMPANY & USER DIRECTORY MANAGEMENT
  // ==========================================

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
    actor: User;
  }): Company {
    const normalizedSiren = params.siren.trim().replace(/\s/g, '');
    const existing = Array.from(this.companies.values()).find(
      (c) => c.siren.replace(/\s/g, '') === normalizedSiren
    );
    if (existing) {
      throw new Error(`Une entreprise avec le numéro SIREN ${params.siren} existe déjà (${existing.name})`);
    }

    const company: Company = {
      id: `COMP-${generateUUID().substring(0, 8).toUpperCase()}`,
      name: params.name.trim(),
      siren: normalizedSiren,
      siret: params.siret?.trim().replace(/\s/g, ''),
      address: params.address.trim(),
      city: params.city.trim(),
      postalCode: params.postalCode.trim(),
      contactEmail: params.contactEmail.trim().toLowerCase(),
      contactPhone: params.contactPhone.trim(),
      opcoName: params.opcoName?.trim(),
      notes: params.notes?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.companies.set(company.id, company);

    auditService.log({
      user: params.actor,
      action: 'COMPANY_CREATED',
      entityType: 'COMPANY',
      entityId: company.id,
      details: `Création du compte entreprise : ${company.name} (SIREN: ${company.siren})`,
    });

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
    actor: User;
  }): Company {
    const company = this.companies.get(params.id);
    if (!company) throw new Error('Entreprise introuvable');

    company.name = params.name.trim();
    company.siren = params.siren.trim().replace(/\s/g, '');
    company.siret = params.siret?.trim().replace(/\s/g, '');
    company.address = params.address.trim();
    company.city = params.city.trim();
    company.postalCode = params.postalCode.trim();
    company.contactEmail = params.contactEmail.trim().toLowerCase();
    company.contactPhone = params.contactPhone.trim();
    company.opcoName = params.opcoName?.trim();
    company.notes = params.notes?.trim();
    company.updatedAt = new Date().toISOString();

    auditService.log({
      user: params.actor,
      action: 'COMPANY_UPDATED',
      entityType: 'COMPANY',
      entityId: company.id,
      details: `Mise à jour de l'entreprise : ${company.name}`,
    });

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
    actor: User;
  }): User {
    const normalizedEmail = params.email.trim().toLowerCase();
    const existing = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error(`Un utilisateur avec l'adresse e-mail "${params.email}" existe déjà`);
    }

    const company = this.companies.get(params.companyId);
    if (!company) throw new Error('Entreprise rattachée introuvable');

    const pass = hashPassword(params.password || 'TempPass2026!');
    const user: User = {
      id: `USR-${params.role === 'CLIENT_CONTACT' ? 'CLIENT' : 'BEN'}-${generateUUID().substring(0, 8).toUpperCase()}`,
      email: normalizedEmail,
      passwordHash: pass.hash,
      salt: pass.salt,
      role: params.role,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      companyId: params.companyId,
      phone: params.phone?.trim(),
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.set(user.id, user);

    auditService.log({
      user: params.actor,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: user.id,
      details: `Création utilisateur [${user.role}] ${user.firstName} ${user.lastName} (${user.email}) rattaché à ${company.name}`,
    });

    return user;
  }

  public createUser(params: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    companyId?: string;
    phone?: string;
    password?: string;
    actor: User;
  }): User {
    if (params.actor.role !== 'ADMIN') {
      throw new Error('Seul un administrateur peut créer des comptes utilisateurs avec ce rôle');
    }

    const normalizedEmail = params.email.trim().toLowerCase();
    const existing = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      throw new Error(`Un utilisateur avec l'adresse e-mail "${params.email}" existe déjà`);
    }

    let companyName = 'Aucune (interne)';
    if (params.role === 'CLIENT_CONTACT' || params.role === 'BENEFICIARY') {
      if (!params.companyId) {
        throw new Error('Une entreprise de rattachement est obligatoire pour ce type de compte');
      }
      const company = this.companies.get(params.companyId);
      if (!company) {
        throw new Error('Entreprise de rattachement introuvable');
      }
      companyName = company.name;
    }

    const defaultPassword =
      params.password?.trim() ||
      (params.role === 'ADMIN'
        ? 'AdminPass2026!'
        : params.role === 'TRAINER'
        ? 'TrainerPass2026!'
        : params.role === 'CLIENT_CONTACT'
        ? 'ClientPass2026!'
        : 'LearnerPass2026!');

    const pass = hashPassword(defaultPassword);
    const prefix =
      params.role === 'ADMIN'
        ? 'ADMIN'
        : params.role === 'TRAINER'
        ? 'TRAIN'
        : params.role === 'CLIENT_CONTACT'
        ? 'CLIENT'
        : 'BEN';

    const user: User = {
      id: `USR-${prefix}-${generateUUID().substring(0, 8).toUpperCase()}`,
      email: normalizedEmail,
      passwordHash: pass.hash,
      salt: pass.salt,
      role: params.role,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      companyId: params.companyId,
      phone: params.phone?.trim(),
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.set(user.id, user);

    auditService.log({
      user: params.actor,
      action: 'USER_CREATED_BY_ADMIN',
      entityType: 'USER',
      entityId: user.id,
      details: `Création de compte par l'administrateur : [${user.role}] ${user.firstName} ${user.lastName} (${user.email}), Entreprise : ${companyName}`,
    });

    return user;
  }

  public toggleUserActive(userId: string, actor: User): User {
    if (actor.role !== 'ADMIN') {
      throw new Error('Seul un administrateur peut modifier le statut d’un compte');
    }

    if (actor.id === userId) {
      throw new Error('Impossible de désactiver votre propre compte administrateur');
    }

    const user = this.users.get(userId);
    if (!user) throw new Error('Utilisateur introuvable');

    user.active = !user.active;
    user.updatedAt = new Date().toISOString();

    auditService.log({
      user: actor,
      action: user.active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: user.id,
      details: `Compte ${user.active ? 'activé' : 'suspendu'} : ${user.firstName} ${user.lastName} (${user.email})`,
    });

    return user;
  }

  public resetUserPassword(userId: string, newPass: string, actor: User): void {
    if (actor.role !== 'ADMIN') {
      throw new Error('Seul un administrateur peut réinitialiser le mot de passe d’un utilisateur');
    }

    const user = this.users.get(userId);
    if (!user) throw new Error('Utilisateur introuvable');

    if (!newPass || newPass.trim().length < 8) {
      throw new Error('Le mot de passe doit comporter au moins 8 caractères');
    }

    const hashed = hashPassword(newPass.trim());
    user.passwordHash = hashed.hash;
    user.salt = hashed.salt;
    user.updatedAt = new Date().toISOString();

    auditService.log({
      user: actor,
      action: 'USER_PASSWORD_RESET',
      entityType: 'USER',
      entityId: user.id,
      details: `Mot de passe réinitialisé par l'administrateur pour : ${user.email}`,
    });
  }

  /**
   * Public Self-Registration for Client Contacts (Enterprise) or Trainees
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
    companyId?: string; // If registering as beneficiary for an existing company
  }): { user: SafeUser; token: string } {
    const normalizedEmail = params.email.trim().toLowerCase();
    const existing = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      throw new Error(`Un compte avec l'adresse e-mail "${params.email}" existe déjà. Veuillez vous connecter.`);
    }

    if (!params.password || params.password.length < 8) {
      throw new Error('Le mot de passe doit comporter au moins 8 caractères');
    }

    let targetCompanyId = params.companyId;

    if (params.accountType === 'COMPANY_CLIENT') {
      if (!params.companyName?.trim()) {
        throw new Error('La raison sociale de l’entreprise est obligatoire');
      }
      if (!params.siren?.trim()) {
        throw new Error('Le numéro SIREN de l’entreprise est obligatoire');
      }

      const cleanSiren = params.siren.trim().replace(/\s/g, '');
      const existingComp = Array.from(this.companies.values()).find(
        (c) => c.siren.replace(/\s/g, '') === cleanSiren
      );
      if (existingComp) {
        throw new Error(`Une entreprise avec le SIREN ${params.siren} est déjà enregistrée. Veuillez contacter votre administrateur ou rattacher votre compte.`);
      }

      const company: Company = {
        id: `COMP-${generateUUID().substring(0, 8).toUpperCase()}`,
        name: params.companyName.trim(),
        siren: cleanSiren,
        siret: params.siret?.trim().replace(/\s/g, ''),
        address: params.address?.trim() || 'Adresse principale',
        city: params.city?.trim() || 'Paris',
        postalCode: params.postalCode?.trim() || '75001',
        contactEmail: normalizedEmail,
        contactPhone: params.phone?.trim() || '01 00 00 00 00',
        opcoName: params.opcoName?.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.companies.set(company.id, company);
      targetCompanyId = company.id;
    } else {
      // BENEFICIARY
      if (!targetCompanyId) {
        throw new Error('Veuillez sélectionner l’entreprise cliente à laquelle vous appartenez');
      }
      if (!this.companies.has(targetCompanyId)) {
        throw new Error('L’entreprise sélectionnée est introuvable');
      }
    }

    const pass = hashPassword(params.password);
    const role: UserRole = params.accountType === 'COMPANY_CLIENT' ? 'CLIENT_CONTACT' : 'BENEFICIARY';

    const newUser: User = {
      id: `USR-${role === 'CLIENT_CONTACT' ? 'CLIENT' : 'BEN'}-${generateUUID().substring(0, 8).toUpperCase()}`,
      email: normalizedEmail,
      passwordHash: pass.hash,
      salt: pass.salt,
      role,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      companyId: targetCompanyId,
      phone: params.phone?.trim(),
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.set(newUser.id, newUser);

    // Generate token
    const token = generateSecureToken(32);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    this.activeSessions.set(token, { userId: newUser.id, expiresAt });

    auditService.log({
      user: newUser,
      action: 'USER_SELF_REGISTERED',
      entityType: 'USER',
      entityId: newUser.id,
      details: `Inscription autonome [${newUser.role}] de ${newUser.firstName} ${newUser.lastName} (${newUser.email})`,
    });

    return {
      user: this.toSafeUser(newUser),
      token,
    };
  }

  // ==========================================
  // SESSION & ENROLLMENT MANAGEMENT
  // ==========================================

  public createSession(params: {
    referenceCode: string;
    programId: string;
    programVersionId?: string;
    title: string;
    modality: 'PRESENTIEL' | 'DISTANCIEL' | 'HYBRIDE';
    startDate: string;
    endDate: string;
    location: string;
    maxParticipants: number;
    trainerId: string;
    actor: User;
  }): TrainingSession {
    const program = this.programs.get(params.programId);
    if (!program) throw new Error('Programme introuvable');

    const versionId = params.programVersionId || program.currentVersionId;
    const version = this.programVersions.get(versionId);
    if (!version) throw new Error('Version de programme introuvable');

    const session: TrainingSession = {
      id: generateUUID(),
      referenceCode: params.referenceCode,
      programId: params.programId,
      programVersionId: version.id, // Freezes the exact version used
      title: params.title,
      modality: params.modality,
      status: 'CONFIRMED',
      startDate: params.startDate,
      endDate: params.endDate,
      location: params.location,
      maxParticipants: params.maxParticipants,
      trainerId: params.trainerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);

    auditService.log({
      user: params.actor,
      action: 'SESSION_CREATED',
      entityType: 'TRAINING_SESSION',
      entityId: session.id,
      details: `Création de session: ${session.referenceCode} - ${session.title}`,
    });

    return session;
  }

  public enrollBeneficiary(params: {
    sessionId: string;
    beneficiaryId: string;
    companyId: string;
    actor: User;
  }): Enrollment {
    const session = this.sessions.get(params.sessionId);
    if (!session) throw new Error('Session introuvable');

    const beneficiary = this.users.get(params.beneficiaryId);
    if (!beneficiary) throw new Error('Bénéficiaire introuvable');

    const existingEnrollment = Array.from(this.enrollments.values()).find(
      (e) => e.sessionId === params.sessionId && e.beneficiaryId === params.beneficiaryId && e.status !== 'CANCELLED'
    );
    if (existingEnrollment) {
      throw new Error('Le bénéficiaire est déjà inscrit à cette session');
    }

    const currentActiveCount = Array.from(this.enrollments.values()).filter(
      (e) => e.sessionId === params.sessionId && e.status !== 'CANCELLED'
    ).length;

    if (currentActiveCount >= session.maxParticipants) {
      throw new Error(`Capacité maximale atteinte (${session.maxParticipants} participants)`);
    }

    const enrollment: Enrollment = {
      id: generateUUID(),
      sessionId: params.sessionId,
      beneficiaryId: params.beneficiaryId,
      companyId: params.companyId,
      status: 'REGISTERED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.enrollments.set(enrollment.id, enrollment);

    auditService.log({
      user: params.actor,
      action: 'ENROLLMENT_CREATED',
      entityType: 'ENROLLMENT',
      entityId: enrollment.id,
      details: `Inscription de ${beneficiary.firstName} ${beneficiary.lastName} à la session ${session.referenceCode}`,
    });

    return enrollment;
  }

  // ==========================================
  // ATTENDANCE MANAGEMENT
  // ==========================================

  public markAttendance(params: {
    sessionId: string;
    beneficiaryId: string;
    date: string;
    period: 'MORNING' | 'AFTERNOON';
    present: boolean;
    justification?: string;
    actor: User;
  }): AttendanceRecord {
    const existing = Array.from(this.attendance.values()).find(
      (a) => a.sessionId === params.sessionId && a.beneficiaryId === params.beneficiaryId && a.date === params.date && a.period === params.period
    );

    const record: AttendanceRecord = {
      id: existing ? existing.id : generateUUID(),
      sessionId: params.sessionId,
      beneficiaryId: params.beneficiaryId,
      date: params.date,
      period: params.period,
      present: params.present,
      justification: params.justification,
      signedAt: params.present ? new Date().toISOString() : undefined,
      signedByName: `${params.actor.firstName} ${params.actor.lastName}`,
    };

    this.attendance.set(record.id, record);

    auditService.log({
      user: params.actor,
      action: 'ATTENDANCE_RECORDED',
      entityType: 'ATTENDANCE_RECORD',
      entityId: record.id,
      details: `Émargement ${params.date} (${params.period}): ${params.present ? 'PRÉSENT' : 'ABSENT'}`,
    });

    return record;
  }

  // ==========================================
  // FINANCIAL INTEGRITY (Invoices & Payments)
  // ==========================================

  public createInvoice(params: {
    invoiceNumber: string;
    companyId: string;
    sessionId?: string;
    issueDate: string;
    dueDate: string;
    tvaRateBps: number; // e.g. 2000 for 20% or 0
    items: { description: string; quantity: number; unitPriceHtCents: number }[];
    actor: User;
  }): Invoice {
    const company = this.companies.get(params.companyId);
    if (!company) throw new Error('Entreprise introuvable');

    let totalHtCents = 0;
    const computedItems: InvoiceItem[] = params.items.map((item) => {
      const lineHtCents = Math.round(item.quantity * item.unitPriceHtCents);
      totalHtCents += lineHtCents;
      return {
        id: generateUUID(),
        description: item.description,
        quantity: item.quantity,
        unitPriceHtCents: Math.round(item.unitPriceHtCents),
        totalHtCents: lineHtCents,
      };
    });

    const totalTvaCents = Math.round((totalHtCents * params.tvaRateBps) / 10000);
    const totalTtcCents = totalHtCents + totalTvaCents;

    const invoice: Invoice = {
      id: generateUUID(),
      invoiceNumber: params.invoiceNumber,
      companyId: params.companyId,
      sessionId: params.sessionId,
      status: 'ISSUED',
      issueDate: params.issueDate,
      dueDate: params.dueDate,
      totalHtCents,
      tvaRateBps: params.tvaRateBps,
      totalTvaCents,
      totalTtcCents,
      paidCents: 0,
      currency: 'EUR',
      items: computedItems,
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.invoices.set(invoice.id, invoice);

    auditService.log({
      user: params.actor,
      action: 'INVOICE_CREATED',
      entityType: 'INVOICE',
      entityId: invoice.id,
      details: `Émission facture ${invoice.invoiceNumber} d'un montant de ${(totalTtcCents / 100).toFixed(2)} EUR pour ${company.name}`,
    });

    return invoice;
  }

  public recordPayment(params: {
    invoiceId: string;
    amountCents: number;
    method: 'VIREMENT' | 'CB' | 'CHEQUE';
    reference: string;
    date: string;
    actor: User;
  }): InvoicePayment {
    const invoice = this.invoices.get(params.invoiceId);
    if (!invoice) throw new Error('Facture introuvable');

    if (params.amountCents <= 0) {
      throw new Error('Le montant du paiement doit être strictement supérieur à zéro');
    }

    const remainingCents = invoice.totalTtcCents - invoice.paidCents;
    if (params.amountCents > remainingCents) {
      throw new Error(
        `Le montant (${(params.amountCents / 100).toFixed(2)} EUR) dépasse le solde restant (${(remainingCents / 100).toFixed(2)} EUR)`
      );
    }

    const payment: InvoicePayment = {
      id: generateUUID(),
      amountCents: Math.round(params.amountCents),
      date: params.date,
      method: params.method,
      reference: params.reference,
      recordedByUserId: params.actor.id,
    };

    invoice.payments.push(payment);
    invoice.paidCents += payment.amountCents;
    invoice.updatedAt = new Date().toISOString();

    if (invoice.paidCents >= invoice.totalTtcCents) {
      invoice.status = 'PAID';
    } else {
      invoice.status = 'PARTIALLY_PAID';
    }

    auditService.log({
      user: params.actor,
      action: 'PAYMENT_RECORDED',
      entityType: 'INVOICE_PAYMENT',
      entityId: payment.id,
      details: `Paiement de ${(payment.amountCents / 100).toFixed(2)} EUR reçu (${payment.method}) pour facture ${invoice.invoiceNumber}. Nouveau solde: ${((invoice.totalTtcCents - invoice.paidCents) / 100).toFixed(2)} EUR`,
    });

    return payment;
  }

  // ==========================================
  // DOCUMENT GENERATION & FINGERPRINTING
  // ==========================================

  public generateDocument(params: {
    referenceCode: string;
    type: DocumentRecord['type'];
    title: string;
    relatedEntityType: DocumentRecord['relatedEntityType'];
    relatedEntityId: string;
    companyId?: string;
    beneficiaryId?: string;
    contentSnapshot: Record<string, any>;
    actor: User;
  }): DocumentRecord {
    // Generate immutable SHA-256 fingerprint
    const sha256Fingerprint = computeSha256Fingerprint(params.contentSnapshot);

    const doc: DocumentRecord = {
      id: generateUUID(),
      referenceCode: params.referenceCode,
      type: params.type,
      title: params.title,
      status: 'GENERATED',
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
      companyId: params.companyId,
      beneficiaryId: params.beneficiaryId,
      sha256Fingerprint,
      contentSnapshot: params.contentSnapshot,
      createdAt: new Date().toISOString(),
    };

    this.documents.set(doc.id, doc);

    auditService.log({
      user: params.actor,
      action: 'DOCUMENT_GENERATED',
      entityType: 'DOCUMENT_RECORD',
      entityId: doc.id,
      details: `Génération document [${doc.type}] réf ${doc.referenceCode} - SHA-256: ${sha256Fingerprint.substring(0, 16)}...`,
    });

    return doc;
  }

  // ==========================================
  // SEED DEFAULT DEMO DATA
  // ==========================================

  private seedDefaultData(): void {
    // 1. Matt Konnect Administrator
    const adminPass = hashPassword('AdminPass2026!');
    const adminUser: User = {
      id: 'USR-ADMIN-01',
      email: 'admin@mattkonnect.com',
      passwordHash: adminPass.hash,
      salt: adminPass.salt,
      role: 'ADMIN',
      firstName: 'Marc',
      lastName: 'Dupont',
      phone: '01 42 68 55 00',
      active: true,
      createdAt: '2026-01-01T08:00:00Z',
      updatedAt: '2026-01-01T08:00:00Z',
    };
    this.users.set(adminUser.id, adminUser);

    // 2. Formateur certifié
    const trainerPass = hashPassword('TrainerPass2026!');
    const trainerUser: User = {
      id: 'USR-TRAIN-01',
      email: 'sophie.formateur@mattkonnect.com',
      passwordHash: trainerPass.hash,
      salt: trainerPass.salt,
      role: 'TRAINER',
      firstName: 'Sophie',
      lastName: 'Laurent',
      phone: '06 12 34 56 78',
      active: true,
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-01-15T09:00:00Z',
    };
    this.users.set(trainerUser.id, trainerUser);

    // 3. Entreprise A: Acme Industries
    const companyA: Company = {
      id: 'COMP-ACME',
      name: 'Acme Industries SAS',
      siren: '512345678',
      siret: '51234567800024',
      address: '14 Avenue de la République',
      city: 'Paris',
      postalCode: '75011',
      contactEmail: 'rh@acme-industries.fr',
      contactPhone: '01 40 20 30 40',
      opcoName: 'OPCO Atlas',
      createdAt: '2026-02-01T10:00:00Z',
      updatedAt: '2026-02-01T10:00:00Z',
    };
    this.companies.set(companyA.id, companyA);

    // Contact Client Entreprise A
    const clientPassA = hashPassword('ClientPass2026!');
    const clientContactA: User = {
      id: 'USR-CLIENT-ACME',
      email: 'rh@acme-industries.fr',
      passwordHash: clientPassA.hash,
      salt: clientPassA.salt,
      role: 'CLIENT_CONTACT',
      firstName: 'Claire',
      lastName: 'Dubois',
      companyId: companyA.id,
      phone: '01 40 20 30 41',
      active: true,
      createdAt: '2026-02-01T10:30:00Z',
      updatedAt: '2026-02-01T10:30:00Z',
    };
    this.users.set(clientContactA.id, clientContactA);

    // Bénéficiaire Entreprise A (Salarié formé)
    const benPassA = hashPassword('LearnerPass2026!');
    const beneficiaryA: User = {
      id: 'USR-BEN-LUCAS',
      email: 'lucas.martin@acme-industries.fr',
      passwordHash: benPassA.hash,
      salt: benPassA.salt,
      role: 'BENEFICIARY',
      firstName: 'Lucas',
      lastName: 'Martin',
      companyId: companyA.id,
      phone: '06 98 76 54 32',
      active: true,
      createdAt: '2026-02-05T11:00:00Z',
      updatedAt: '2026-02-05T11:00:00Z',
    };
    this.users.set(beneficiaryA.id, beneficiaryA);

    // 4. Entreprise B: Beta Solutions (Entreprise concurrente / distincte)
    const companyB: Company = {
      id: 'COMP-BETA',
      name: 'Beta Solutions Numériques',
      siren: '823456789',
      siret: '82345678900018',
      address: '22 Boulevard Victor Hugo',
      city: 'Lyon',
      postalCode: '69002',
      contactEmail: 'contact@beta-solutions.fr',
      contactPhone: '04 78 00 11 22',
      opcoName: 'AKTO',
      createdAt: '2026-02-10T09:00:00Z',
      updatedAt: '2026-02-10T09:00:00Z',
    };
    this.companies.set(companyB.id, companyB);

    const clientPassB = hashPassword('ClientPass2026!');
    const clientContactB: User = {
      id: 'USR-CLIENT-BETA',
      email: 'direction@beta-solutions.fr',
      passwordHash: clientPassB.hash,
      salt: clientPassB.salt,
      role: 'CLIENT_CONTACT',
      firstName: 'Marc',
      lastName: 'Lemoine',
      companyId: companyB.id,
      phone: '04 78 00 11 25',
      active: true,
      createdAt: '2026-02-10T09:30:00Z',
      updatedAt: '2026-02-10T09:30:00Z',
    };
    this.users.set(clientContactB.id, clientContactB);

    // 5. Catalogue de Formations Matt Konnect
    const program1: TrainingProgram = {
      id: 'PROG-MK-CYBER',
      title: 'Sécurité Applicative et Défense OWASP en Entreprise',
      referenceCode: 'MK-SEC-01',
      category: 'Cybersécurité & Développement',
      summary: 'Maîtriser les principes d’architecture sécurisée, d’isolation des données et les audits de code OWASP Top 10.',
      currentVersionId: 'VER-MK-CYBER-V1',
      active: true,
      createdAt: '2026-01-10T09:00:00Z',
      updatedAt: '2026-01-10T09:00:00Z',
    };
    this.programs.set(program1.id, program1);

    const version1: ProgramVersion = {
      id: 'VER-MK-CYBER-V1',
      programId: program1.id,
      versionNumber: 1,
      changelogNotes: 'Version initiale conforme exigences Qualiopi Référentiel National Qualité',
      durationHours: 14,
      durationDays: 2,
      priceHtCents: 180000, // 1 800.00 EUR HT
      objectives: [
        'Identifier et classifier les 10 risques critiques OWASP',
        'Concevoir des architectures d’authentification et de contrôle d’accès étanches (RBAC)',
        'Mettre en œuvre des tests de sécurité négatifs et des vérifications automatisées',
        'Assurer la traçabilité et la journalisation immuable des événements sensibles',
      ],
      prerequisites: ['Connaissances en programmation web et notions de base HTTP/API'],
      targetAudience: ['Développeurs web', 'Architectes logiciels', 'Responsables techniques / Lead Tech'],
      evaluationMethods: ['QCM initial de positionnement', 'Exercices pratiques sur environnement de test', 'Évaluation sommative d’audit'],
      pedagogicalMeans: ['Supports de cours numériques', 'Ateliers pratiques guidés', 'Accès à la plateforme MK Formation'],
      modules: [
        {
          title: 'Module 1 : Fondamentaux de la sécurité et modélisation des menaces',
          duration: '3h30',
          topics: ['Principes de défense en profondeur', 'Cycle de vie du développement sécurisé', 'Cartographie des flux'],
        },
        {
          title: 'Module 2 : Authentification, sessions et contrôle d’accès strict',
          duration: '3h30',
          topics: ['Hachage scrypt/Argon2', 'Attaques par timing et canaux auxiliaires', 'Policies deny-by-default et isolation IDOR'],
        },
        {
          title: 'Module 3 : Protection des données, cryptographie et validation',
          duration: '3h30',
          topics: ['Validation stricte des entrées', 'Prévention des injections', 'Empreintes SHA-256 et documents immuables'],
        },
        {
          title: 'Module 4 : Audit, conformité Qualiopi et automatisation des tests',
          duration: '3h30',
          topics: ['Journalisation d’audit', 'Tests de sécurité négatifs automatisés', 'Traçabilité des preuves réglementaires'],
        },
      ],
      createdAt: '2026-01-10T09:30:00Z',
    };
    this.programVersions.set(version1.id, version1);

    // 6. Session de formation active
    const session1: TrainingSession = {
      id: 'SESS-2026-01',
      referenceCode: 'SESS-2026-001',
      programId: program1.id,
      programVersionId: version1.id,
      title: 'Session Cybersécurité & OWASP — Promotion Mars 2026',
      modality: 'HYBRIDE',
      status: 'CONFIRMED',
      startDate: '2026-03-12',
      endDate: '2026-03-13',
      location: 'Campus Matt Konnect, 12 rue de la Paix, 75002 Paris / Classe virtuelle Teams',
      maxParticipants: 8,
      trainerId: trainerUser.id,
      createdAt: '2026-02-01T14:00:00Z',
      updatedAt: '2026-02-01T14:00:00Z',
    };
    this.sessions.set(session1.id, session1);

    // Inscription du bénéficiaire Acme
    const enrollment1: Enrollment = {
      id: 'ENR-2026-01',
      sessionId: session1.id,
      beneficiaryId: beneficiaryA.id,
      companyId: companyA.id,
      status: 'CONVOKED',
      convocationSentAt: '2026-02-15T10:00:00Z',
      createdAt: '2026-02-05T14:30:00Z',
      updatedAt: '2026-02-15T10:00:00Z',
    };
    this.enrollments.set(enrollment1.id, enrollment1);

    // Émargements Jour 1
    const att1: AttendanceRecord = {
      id: 'ATT-2026-01-M',
      sessionId: session1.id,
      beneficiaryId: beneficiaryA.id,
      date: '2026-03-12',
      period: 'MORNING',
      present: true,
      signedAt: '2026-03-12T09:05:00Z',
      signedByName: 'Sophie Laurent',
    };
    this.attendance.set(att1.id, att1);

    // 7. Documents générés avec empreinte SHA-256
    const convocationSnapshot = {
      reference: 'DOC-CNV-2026-001',
      beneficiaryName: 'Lucas Martin',
      companyName: 'Acme Industries SAS',
      trainingTitle: 'Sécurité Applicative et Défense OWASP en Entreprise',
      dates: '12 & 13 Mars 2026',
      location: session1.location,
      organizer: 'Matt Konnect',
    };
    const docConvocation: DocumentRecord = {
      id: 'DOC-CONV-01',
      referenceCode: 'DOC-CNV-2026-001',
      type: 'CONVOCATION',
      title: 'Convocation de formation — Lucas Martin',
      status: 'SENT',
      relatedEntityType: 'ENROLLMENT',
      relatedEntityId: enrollment1.id,
      companyId: companyA.id,
      beneficiaryId: beneficiaryA.id,
      sha256Fingerprint: computeSha256Fingerprint(convocationSnapshot),
      contentSnapshot: convocationSnapshot,
      createdAt: '2026-02-15T10:00:00Z',
    };
    this.documents.set(docConvocation.id, docConvocation);

    // 8. Facturation & paiements
    const invoice1: Invoice = {
      id: 'INV-2026-001',
      invoiceNumber: 'FAC-2026-001',
      companyId: companyA.id,
      sessionId: session1.id,
      status: 'PARTIALLY_PAID',
      issueDate: '2026-02-20',
      dueDate: '2026-03-22',
      totalHtCents: 180000, // 1 800.00 EUR HT
      tvaRateBps: 0, // Exonération de TVA au titre de la formation professionnelle continue (Art. 261-4-4a du CGI)
      totalTvaCents: 0,
      totalTtcCents: 180000,
      paidCents: 90000, // Acompte de 900.00 EUR
      currency: 'EUR',
      items: [
        {
          id: 'ITEM-01',
          description: 'Formation Sécurité Applicative et Défense OWASP (14h) — Participant : Lucas Martin',
          quantity: 1,
          unitPriceHtCents: 180000,
          totalHtCents: 180000,
        },
      ],
      payments: [
        {
          id: 'PAY-01',
          amountCents: 90000,
          date: '2026-02-25',
          method: 'VIREMENT',
          reference: 'VIR-ACME-ACOMPTE-001',
          recordedByUserId: adminUser.id,
        },
      ],
      createdAt: '2026-02-20T10:00:00Z',
      updatedAt: '2026-02-25T11:00:00Z',
    };
    this.invoices.set(invoice1.id, invoice1);

    // 9. Critères Qualiopi essentiels
    const qualiopiIndicators: QualiopiIndicator[] = [
      {
        id: 'QUAL-IND-01',
        criteriaNumber: 1,
        indicatorNumber: 1,
        title: 'Information du public sur les prestations',
        requirement: 'Diffuser une information accessible sur les prérequis, objectifs, durée, tarifs, modalités et délais d’accès.',
        status: 'CONFORME',
        evidenceDocumentIds: [docConvocation.id],
        notes: 'Fiches programmes complètes avec versionnage et objectifs pédagogiques vérifiés.',
        lastAuditedAt: '2026-02-01T10:00:00Z',
      },
      {
        id: 'QUAL-IND-02',
        criteriaNumber: 1,
        indicatorNumber: 2,
        title: 'Indicateurs de résultats',
        requirement: 'Diffuser des indicateurs de résultats adaptés à la nature des prestations.',
        status: 'CONFORME',
        evidenceDocumentIds: [],
        notes: 'Taux de satisfaction global de 98% sur l’année précédente.',
        lastAuditedAt: '2026-02-01T10:00:00Z',
      },
      {
        id: 'QUAL-IND-08',
        criteriaNumber: 2,
        indicatorNumber: 8,
        title: 'Positionnement et évaluation des acquis à l’entrée',
        requirement: 'Déterminer les objectifs de la prestation et adapter le dispositif aux bénéficiaires.',
        status: 'CONFORME',
        evidenceDocumentIds: [],
        notes: 'Questionnaire de prérequis envoyé avant confirmation de chaque inscription.',
        lastAuditedAt: '2026-02-15T11:00:00Z',
      },
      {
        id: 'QUAL-IND-11',
        criteriaNumber: 3,
        indicatorNumber: 11,
        title: 'Évaluation de l’atteinte des objectifs',
        requirement: 'Évaluer l’atteinte par les bénéficiaires des objectifs de la prestation.',
        status: 'EN_COURS',
        evidenceDocumentIds: [],
        notes: 'Évaluation sommative en cours pour la session SESS-2026-001.',
        lastAuditedAt: '2026-02-20T09:00:00Z',
      },
      {
        id: 'QUAL-IND-19',
        criteriaNumber: 4,
        indicatorNumber: 19,
        title: 'Ressources pédagogiques adaptées',
        requirement: 'Mettre à disposition des ressources pédagogiques et un encadrement adapté.',
        status: 'CONFORME',
        evidenceDocumentIds: [],
        notes: 'Supports numériques et environnements de travaux pratiques vérifiés par Sophie Laurent.',
        lastAuditedAt: '2026-02-15T14:00:00Z',
      },
      {
        id: 'QUAL-IND-30',
        criteriaNumber: 7,
        indicatorNumber: 30,
        title: 'Recueil des appréciations des parties prenantes',
        requirement: 'Recueillir les appréciations des bénéficiaires, financeurs, formateurs et entreprises.',
        status: 'CONFORME',
        evidenceDocumentIds: [],
        notes: 'Questionnaires de satisfaction intégrés à la fin de chaque session.',
        lastAuditedAt: '2026-02-25T16:00:00Z',
      },
    ];

    for (const ind of qualiopiIndicators) {
      this.qualiopi.set(ind.id, ind);
    }
  }
}

export const db = new DatabaseStore();
