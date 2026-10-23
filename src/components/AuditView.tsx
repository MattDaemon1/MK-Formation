/**
 * MK Formation — Security & Action Audit Trail View
 * Features: Immutable chronological log of sensitive actions, actor tracing, and export
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import { canAccessAuditLogs } from '../server/policy.ts';
import { ShieldCheck, Search, Download, Clock } from 'lucide-react';

export const AuditView: React.FC = () => {
  const user = appState.getCurrentUser();
  const logs = appState.getAuditLogs();

  const [searchQuery, setSearchQuery] = useState('');

  if (!canAccessAuditLogs(user)) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded p-12 text-center text-xs text-rose-400">
        Accès refusé. La consultation des journaux d’audit est strictement réservée à l’administrateur Matt Konnect.
      </div>
    );
  }

  const filteredLogs = logs.filter((log) => {
    return (
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mk_formation_audit_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Journal d’Audit & Traçabilité des Opérations Sensibles
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Historique immuable des connexions, modifications de données, émissions de documents et règlements financiers.
          </p>
        </div>
        <button
          onClick={handleExportJson}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Exporter le journal (JSON)
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filtrer les journaux d'audit (ex: AUTH_LOGIN, INVOICE_CREATED, email...)"
          className="w-full bg-slate-900 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
        />
      </div>

      {/* Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
              <th className="py-3 px-4 font-medium">Horodatage</th>
              <th className="py-3 px-4 font-medium">Action</th>
              <th className="py-3 px-4 font-medium">Acteur</th>
              <th className="py-3 px-4 font-medium">Cible</th>
              <th className="py-3 px-4 font-medium">Détails de l’opération</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/40">
                <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                  {new Date(log.timestamp).toLocaleString('fr-FR')}
                </td>
                <td className="py-2.5 px-4">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      log.action.includes('AUTH_FAILED')
                        ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                        : log.action.includes('LOGIN')
                        ? 'bg-blue-950/60 border-blue-800 text-blue-300'
                        : log.action.includes('PAYMENT')
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-300 text-[11px]">
                  <div>{log.userEmail}</div>
                  <div className="text-[10px] text-slate-500 font-sans">{log.userRole}</div>
                </td>
                <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                  {log.entityType}
                </td>
                <td className="py-2.5 px-4 text-slate-300 font-sans text-xs max-w-md">
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
