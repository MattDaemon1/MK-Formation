/**
 * MK Formation — Automations & Background Jobs Console
 * Features: Observable automation queue, delivery confirmation logs, retry triggers, and deduplication
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import { automationEngine } from '../server/automations.ts';
import { AutomationJob } from '../types/index.ts';
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, Send, ShieldCheck, Mail } from 'lucide-react';

export const AutomationsView: React.FC = () => {
  const jobs = appState.getAutomationJobs();
  const sessions = appState.getSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || '');
  const [notice, setNotice] = useState<string>('');

  const handleTriggerReminders = (trigger: 'SESSION_REMINDER_J7' | 'SESSION_REMINDER_J1') => {
    if (!selectedSessionId) return;
    try {
      const count = appState.triggerSessionReminders(selectedSessionId, trigger);
      if (count > 0) {
        setNotice(`${count} rappel(s) programmés et délivrés avec succès pour la session.`);
      } else {
        setNotice('Tous les participants ont déjà reçu ce rappel (action idempotente : aucun doublon émis).');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRetryJob = (jobId: string) => {
    try {
      automationEngine.retryJob(jobId);
      setNotice('Tâche réexécutée avec succès.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Automatisations Administratives & Files de Notifications
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Convocations automatiques, rappels J-7/J-1, vérification d’idempotence et traçabilité de livraison.
          </p>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-blue-950/50 border border-blue-800 text-blue-200 rounded text-xs flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-blue-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Manual Trigger / Dispatch Console */}
      <div className="bg-slate-900 border border-slate-800 rounded p-5">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
          Déclencheur d’automatisations de session
        </h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs flex-1"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.referenceCode} - {s.title} ({s.startDate})
              </option>
            ))}
          </select>

          <button
            onClick={() => handleTriggerReminders('SESSION_REMINDER_J7')}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5" /> Lancer Rappels J-7
          </button>

          <button
            onClick={() => handleTriggerReminders('SESSION_REMINDER_J1')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5" /> Lancer Rappels J-1
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Garantie d’idempotence : Si un rappel a déjà été transmis à un stagiaire pour cette session, le moteur bloque toute réémission pour empêcher les doublons involontaires.
        </p>
      </div>

      {/* Jobs Queue Table */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Historique des tâches ({jobs.length})
        </h2>

        {jobs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded p-12 text-center text-xs text-slate-500">
            Aucune tâche d'automatisation dans la file d'attente.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3 px-4 font-medium">Déclencheur</th>
                  <th className="py-3 px-4 font-medium">Destinataire</th>
                  <th className="py-3 px-4 font-medium">Statut de livraison</th>
                  <th className="py-3 px-4 font-medium">Tentatives</th>
                  <th className="py-3 px-4 font-medium">Résultat & Horodatage</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200 block">
                        {job.trigger}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block max-w-[140px]" title={job.idempotencyKey}>
                        Clé: {job.idempotencyKey.substring(0, 12)}...
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300">
                      <div>{job.recipientName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{job.recipientEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          job.status === 'DELIVERED'
                            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                            : job.status === 'FAILED'
                            ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                            : 'bg-amber-950/60 border-amber-800 text-amber-300'
                        }`}
                      >
                        {job.status === 'DELIVERED'
                          ? 'Délivré'
                          : job.status === 'FAILED'
                          ? 'Échec'
                          : 'En attente'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 tabular-nums">
                      {job.attempts} / {job.maxAttempts}
                    </td>
                    <td className="py-3 px-4 font-sans text-[11px] text-slate-300 max-w-xs">
                      <div>{job.resultMessage || 'En attente de traitement'}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {new Date(job.createdAt).toLocaleString('fr-FR')}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {job.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Réessayer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
