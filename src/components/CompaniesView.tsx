/**
 * MK Formation — Companies & Trainees Management View
 * Features:
 * - Admin CRUD for client companies (creation, edition, duplicate SIREN check)
 * - Trainee & client contact registration (role selection, contact details)
 * - Direct 1-Click Session Enrollment from company profile
 * - Automatic generation of official Training Convention & Convocation with SHA-256 fingerprint
 * - Strict client data isolation & RGPD separation
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import { canAccessCompany, canManageCompanies } from '../server/policy.ts';
import { Company, User, TrainingSession, DocumentRecord } from '../types/index.ts';
import {
  Building2,
  Users,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Plus,
  Edit2,
  X,
  AlertCircle,
  UserPlus,
  Check,
  Search,
  Briefcase,
  FileText,
  Calendar,
  GraduationCap,
  ExternalLink,
  Printer,
  ChevronRight,
  FileCheck2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface CompaniesViewProps {
  onOpenDocPreview?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  onOpenDocPreview,
  onNavigateTab,
}) => {
  const user = appState.getCurrentUser();
  const allCompanies = appState.getCompanies();
  const allUsers = appState.getAllUsers();
  const allEnrollments = appState.getEnrollments();
  const allSessions = appState.getSessions();
  const allDocuments = appState.getDocuments();
  const isManager = canManageCompanies(user);

  // Filter companies according to server-side policy
  const accessibleCompanies = allCompanies.filter((c) => canAccessCompany(user, c.id));

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    accessibleCompanies[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'sessions' | 'documents'>('users');

  // Modals state
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Enrollment form state
  const [enrollBeneficiaryId, setEnrollBeneficiaryId] = useState('');
  const [enrollSessionId, setEnrollSessionId] = useState('');
  const [autoGenConvocation, setAutoGenConvocation] = useState(true);
  const [autoGenConvention, setAutoGenConvention] = useState(true);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Result notice after enrollment with direct document links
  const [enrollSuccessNotice, setEnrollSuccessNotice] = useState<{
    beneficiaryName: string;
    sessionTitle: string;
    convocationDocId?: string;
    conventionDocId?: string;
  } | null>(null);

  // Notifications
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  // Form states for Company (Create / Edit)
  const [companyForm, setCompanyForm] = useState({
    name: '',
    siren: '',
    siret: '',
    address: '',
    city: '',
    postalCode: '',
    contactEmail: '',
    contactPhone: '',
    opcoName: 'OPCO Atlas',
    notes: '',
  });

  // Form states for New User / Contact
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'BENEFICIARY' as 'CLIENT_CONTACT' | 'BENEFICIARY',
    password: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  const activeCompany =
    accessibleCompanies.find((c) => c.id === selectedCompanyId) || accessibleCompanies[0];

  const companyUsers = activeCompany
    ? allUsers.filter((u) => u.companyId === activeCompany.id)
    : [];

  const companyEnrollments = activeCompany
    ? allEnrollments.filter((e) => e.companyId === activeCompany.id && e.status !== 'CANCELLED')
    : [];

  // Distinct sessions where this company has enrollments
  const companySessionIds = Array.from(new Set(companyEnrollments.map((e) => e.sessionId)));
  const companySessions = allSessions.filter((s) => companySessionIds.includes(s.id));

  // Documents generated for this company
  const companyDocuments = activeCompany
    ? allDocuments.filter((d) => d.companyId === activeCompany.id)
    : [];

  const filteredCompanies = accessibleCompanies.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.siren.includes(q) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  const openCreateCompany = () => {
    setFormError(null);
    setCompanyForm({
      name: '',
      siren: '',
      siret: '',
      address: '',
      city: '',
      postalCode: '',
      contactEmail: '',
      contactPhone: '',
      opcoName: 'OPCO Atlas',
      notes: '',
    });
    setShowCreateCompanyModal(true);
  };

  const openEditCompany = (company: Company) => {
    setFormError(null);
    setCompanyForm({
      name: company.name,
      siren: company.siren,
      siret: company.siret || '',
      address: company.address,
      city: company.city,
      postalCode: company.postalCode,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      opcoName: company.opcoName || 'OPCO Atlas',
      notes: company.notes || '',
    });
    setShowEditCompanyModal(true);
  };

  const openAddUser = () => {
    setFormError(null);
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'BENEFICIARY',
      password: '',
    });
    setShowAddUserModal(true);
  };

  const openEnrollModal = (preselectedBeneficiaryId?: string) => {
    setEnrollError(null);
    setEnrollSuccessNotice(null);

    // Filter beneficiaries belonging to active company
    const candidates = companyUsers;
    const targetBenId =
      preselectedBeneficiaryId ||
      candidates.find((u) => u.role === 'BENEFICIARY')?.id ||
      candidates[0]?.id ||
      '';

    setEnrollBeneficiaryId(targetBenId);

    // Pick first open session
    const openSessions = allSessions.filter((s) => s.status !== 'CANCELLED');
    setEnrollSessionId(openSessions[0]?.id || '');
    setAutoGenConvocation(true);
    setAutoGenConvention(true);

    setShowEnrollModal(true);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!companyForm.name.trim()) {
      setFormError('La raison sociale de l’entreprise est obligatoire.');
      return;
    }
    const cleanSiren = companyForm.siren.trim().replace(/\s/g, '');
    if (cleanSiren.length < 9) {
      setFormError('Le numéro SIREN doit comporter au minimum 9 chiffres.');
      return;
    }
    if (!companyForm.address.trim() || !companyForm.city.trim() || !companyForm.postalCode.trim()) {
      setFormError('L’adresse, le code postal et la ville sont obligatoires.');
      return;
    }
    if (!companyForm.contactEmail.trim()) {
      setFormError('L’adresse email de contact est obligatoire.');
      return;
    }
    if (!companyForm.contactPhone.trim()) {
      setFormError('Le numéro de téléphone est obligatoire.');
      return;
    }

    try {
      if (showEditCompanyModal && activeCompany) {
        const updated = appState.updateCompany({
          id: activeCompany.id,
          name: companyForm.name,
          siren: cleanSiren,
          siret: companyForm.siret,
          address: companyForm.address,
          city: companyForm.city,
          postalCode: companyForm.postalCode,
          contactEmail: companyForm.contactEmail,
          contactPhone: companyForm.contactPhone,
          opcoName: companyForm.opcoName,
          notes: companyForm.notes,
        });
        setStatusMsg({
          type: 'success',
          text: `Compte entreprise "${updated.name}" mis à jour avec succès.`,
        });
        setShowEditCompanyModal(false);
      } else {
        const created = appState.createCompany({
          name: companyForm.name,
          siren: cleanSiren,
          siret: companyForm.siret,
          address: companyForm.address,
          city: companyForm.city,
          postalCode: companyForm.postalCode,
          contactEmail: companyForm.contactEmail,
          contactPhone: companyForm.contactPhone,
          opcoName: companyForm.opcoName,
          notes: companyForm.notes,
        });
        setSelectedCompanyId(created.id);
        setStatusMsg({
          type: 'success',
          text: `Entreprise "${created.name}" enregistrée avec succès. Vous pouvez maintenant y rattacher des contacts et bénéficiaires.`,
        });
        setShowCreateCompanyModal(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'Une erreur est survenue lors de l’enregistrement de l’entreprise.');
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!activeCompany) {
      setFormError('Aucune entreprise sélectionnée.');
      return;
    }

    if (!userForm.firstName.trim() || !userForm.lastName.trim()) {
      setFormError('Le prénom et le nom sont obligatoires.');
      return;
    }
    if (!userForm.email.trim() || !userForm.email.includes('@')) {
      setFormError('Une adresse email valide est obligatoire.');
      return;
    }

    try {
      const newUser = appState.createCompanyUser({
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        email: userForm.email,
        phone: userForm.phone || undefined,
        role: userForm.role,
        companyId: activeCompany.id,
        password: userForm.password.trim() || undefined,
      });

      setStatusMsg({
        type: 'success',
        text: `Collaborateur ${newUser.firstName} ${newUser.lastName} ajouté avec succès au compte ${activeCompany.name}.`,
      });
      setShowAddUserModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la création de l’utilisateur.');
    }
  };

  const handleEnrollBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError(null);

    if (!activeCompany) {
      setEnrollError('Aucune entreprise sélectionnée.');
      return;
    }
    if (!enrollBeneficiaryId) {
      setEnrollError('Veuillez sélectionner le salarié à inscrire.');
      return;
    }
    if (!enrollSessionId) {
      setEnrollError('Veuillez sélectionner la session de formation visée.');
      return;
    }

    const session = allSessions.find((s) => s.id === enrollSessionId);
    if (!session) {
      setEnrollError('Session introuvable.');
      return;
    }

    const beneficiary = companyUsers.find((u) => u.id === enrollBeneficiaryId);
    if (!beneficiary) {
      setEnrollError('Salarié introuvable dans cette entreprise.');
      return;
    }

    // Capacity verification
    const activeSessionEnrollments = allEnrollments.filter(
      (enr) => enr.sessionId === session.id && enr.status !== 'CANCELLED'
    );
    if (activeSessionEnrollments.length >= session.maxParticipants) {
      setEnrollError(
        `Capacité maximale de la session atteinte (${session.maxParticipants} participants max). Inscription impossible.`
      );
      return;
    }

    // Duplicate verification
    const alreadyEnrolled = activeSessionEnrollments.some(
      (enr) => enr.beneficiaryId === beneficiary.id
    );
    if (alreadyEnrolled) {
      setEnrollError(`${beneficiary.firstName} ${beneficiary.lastName} est déjà inscrit(e) à cette session.`);
      return;
    }

    try {
      // 1. Process enrollment
      const enrollment = appState.enrollBeneficiary(session.id, beneficiary.id, activeCompany.id);

      let convocationDoc: DocumentRecord | undefined;
      let conventionDoc: DocumentRecord | undefined;

      // 2. Automated Convocation generation
      if (autoGenConvocation) {
        convocationDoc = appState.sendConvocation(enrollment.id);
      }

      // 3. Automated Convention generation / update
      if (autoGenConvention) {
        conventionDoc = appState.generateConvention(session.id, activeCompany.id);
      }

      setEnrollSuccessNotice({
        beneficiaryName: `${beneficiary.firstName} ${beneficiary.lastName}`,
        sessionTitle: session.title,
        convocationDocId: convocationDoc?.id,
        conventionDocId: conventionDoc?.id,
      });

      setStatusMsg({
        type: 'success',
        text: `Inscription réussie : ${beneficiary.firstName} ${beneficiary.lastName} est inscrit(e) à la session [${session.referenceCode}].`,
      });

      setShowEnrollModal(false);
    } catch (err: any) {
      setEnrollError(err.message || 'Une erreur est survenue lors de l’inscription.');
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Entreprises Clientes & Bénéficiaires Rattachés
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Répertoire des comptes clients, contacts formation, inscriptions directes et conventions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user.role === 'CLIENT_CONTACT' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Isolation active : Données limitées à votre entreprise</span>
            </div>
          )}
          {activeCompany && (isManager || user.role === 'CLIENT_CONTACT') && (
            <button
              onClick={() => openEnrollModal()}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded transition-colors shadow-sm"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Inscrire un salarié à une session</span>
            </button>
          )}
          {isManager && (
            <button
              onClick={openCreateCompany}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une entreprise</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Status Message */}
      {statusMsg && (
        <div
          className={`p-3 rounded text-xs flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-slate-400 hover:text-white"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Direct Enrollment Success Banner with Document Actions */}
      {enrollSuccessNotice && (
        <div className="bg-slate-900 border border-emerald-700/80 rounded-lg p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <h4 className="text-xs font-bold text-white">
                Inscription validée pour {enrollSuccessNotice.beneficiaryName}
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              Session : <span className="font-semibold text-white">{enrollSuccessNotice.sessionTitle}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {enrollSuccessNotice.convocationDocId && (
              <button
                onClick={() => onOpenDocPreview?.(enrollSuccessNotice.convocationDocId!)}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-2.5 py-1.5 rounded transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>Voir la convocation officielle</span>
              </button>
            )}

            {enrollSuccessNotice.conventionDocId && (
              <button
                onClick={() => onOpenDocPreview?.(enrollSuccessNotice.conventionDocId!)}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-2.5 py-1.5 rounded transition-colors"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voir la convention de formation</span>
              </button>
            )}

            <button
              onClick={() => setEnrollSuccessNotice(null)}
              className="text-slate-400 hover:text-white p-1"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {accessibleCompanies.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded p-12 text-center text-xs text-slate-500">
          Aucune entreprise rattachée à votre compte utilisateur.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Companies Directory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Comptes Entreprises ({accessibleCompanies.length})
              </h2>
            </div>

            {/* Filter Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer par nom, SIREN ou ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              {filteredCompanies.map((comp) => {
                const isSelected = activeCompany?.id === comp.id;
                const members = allUsers.filter((u) => u.companyId === comp.id).length;
                const enrCount = allEnrollments.filter(
                  (e) => e.companyId === comp.id && e.status !== 'CANCELLED'
                ).length;

                return (
                  <button
                    key={comp.id}
                    onClick={() => {
                      setSelectedCompanyId(comp.id);
                      setStatusMsg(null);
                      setEnrollSuccessNotice(null);
                    }}
                    className={`w-full text-left p-3.5 rounded border transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">{comp.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        SIREN: {comp.siren}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{comp.city}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{members} contact(s)</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-blue-400">{enrCount} inscription(s)</span>
                    </div>
                  </button>
                );
              })}

              {filteredCompanies.length === 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded p-6 text-center text-xs text-slate-500">
                  Aucune entreprise ne correspond à votre recherche.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Company Full Profile */}
          {activeCompany && (
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded p-5">
                {/* Company Header */}
                <div className="pb-4 border-b border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-400 shrink-0" />
                        <h2 className="text-base font-bold text-white tracking-tight">
                          {activeCompany.name}
                        </h2>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs font-mono text-slate-400">
                        <span>SIREN: {activeCompany.siren}</span>
                        {activeCompany.siret && <span>SIRET: {activeCompany.siret}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(isManager || user.role === 'CLIENT_CONTACT') && (
                        <button
                          onClick={() => openEnrollModal()}
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 px-2.5 py-1.5 rounded transition-colors"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Inscrire à une session</span>
                        </button>
                      )}
                      {isManager && (
                        <button
                          onClick={() => openEditCompany(activeCompany)}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 px-2.5 py-1.5 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Modifier l’entreprise</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Coordonnées */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400 mt-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {activeCompany.address}, {activeCompany.postalCode} {activeCompany.city}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{activeCompany.contactEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{activeCompany.contactPhone}</span>
                    </div>
                    {activeCompany.opcoName && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          OPCO référent : <strong className="text-white">{activeCompany.opcoName}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {activeCompany.notes && (
                    <div className="mt-3 p-2.5 bg-slate-950/60 border border-slate-800 rounded text-xs text-slate-300">
                      <span className="font-semibold text-slate-400">Notes & conventions : </span>
                      {activeCompany.notes}
                    </div>
                  )}
                </div>

                {/* Sub-Tabs Navigation */}
                <div className="flex items-center gap-2 border-b border-slate-800 mt-5 pb-2">
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`text-xs font-semibold px-3 py-1.5 rounded transition-colors ${
                      activeTab === 'users'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    Collaborateurs & Stagiaires ({companyUsers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('sessions')}
                    className={`text-xs font-semibold px-3 py-1.5 rounded transition-colors ${
                      activeTab === 'sessions'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    Formations & Sessions Suivies ({companySessions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`text-xs font-semibold px-3 py-1.5 rounded transition-colors ${
                      activeTab === 'documents'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    Documents & Conventions ({companyDocuments.length})
                  </button>
                </div>

                {/* TAB 1: USERS & TRAINEES */}
                {activeTab === 'users' && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        Liste des salariés enregistrés et des contacts autorisés sur le portail client.
                      </p>
                      {(isManager || user.role === 'CLIENT_CONTACT') && (
                        <button
                          onClick={openAddUser}
                          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-800/60 px-2.5 py-1.5 rounded transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Ajouter un collaborateur</span>
                        </button>
                      )}
                    </div>

                    {companyUsers.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 border border-slate-800 rounded">
                        Aucun contact ou salarié n’est encore rattaché à cette entreprise.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800/80">
                        {companyUsers.map((cu) => {
                          const userEnrs = allEnrollments.filter(
                            (e) => e.beneficiaryId === cu.id && e.status !== 'CANCELLED'
                          );

                          return (
                            <div
                              key={cu.id}
                              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-100">
                                    {cu.firstName} {cu.lastName}
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                      cu.role === 'CLIENT_CONTACT'
                                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    {cu.role === 'CLIENT_CONTACT'
                                      ? 'Responsable RH / Contact'
                                      : 'Bénéficiaire / Salarié'}
                                </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                                  <span>{cu.email}</span>
                                  {cu.phone && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{cu.phone}</span>
                                    </>
                                  )}
                                </div>

                                {/* Active enrollments for this trainee */}
                                {userEnrs.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {userEnrs.map((enr) => {
                                      const sess = allSessions.find((s) => s.id === enr.sessionId);
                                      return (
                                        <span
                                          key={enr.id}
                                          className="text-[10px] bg-slate-950 border border-slate-800 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1.5"
                                        >
                                          <GraduationCap className="w-3 h-3 text-blue-400" />
                                          <strong className="text-white">{sess?.referenceCode}</strong> :{' '}
                                          <span className="truncate max-w-[150px]">{sess?.title}</span>
                                          <span className="text-emerald-400">({enr.status})</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 sm:self-center">
                                {(isManager || user.role === 'CLIENT_CONTACT') && (
                                  <button
                                    onClick={() => openEnrollModal(cu.id)}
                                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/60 px-2 py-1 rounded transition-colors"
                                    title="Inscrire ce collaborateur à une session de formation"
                                  >
                                    <GraduationCap className="w-3 h-3" />
                                    <span>Inscrire</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: SESSIONS & ENROLLMENTS */}
                {activeTab === 'sessions' && (
                  <div className="mt-4 space-y-4">
                    <p className="text-xs text-slate-400">
                      Toutes les sessions de formation suivies par les collaborateurs d’{activeCompany.name}.
                    </p>

                    {companySessions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 border border-slate-800 rounded">
                        Aucune inscription active pour cette entreprise.{' '}
                        {(isManager || user.role === 'CLIENT_CONTACT') && (
                          <button
                            onClick={() => openEnrollModal()}
                            className="text-blue-400 hover:underline ml-1"
                          >
                            Inscrire un salarié maintenant
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {companySessions.map((sess) => {
                          const sessEnrs = companyEnrollments.filter((e) => e.sessionId === sess.id);
                          const conventionDoc = companyDocuments.find(
                            (d) => d.type === 'CONVENTION' && d.relatedEntityId === sess.id
                          );

                          return (
                            <div
                              key={sess.id}
                              className="p-4 bg-slate-950/60 border border-slate-800 rounded space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-blue-400">
                                      {sess.referenceCode}
                                    </span>
                                    <span className="text-xs font-bold text-white">
                                      {sess.title}
                                    </span>
                                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                      {sess.modality}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-500" />
                                      {sess.startDate} au {sess.endDate}
                                    </span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-500" />
                                      {sess.location}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {conventionDoc && (
                                    <button
                                      onClick={() => onOpenDocPreview?.(conventionDoc.id)}
                                      className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded transition-colors"
                                    >
                                      <FileCheck2 className="w-3 h-3 text-emerald-400" />
                                      <span>Convention ({conventionDoc.referenceCode})</span>
                                    </button>
                                  )}
                                  {onNavigateTab && (
                                    <button
                                      onClick={() => onNavigateTab('sessions')}
                                      className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-950/40 border border-blue-800/60 px-2 py-1 rounded transition-colors"
                                    >
                                      <span>Voir la session</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Participants of this company */}
                              <div className="pt-2 border-t border-slate-800/60">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                  Salariés inscrits ({sessEnrs.length}) :
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {sessEnrs.map((enr) => {
                                    const ben = allUsers.find((u) => u.id === enr.beneficiaryId);
                                    const convDoc = companyDocuments.find(
                                      (d) => d.type === 'CONVOCATION' && d.relatedEntityId === enr.id
                                    );

                                    return (
                                      <div
                                        key={enr.id}
                                        className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded flex items-center gap-2"
                                      >
                                        <span className="text-slate-200">
                                          {ben ? `${ben.firstName} ${ben.lastName}` : 'Salarié'}
                                        </span>
                                        <span className="text-[10px] text-emerald-400 font-medium">
                                          {enr.status}
                                        </span>
                                        {convDoc && (
                                          <button
                                            onClick={() => onOpenDocPreview?.(convDoc.id)}
                                            className="text-[10px] text-blue-400 hover:underline"
                                            title="Consulter la convocation officielle"
                                          >
                                            [Convocation]
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: DOCUMENTS & CONVENTIONS */}
                {activeTab === 'documents' && (
                  <div className="mt-4 space-y-4">
                    <p className="text-xs text-slate-400">
                      Conventions de formation, convocations, attestations et pièces certifiées SHA-256.
                    </p>

                    {companyDocuments.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 border border-slate-800 rounded">
                        Aucun document contractuel n’a encore été généré pour cette entreprise.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {companyDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-3 bg-slate-950/60 border border-slate-800 rounded flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-900/60">
                                  {doc.type}
                                </span>
                                <span className="text-xs font-semibold text-white">
                                  {doc.title}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                                <span>Réf: {doc.referenceCode}</span>
                                <span aria-hidden="true">·</span>
                                <span>Empreinte SHA-256: {doc.sha256Fingerprint.substring(0, 16)}...</span>
                              </div>
                            </div>

                            <button
                              onClick={() => onOpenDocPreview?.(doc.id)}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-400" />
                              <span>Visualiser / Imprimer</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Direct Enrollment to Session */}
      {showEnrollModal && activeCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Inscrire un salarié à une session de formation
                  </h3>
                  <p className="text-[11px] text-slate-400">Entreprise : {activeCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {enrollError && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-800 rounded text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{enrollError}</span>
              </div>
            )}

            <form onSubmit={handleEnrollBeneficiary} className="mt-4 space-y-4">
              {/* Select Employee */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Collaborateur / Salarié stagiaire *
                </label>
                {companyUsers.length === 0 ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs text-slate-400">
                    Aucun collaborateur enregistré pour cette entreprise. Veuillez d'abord ajouter un contact ou salarié.
                  </div>
                ) : (
                  <select
                    value={enrollBeneficiaryId}
                    onChange={(e) => setEnrollBeneficiaryId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {companyUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.email}) —{' '}
                        {u.role === 'CLIENT_CONTACT' ? 'Responsable RH' : 'Salarié'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Select Session */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Session de formation visée *
                </label>
                {allSessions.length === 0 ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs text-slate-400">
                    Aucune session de formation n’est planifiée actuellement.
                  </div>
                ) : (
                  <select
                    value={enrollSessionId}
                    onChange={(e) => setEnrollSessionId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {allSessions
                      .filter((s) => s.status !== 'CANCELLED')
                      .map((sess) => {
                        const currentCount = allEnrollments.filter(
                          (e) => e.sessionId === sess.id && e.status !== 'CANCELLED'
                        ).length;
                        const isFull = currentCount >= sess.maxParticipants;

                        return (
                          <option key={sess.id} value={sess.id} disabled={isFull}>
                            [{sess.referenceCode}] {sess.title} ({sess.modality}) — Du {sess.startDate} au{' '}
                            {sess.endDate} — {currentCount}/{sess.maxParticipants} inscrits{' '}
                            {isFull ? '(COMPLET)' : ''}
                          </option>
                        );
                      })}
                  </select>
                )}
              </div>

              {/* Session Details Card Preview */}
              {(() => {
                const targetSession = allSessions.find((s) => s.id === enrollSessionId);
                if (!targetSession) return null;

                const currentCount = allEnrollments.filter(
                  (e) => e.sessionId === targetSession.id && e.status !== 'CANCELLED'
                ).length;
                const remaining = targetSession.maxParticipants - currentCount;
                const alreadyEnrolled = allEnrollments.some(
                  (e) =>
                    e.sessionId === targetSession.id &&
                    e.beneficiaryId === enrollBeneficiaryId &&
                    e.status !== 'CANCELLED'
                );

                return (
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">
                        {targetSession.referenceCode} — {targetSession.title}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          remaining > 0
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                            : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                        }`}
                      >
                        {remaining > 0 ? `${remaining} place(s) disponible(s)` : 'COMPLET'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-1">
                      <div>
                        Dates : <strong>{targetSession.startDate} au {targetSession.endDate}</strong> (Modalité : {targetSession.modality})
                      </div>
                      <div>Lieu / Accès : {targetSession.location}</div>
                    </div>

                    {alreadyEnrolled && (
                      <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded text-[11px] text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Ce salarié est déjà inscrit à cette session de formation.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Administrative Automation Options */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300 block">
                  Actions administratives immédiates :
                </span>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenConvocation}
                    onChange={(e) => setAutoGenConvocation(e.target.checked)}
                    className="mt-0.5 rounded"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Générer la convocation officielle immédiate
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Crée le document certifié avec empreinte SHA-256 et programme l'envoi au stagiaire.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenConvention}
                    onChange={(e) => setAutoGenConvention(e.target.checked)}
                    className="mt-0.5 rounded"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Générer / Actualiser la convention de formation de l’entreprise
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Intègre automatiquement ce salarié dans la liste des stagiaires couverts par la convention.
                    </div>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={companyUsers.length === 0 || allSessions.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Confirmer l'inscription</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Company */}
      {(showCreateCompanyModal || showEditCompanyModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  {showEditCompanyModal ? "Modifier l'entreprise cliente" : 'Nouvelle Entreprise Cliente'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCreateCompanyModal(false);
                  setShowEditCompanyModal(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-800 rounded text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCompany} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Raison sociale / Nom légal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Acme Industries SAS"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Numéro SIREN (9 chiffres) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : 512345678"
                    value={companyForm.siren}
                    onChange={(e) => setCompanyForm({ ...companyForm, siren: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Numéro SIRET (14 chiffres)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : 51234567800024"
                    value={companyForm.siret}
                    onChange={(e) => setCompanyForm({ ...companyForm, siret: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Adresse postale *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : 14 Avenue de la République"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Code Postal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : 75011"
                    value={companyForm.postalCode}
                    onChange={(e) => setCompanyForm({ ...companyForm, postalCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : Paris"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email de contact principal *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="rh@acme-industries.fr"
                    value={companyForm.contactEmail}
                    onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Téléphone contact *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01 40 20 30 40"
                    value={companyForm.contactPhone}
                    onChange={(e) => setCompanyForm({ ...companyForm, contactPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  OPCO référent pour les prises en charge
                </label>
                <input
                  type="text"
                  placeholder="Ex : OPCO Atlas, AKTO, OPCO EP, AFDAS, Constructys..."
                  value={companyForm.opcoName}
                  onChange={(e) => setCompanyForm({ ...companyForm, opcoName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes internes & particularités de facturation
                </label>
                <textarea
                  rows={2}
                  placeholder="Modalités de facturation particulières, convention cadre..."
                  value={companyForm.notes}
                  onChange={(e) => setCompanyForm({ ...companyForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateCompanyModal(false);
                    setShowEditCompanyModal(false);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
                >
                  {showEditCompanyModal ? 'Enregistrer les modifications' : 'Créer le compte entreprise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add User / Trainee */}
      {showAddUserModal && activeCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Ajouter un collaborateur ou stagiaire
                  </h3>
                  <p className="text-[11px] text-slate-400">Rattaché à : {activeCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-800 rounded text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Jean"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Dupont"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Adresse e-mail professionnelle *
                </label>
                <input
                  type="email"
                  required
                  placeholder="jean.dupont@entreprise.fr"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Téléphone (mobile ou direct)
                </label>
                <input
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rôle applicatif *
                </label>
                <div className="space-y-2 mt-1">
                  <label className="flex items-start gap-2.5 p-2.5 rounded border border-slate-800 bg-slate-950/60 cursor-pointer hover:bg-slate-800/40">
                    <input
                      type="radio"
                      name="role"
                      value="BENEFICIARY"
                      checked={userForm.role === 'BENEFICIARY'}
                      onChange={() => setUserForm({ ...userForm, role: 'BENEFICIARY' })}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        Bénéficiaire / Salarié Stagiaire
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Accède à ses convocations, émargements numériques et certificats de réalisation DGEFP.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded border border-slate-800 bg-slate-950/60 cursor-pointer hover:bg-slate-800/40">
                    <input
                      type="radio"
                      name="role"
                      value="CLIENT_CONTACT"
                      checked={userForm.role === 'CLIENT_CONTACT'}
                      onChange={() => setUserForm({ ...userForm, role: 'CLIENT_CONTACT' })}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        Responsable RH / Contact Entreprise
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Accède au portail entreprise, conventions, factures et suivi de tous ses stagiaires.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mot de passe provisoire (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Par défaut : TempPass2026!"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  L'utilisateur sera invité à renouveler son mot de passe lors de sa première connexion.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
                >
                  Ajouter le collaborateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
