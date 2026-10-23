/**
 * MK Formation — Top Navigation Bar
 * Follows the 3-Zone Top Bar Contract from Universal Frontend Design Constitution
 * Features:
 * - Direct navigation across tabs
 * - Zone 3: User authentication, registration, persona switching, and Admin User Management
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import { UserRole } from '../types/index.ts';
import { UserManagementModal } from './UserManagementModal.tsx';
import {
  ShieldCheck,
  ChevronDown,
  Check,
  Users,
  KeyRound,
  LogOut,
  UserCheck,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab }) => {
  const currentUser = appState.getCurrentUser();
  const allUsers = appState.getAllUsers();

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur Matt Konnect';
      case 'TRAINER':
        return 'Formateur';
      case 'CLIENT_CONTACT':
        return 'Contact Client RH';
      case 'BENEFICIARY':
        return 'Bénéficiaire / Stagiaire';
      default:
        return role;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', visible: true },
    { id: 'sessions', label: 'Sessions & Émargements', visible: true },
    { id: 'catalog', label: 'Catalogue', visible: currentUser.role !== 'BENEFICIARY' },
    {
      id: 'companies',
      label: 'Entreprises & Stagiaires',
      visible: currentUser.role === 'ADMIN' || currentUser.role === 'CLIENT_CONTACT',
    },
    {
      id: 'finance',
      label: 'Facturation',
      visible: currentUser.role === 'ADMIN' || currentUser.role === 'CLIENT_CONTACT',
    },
    { id: 'documents', label: 'Documents & Preuves', visible: true },
    { id: 'automations', label: 'Automatisations', visible: currentUser.role === 'ADMIN' },
    { id: 'qualiopi', label: 'Qualiopi', visible: currentUser.role === 'ADMIN' },
    { id: 'audit', label: 'Audit', visible: currentUser.role === 'ADMIN' },
  ].filter((item) => item.visible);

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Brand wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#dashboard"
              onClick={(e) => {
                e.preventDefault();
                onSelectTab('dashboard');
              }}
              className="text-lg font-bold tracking-tight text-white hover:text-slate-200 transition-colors whitespace-nowrap"
            >
              MK Formation
            </a>
            <span className="hidden sm:inline-block text-xs font-normal text-slate-400">
              Matt Konnect
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`text-xs uppercase tracking-wider font-medium whitespace-nowrap transition-colors py-2 border-b-2 ${
                    isActive
                      ? 'text-white border-blue-500'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Active User & Authentication Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Admin User Management Button */}
            {currentUser.role === 'ADMIN' && (
              <button
                onClick={() => setShowUserManagementModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded text-xs font-medium text-slate-200 hover:text-white transition-colors"
                title="Gérer tous les comptes utilisateurs, rôles et réinitialisations"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Gestion Comptes</span>
              </button>
            )}

            {/* Active User Switcher & Profile Card (Sophie, Claire, Lucas, Marc) */}
            <button
              onClick={() => setShowRoleModal(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded text-left transition-colors whitespace-nowrap"
              title="Changer de profil ou tester un autre compte (Marc, Sophie, Claire, Lucas)"
            >
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-100">
                  {currentUser.firstName} {currentUser.lastName}
                </span>
                <span className="text-[10px] text-slate-400">
                  {getRoleLabel(currentUser.role)}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Logout / Déconnexion button */}
            <button
              onClick={() => appState.logout()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-red-950/60 hover:text-red-300 border border-slate-700 hover:border-red-800/80 rounded text-xs font-medium text-slate-300 transition-colors"
              title="Se déconnecter et retourner à la page de connexion"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary navigation */}
        <div className="lg:hidden flex items-center gap-4 px-4 py-2 bg-slate-950 overflow-x-auto border-t border-slate-800 text-xs">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`whitespace-nowrap py-1 ${
                currentTab === item.id ? 'text-white font-semibold' : 'text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setShowUserManagementModal(true)}
              className="whitespace-nowrap py-1 text-blue-400 font-semibold"
            >
              Gestion Comptes
            </button>
          )}
        </div>
      </header>

      {/* Role / Context Switcher Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white">
                  Contrôle d’accès et isolation des profils
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Basculez de profil pour tester l’étanchéité des données ou connectez-vous avec vos identifiants.
                </p>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Quick Authentication Actions */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  appState.logout();
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 rounded text-xs font-semibold text-red-300 hover:text-red-200 transition-colors"
                title="Se déconnecter et retourner sur la page de connexion & inscription"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Se déconnecter (Ouvrir la page de connexion / inscription)</span>
              </button>
            </div>

            {/* User List Switcher */}
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
              {allUsers.map((u) => {
                const isSelected = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      appState.switchUser(u.id);
                      setShowRoleModal(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-600 text-white'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">
                          {u.firstName} {u.lastName}
                        </span>
                        <span className="text-[11px] text-slate-400">· {u.email}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {getRoleLabel(u.role)}
                        {u.companyId && ` (Rattaché à ${u.companyId})`}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {currentUser.role === 'ADMIN' && (
              <div className="pt-3 border-t border-slate-800 mb-3">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setShowUserManagementModal(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-blue-400 rounded transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>Ouvrir la console d'administration des comptes (Création, rôles, statuts)</span>
                </button>
              </div>
            )}

            <div className="bg-slate-950 border border-slate-800 rounded p-3 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Règle de sécurité vérifiée :</span> En mode Contact Client ou Bénéficiaire, le serveur filtre strictement toutes les entités (sessions, convocations, émargements, factures) pour interdire tout accès aux données des autres entreprises.
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin User Management Modal */}
      {showUserManagementModal && (
        <UserManagementModal onClose={() => setShowUserManagementModal(false)} />
      )}
    </>
  );
};
