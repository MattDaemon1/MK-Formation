/**
 * MK Formation — Admin User Management Modal
 * Allows Matt Konnect Administrators to:
 * - Provision new user accounts for any role (Admin, Formateur, Contact Client RH, Bénéficiaire)
 * - Assign company affiliations for B2B users
 * - Suspend / reactivate user accounts
 * - Reset passwords
 * - Inspect user audit statuses
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import { User, UserRole } from '../types/index.ts';
import {
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Search,
  Lock,
  KeyRound,
  X,
  Check,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Power,
  RotateCcw,
} from 'lucide-react';

interface UserManagementModalProps {
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ onClose }) => {
  const currentUser = appState.getCurrentUser();
  const allUsers = appState.getAllUsers();
  const allCompanies = appState.getCompanies();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [resetPassUserId, setResetPassUserId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // Form state
  const [newRole, setNewRole] = useState<UserRole>('TRAINER');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompanyId, setNewCompanyId] = useState(allCompanies[0]?.id || '');
  const [newPassword, setNewPassword] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const filteredUsers = allUsers.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded">
            Administrateur
          </span>
        );
      case 'TRAINER':
        return (
          <span className="text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded">
            Formateur
          </span>
        );
      case 'CLIENT_CONTACT':
        return (
          <span className="text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/80 px-2 py-0.5 rounded">
            Contact Client RH
          </span>
        );
      case 'BENEFICIARY':
        return (
          <span className="text-[10px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/80 px-2 py-0.5 rounded">
            Bénéficiaire / Stagiaire
          </span>
        );
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newFirstName.trim() || !newLastName.trim()) {
      setFormError('Le prénom et le nom sont obligatoires.');
      return;
    }
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setFormError('Une adresse email valide est obligatoire.');
      return;
    }

    if ((newRole === 'CLIENT_CONTACT' || newRole === 'BENEFICIARY') && !newCompanyId) {
      setFormError('Veuillez sélectionner l’entreprise cliente de rattachement.');
      return;
    }

    try {
      const created = appState.createUser({
        role: newRole,
        firstName: newFirstName,
        lastName: newLastName,
        email: newEmail,
        phone: newPhone || undefined,
        companyId:
          newRole === 'CLIENT_CONTACT' || newRole === 'BENEFICIARY' ? newCompanyId : undefined,
        password: newPassword.trim() || undefined,
      });

      setSuccessNotice(`Utilisateur ${created.firstName} ${created.lastName} créé avec succès.`);
      setShowCreateForm(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
    } catch (err: any) {
      setFormError(err.message || 'Une erreur est survenue lors de la création de l’utilisateur.');
    }
  };

  const handleToggleActive = (user: User) => {
    try {
      const updated = appState.toggleUserActive(user.id);
      setSuccessNotice(
        `Compte de ${updated.firstName} ${updated.lastName} ${
          updated.active ? 'réactivé' : 'suspendu'
        }.`
      );
    } catch (err: any) {
      setFormError(err.message || 'Action impossible.');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUserId || !newPasswordValue.trim()) return;

    try {
      appState.resetUserPassword(resetPassUserId, newPasswordValue);
      setSuccessNotice('Mot de passe réinitialisé avec succès.');
      setResetPassUserId(null);
      setNewPasswordValue('');
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la réinitialisation.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-4xl w-full p-6 shadow-2xl my-8 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Gestion des Comptes Utilisateurs & Rôles
              </h3>
              <p className="text-xs text-slate-400">
                Administration centrale des accès Matt Konnect, formateurs, contacts RH et stagiaires.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notices */}
        {successNotice && (
          <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-800 rounded text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button onClick={() => setSuccessNotice(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {formError && (
          <div className="mt-4 p-3 bg-rose-950/40 border border-rose-800 rounded text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
            <button onClick={() => setFormError(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Actions & Filters */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Tous les rôles ({allUsers.length})</option>
              <option value="ADMIN">Administrateurs</option>
              <option value="TRAINER">Formateurs</option>
              <option value="CLIENT_CONTACT">Contacts Clients RH</option>
              <option value="BENEFICIARY">Bénéficiaires / Stagiaires</option>
            </select>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors shadow-sm self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>{showCreateForm ? 'Masquer le formulaire' : 'Créer un utilisateur'}</span>
          </button>
        </div>

        {/* CREATE USER FORM */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateUser}
            className="mt-4 p-4 bg-slate-950/80 border border-blue-900/60 rounded-lg space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>Nouveau compte utilisateur (Création par l'Admin)</span>
              </span>
              <span className="text-[11px] text-slate-400">Tous les rôles autorisés</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Rôle de l'utilisateur *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="ADMIN">Administrateur Matt Konnect</option>
                  <option value="TRAINER">Formateur habilité</option>
                  <option value="CLIENT_CONTACT">Contact Client / Responsable RH</option>
                  <option value="BENEFICIARY">Bénéficiaire / Salarié stagiaire</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Claire"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Lefèvre"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Adresse e-mail (Identifiant unique) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="claire.lefevre@mattkonnect.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Téléphone direct
                </label>
                <input
                  type="tel"
                  placeholder="06 00 00 00 00"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {(newRole === 'CLIENT_CONTACT' || newRole === 'BENEFICIARY') && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Entreprise cliente de rattachement *
                </label>
                <select
                  value={newCompanyId}
                  onChange={(e) => setNewCompanyId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {allCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (SIREN: {c.siren})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Mot de passe initial (optionnel, mot de passe par défaut généré si vide)
              </label>
              <input
                type="text"
                placeholder="Ex: SecPass2026! (ou vide pour mot de passe standard)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors"
              >
                Créer l'utilisateur
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD MODAL SUB-POPUP */}
        {resetPassUserId && (
          <form
            onSubmit={handleResetPassword}
            className="mt-4 p-3.5 bg-slate-950 border border-amber-800/80 rounded space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs font-bold text-amber-300">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>
                  Réinitialiser le mot de passe pour :{' '}
                  {allUsers.find((u) => u.id === resetPassUserId)?.email}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setResetPassUserId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                minLength={8}
                placeholder="Nouveau mot de passe (min 8 car.)"
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded"
              >
                Confirmer
              </button>
            </div>
          </form>
        )}

        {/* USERS TABLE */}
        <div className="mt-4 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Utilisateur</th>
                  <th className="py-2.5 px-3 font-semibold">Rôle</th>
                  <th className="py-2.5 px-3 font-semibold">Entreprise</th>
                  <th className="py-2.5 px-3 font-semibold">Statut</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.map((u) => {
                  const company = u.companyId ? allCompanies.find((c) => c.id === u.companyId) : null;
                  const isCurrent = u.id === currentUser.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-850/60 transition-colors ${
                        !u.active ? 'opacity-60 bg-slate-950/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">
                          {u.firstName} {u.lastName} {isCurrent && <span className="text-blue-400 font-mono">(Vous)</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>

                      <td className="py-2.5 px-3">{getRoleBadge(u.role)}</td>

                      <td className="py-2.5 px-3 text-slate-300">
                        {company ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[140px]">{company.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Interne</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {u.active ? (
                          <span className="text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            Actif
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400 font-mono font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                            Suspendu
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              appState.switchUser(u.id);
                              onClose();
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded transition-colors"
                            title="Tester l'isolation en basculant sur ce profil"
                          >
                            Tester ce profil
                          </button>

                          <button
                            onClick={() => setResetPassUserId(u.id)}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                            title="Réinitialiser le mot de passe"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`p-1 rounded transition-colors ${
                                u.active
                                  ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                              }`}
                              title={u.active ? 'Suspendre ce compte' : 'Réactiver ce compte'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800">
          <span>{filteredUsers.length} compte(s) affiché(s)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
