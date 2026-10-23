/**
 * MK Formation — Main Application Shell
 * Orchestrates views, state subscriptions, document previews, and RBAC enforcement
 */

import React, { useState, useEffect } from 'react';
import { appState } from './services/appState.ts';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { SessionsView } from './components/SessionsView.tsx';
import { CatalogView } from './components/CatalogView.tsx';
import { CompaniesView } from './components/CompaniesView.tsx';
import { FinanceView } from './components/FinanceView.tsx';
import { DocumentsView } from './components/DocumentsView.tsx';
import { AutomationsView } from './components/AutomationsView.tsx';
import { QualiopiView } from './components/QualiopiView.tsx';
import { AuditView } from './components/AuditView.tsx';
import { DocumentPreviewModal } from './components/DocumentPreviewModal.tsx';
import { RgpdModal } from './components/RgpdModal.tsx';
import { AuthPage } from './components/AuthPage.tsx';

export default function App() {
  const [, setTick] = useState(0);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [showRgpdModal, setShowRgpdModal] = useState(false);

  useEffect(() => {
    // Subscribe to state updates across the application
    const unsubscribe = appState.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  const isAuthenticated = appState.isAuthenticated();
  const currentUser = appState.getCurrentUser();

  // Authentication Middleware Guard:
  // Redirect unauthenticated visitors or logged-out users to dedicated Login / Register AuthPage
  if (!isAuthenticated || !currentUser) {
    return <AuthPage onLoginSuccess={() => setTick((t) => t + 1)} />;
  }

  // Guard against navigating to tabs unauthorized for the current role
  useEffect(() => {
    if (currentUser.role === 'BENEFICIARY') {
      if (['catalog', 'companies', 'finance', 'qualiopi', 'audit'].includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    } else if (currentUser.role === 'TRAINER') {
      if (['companies', 'finance', 'automations', 'qualiopi', 'audit'].includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    } else if (currentUser.role === 'CLIENT_CONTACT') {
      if (['automations', 'qualiopi', 'audit'].includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    }
  }, [currentUser, currentTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 3-Zone Top Bar */}
      <Header currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigate={setCurrentTab}
            onOpenDocPreview={(id) => setPreviewDocId(id)}
          />
        )}
        {currentTab === 'sessions' && (
          <SessionsView onOpenDocPreview={(id) => setPreviewDocId(id)} />
        )}
        {currentTab === 'catalog' && <CatalogView />}
        {currentTab === 'companies' && (
          <CompaniesView
            onOpenDocPreview={(id) => setPreviewDocId(id)}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}
        {currentTab === 'finance' && (
          <FinanceView onOpenDocPreview={(id) => setPreviewDocId(id)} />
        )}
        {currentTab === 'documents' && (
          <DocumentsView onOpenDocPreview={(id) => setPreviewDocId(id)} />
        )}
        {currentTab === 'automations' && <AutomationsView />}
        {currentTab === 'qualiopi' && (
          <QualiopiView onOpenDocPreview={(id) => setPreviewDocId(id)} />
        )}
        {currentTab === 'audit' && <AuditView />}
      </main>

      {/* Document Preview Modal */}
      {previewDocId && (
        <DocumentPreviewModal
          documentId={previewDocId}
          onClose={() => setPreviewDocId(null)}
        />
      )}

      {/* RGPD Compliance & Rights Modal */}
      {showRgpdModal && (
        <RgpdModal onClose={() => setShowRgpdModal(false)} />
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-slate-400">MK Formation</span> · Matt Konnect
            SAS · Déclaration d’activité n° 11 75 00000 75
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <button
              onClick={() => setShowRgpdModal(true)}
              className="text-slate-400 hover:text-slate-200 underline underline-offset-2 transition-colors"
            >
              Conforme RGPD (Gestion & Export)
            </button>
            <span>·</span>
            <span>Traçabilité Qualiopi</span>
            <span>·</span>
            <span>Chiffrement SHA-256</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
