/**
 * MK Formation — RGPD & Data Privacy Management Modal
 * Enforces article 15 (Right of access/export) and legal retention disclosure
 */

import React from 'react';
import { appState } from '../services/appState.ts';
import { ShieldCheck, Download, Clock, X, Lock } from 'lucide-react';

interface RgpdModalProps {
  onClose: () => void;
}

export const RgpdModal: React.FC<RgpdModalProps> = ({ onClose }) => {
  const currentUser = appState.getCurrentUser();
  const retentionRules = appState.getRgpdRetentionPolicies();

  const handleExportData = () => {
    const data = appState.exportPersonalDataRgpd(currentUser.id);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `mk_formation_rgpd_export_${currentUser.id}_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full p-6 text-white shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold tracking-tight">
              Protection des Données Personnelles & Engagements RGPD
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Rights Summary */}
        <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded text-xs space-y-2 text-slate-300">
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vos données sont strictement cantonnées aux finalités de gestion administrative, pédagogique et de certification de vos formations.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div>
              <span className="font-semibold text-white">Compte actif :</span> {currentUser.email} ({currentUser.firstName} {currentUser.lastName})
            </div>
            <button
              onClick={handleExportData}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Exporter mes données (JSON)
            </button>
          </div>
        </div>

        {/* Legal Retention Registry */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Politique des durées de conservation légale
          </h4>
          <div className="border border-slate-800 rounded overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <th className="py-2 px-3 font-medium">Catégorie</th>
                  <th className="py-2 px-3 font-medium">Durée</th>
                  <th className="py-2 px-3 font-medium">Base juridique & Règle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {retentionRules.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-medium text-slate-200">{r.category}</td>
                    <td className="py-2.5 px-3 font-mono text-blue-400 whitespace-nowrap">{r.duration}</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-400">
                      <div className="font-semibold text-slate-300">{r.legalBasis}</div>
                      <div>{r.rule}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
