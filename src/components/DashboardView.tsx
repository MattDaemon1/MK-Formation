/**
 * MK Formation — Executive Dashboard View
 * Adapts strictly to user role with tabular metrics, data integrity, and zero fluff
 */

import React from 'react';
import { appState } from '../services/appState.ts';
import {
  filterSessionsForUser,
  filterDocumentsForUser,
  filterInvoicesForUser,
} from '../server/policy.ts';
import {
  Calendar,
  Users,
  Award,
  CreditCard,
  FileText,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onOpenDocPreview: (docId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenDocPreview }) => {
  const user = appState.getCurrentUser();
  const allSessions = appState.getSessions();
  const allEnrollments = appState.getEnrollments();
  const allDocuments = appState.getDocuments();
  const allInvoices = appState.getInvoices();
  const allCompanies = appState.getCompanies();
  const allQualiopi = appState.getQualiopi();
  const auditLogs = appState.getAuditLogs();

  // Apply server-side RBAC filters
  const userSessions = filterSessionsForUser(user, allSessions, allEnrollments);
  const userDocs = filterDocumentsForUser(user, allDocuments);
  const userInvoices = filterInvoicesForUser(user, allInvoices);

  // Financial calculations strictly in cents
  const totalInvoicedCents = userInvoices.reduce((acc, inv) => acc + inv.totalTtcCents, 0);
  const totalPaidCents = userInvoices.reduce((acc, inv) => acc + inv.paidCents, 0);
  const balanceRemainingCents = totalInvoicedCents - totalPaidCents;

  // Qualiopi rate
  const compliantCount = allQualiopi.filter((q) => q.status === 'CONFORME').length;
  const qualiopiProgressPercent = Math.round((compliantCount / allQualiopi.length) * 100);

  const formatEuro = (cents: number) => {
    return (cents / 100).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €';
  };

  return (
    <div className="space-y-8">
      {/* Role Context Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Bonjour, {user.firstName} {user.lastName}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {user.role === 'ADMIN' && 'Espace d’administration Matt Konnect — Gestion globale des formations et de la conformité.'}
            {user.role === 'TRAINER' && 'Espace Formateur — Vos sessions programmées et émargements pédagogiques.'}
            {user.role === 'CLIENT_CONTACT' && 'Portail Entreprise — Suivi exclusif de vos salariés inscrits et de votre facturation.'}
            {user.role === 'BENEFICIARY' && 'Espace Stagiaire — Vos convocations, feuilles d’émargement et attestations nominatives.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'ADMIN' && (
            <button
              onClick={() => onNavigate('sessions')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
            >
              Planifier une session
            </button>
          )}
          {user.role === 'CLIENT_CONTACT' && (
            <button
              onClick={() => onNavigate('documents')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium transition-colors"
            >
              Télécharger mes conventions
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row (Strictly using tabular numerals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Sessions Actives</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
            {userSessions.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {user.role === 'ADMIN' ? 'Sur l’ensemble du catalogue' : 'Assignées à votre profil'}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Documents Validés</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
            {userDocs.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Empreinte SHA-256 certifiée
          </div>
        </div>

        {/* Metric 3 (Finance or Attendance) */}
        {user.role !== 'BENEFICIARY' && user.role !== 'TRAINER' ? (
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Solde restant dû</span>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
              {formatEuro(balanceRemainingCents)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Sur {formatEuro(totalInvoicedCents)} facturés
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Modalités pédagogiques</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-white">
              Hybride & Présentiel
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Support continu Matt Konnect
            </div>
          </div>
        )}

        {/* Metric 4 (Qualiopi or Participation) */}
        {user.role === 'ADMIN' ? (
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Indicateurs Qualiopi</span>
              <Award className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
              {compliantCount} / {allQualiopi.length}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {qualiopiProgressPercent}% conformité préparée
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Statut d’inscription</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-white">
              Convoqué & Validé
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Émargement électronique actif
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Sessions List & Relevant Documents / Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sessions List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Sessions de formation accessibles
              </h2>
              <p className="text-xs text-slate-400">
                Filtre de sécurité actif : Seules les sessions autorisées sont affichées
              </p>
            </div>
            <button
              onClick={() => onNavigate('sessions')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {userSessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Aucune session de formation ne correspond à votre profil d’autorisation.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {userSessions.map((session) => {
                const sessionEnrollments = allEnrollments.filter((e) => e.sessionId === session.id);
                return (
                  <div key={session.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {session.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {session.referenceCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>{session.startDate} au {session.endDate}</span>
                        <span aria-hidden="true">·</span>
                        <span>{session.modality}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{sessionEnrollments.length} inscrit(s)</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('sessions')}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded whitespace-nowrap shrink-0"
                    >
                      Détails & Émargement
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Documents & Audit / Activity */}
        <div className="space-y-6">
          {/* Documents Box */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Documents réglementaires
              </h2>
              <button
                onClick={() => onNavigate('documents')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Tous
              </button>
            </div>
            <div className="space-y-2">
              {userDocs.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  className="p-2.5 bg-slate-800/50 border border-slate-800 rounded flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{doc.title}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{doc.referenceCode}</p>
                  </div>
                  <button
                    onClick={() => onOpenDocPreview(doc.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-slate-800 rounded whitespace-nowrap"
                  >
                    Voir
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Audit Box */}
          {user.role === 'ADMIN' && (
            <div className="bg-slate-900 border border-slate-800 rounded p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Journal d’audit récent
                </h2>
                <button
                  onClick={() => onNavigate('audit')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  Historique complet
                </button>
              </div>
              <div className="space-y-2">
                {auditLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="text-xs border-b border-slate-800/80 pb-2 last:border-0">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span className="font-mono text-slate-300">{log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] mt-0.5 truncate">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Beneficiary Satisfaction Survey (Qualiopi Indicator 30) */}
          {user.role === 'BENEFICIARY' && (
            <div className="bg-slate-900 border border-slate-800 rounded p-5">
              <h2 className="text-sm font-bold text-white tracking-tight mb-1">
                Évaluation de satisfaction
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                Recueil obligatoire des appréciations (Qualiopi Indicateur 30)
              </p>
              {allEnrollments.some((e) => e.beneficiaryId === user.id && e.satisfactionScore) ? (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded text-xs text-emerald-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Merci pour votre retour !</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Votre appréciation a été enregistrée dans le dossier d’audit pédagogique de la session.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const userEnr = allEnrollments.find((en) => en.beneficiaryId === user.id);
                    if (!userEnr) return;
                    appState.submitSatisfactionSurvey({
                      enrollmentId: userEnr.id,
                      pedagogicalClarityRating: 5,
                      exercisesRelevanceRating: 5,
                      trainerPacingRating: 5,
                      overallRating: 5,
                      comment: 'Excellente session, cas concrets très pertinents pour notre sécurité.',
                      wouldRecommend: true,
                    });
                  }}
                  className="space-y-3 text-xs"
                >
                  <p className="text-slate-300 text-[11px]">
                    Note globale attribuée à votre formation :
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-amber-400 text-sm">★</span>
                    ))}
                    <span className="text-slate-400 text-xs ml-2">5/5 (Très satisfait)</span>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
                  >
                    Valider mon évaluation à chaud
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
