/**
 * MK Formation — Qualiopi & Quality Evidence Management View
 * Features: National Quality Framework (RNQ) tracking, evidence linkage, and audit preparation
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import { QualiopiIndicator } from '../types/index.ts';
import { Award, CheckCircle2, Clock, AlertTriangle, FileText, Info } from 'lucide-react';

interface QualiopiViewProps {
  onOpenDocPreview: (docId: string) => void;
}

export const QualiopiView: React.FC<QualiopiViewProps> = ({ onOpenDocPreview }) => {
  const indicators = appState.getQualiopi();
  const allDocs = appState.getDocuments();

  const [selectedCriteria, setSelectedCriteria] = useState<number>(0); // 0 = all
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'CONFORME' | 'EN_COURS' | 'A_VERIFIER'>('CONFORME');

  const filteredIndicators =
    selectedCriteria === 0
      ? indicators
      : indicators.filter((ind) => ind.criteriaNumber === selectedCriteria);

  const startEdit = (ind: QualiopiIndicator) => {
    setEditingId(ind.id);
    setEditNotes(ind.notes);
    setEditStatus(ind.status);
  };

  const saveEdit = (id: string) => {
    appState.updateQualiopiIndicator(id, editStatus, editNotes);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Référentiel National Qualité (Qualiopi) & Preuves d’Audit
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Préparation documentaire, traçabilité des indicateurs et liaison avec les documents générés.
          </p>
        </div>
      </div>

      {/* Mandatory Regulatory Disclaimer */}
      <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded flex items-start gap-3 text-xs text-blue-200">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Avertissement réglementaire :</span> Cette interface permet d’organiser, versionner et relier les pièces justificatives aux indicateurs du Référentiel National Qualité. Elle constitue une aide à la préparation des audits et ne garantit pas automatiquement l’obtention ou le maintien de la certification Qualiopi.
        </div>
      </div>

      {/* Criteria Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
        <button
          onClick={() => setSelectedCriteria(0)}
          className={`px-3 py-1.5 rounded whitespace-nowrap transition-colors ${
            selectedCriteria === 0
              ? 'bg-blue-600 text-white font-medium'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Tous les critères
        </button>
        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
          <button
            key={num}
            onClick={() => setSelectedCriteria(num)}
            className={`px-3 py-1.5 rounded whitespace-nowrap transition-colors ${
              selectedCriteria === num
                ? 'bg-blue-600 text-white font-medium'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Critère {num}
          </button>
        ))}
      </div>

      {/* Indicators Matrix */}
      <div className="space-y-4">
        {filteredIndicators.map((ind) => {
          const isEditing = editingId === ind.id;
          const evidenceDocs = allDocs.filter((d) => ind.evidenceDocumentIds.includes(d.id));

          return (
            <div
              key={ind.id}
              className="bg-slate-900 border border-slate-800 rounded p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono font-bold bg-slate-800 text-blue-400 px-2.5 py-1 rounded border border-slate-700 shrink-0">
                    Indicateur {ind.indicatorNumber}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {ind.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {ind.requirement}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      ind.status === 'CONFORME'
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                        : ind.status === 'EN_COURS'
                        ? 'bg-amber-950/60 border-amber-700 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {ind.status === 'CONFORME'
                      ? 'Conforme'
                      : ind.status === 'EN_COURS'
                      ? 'En cours'
                      : 'À vérifier'}
                  </span>

                  {!isEditing && (
                    <button
                      onClick={() => startEdit(ind)}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors"
                    >
                      Modifier
                    </button>
                  )}
                </div>
              </div>

              {/* Editing Form */}
              {isEditing ? (
                <div className="pt-3 border-t border-slate-800 space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Statut de conformité</label>
                    <select
                      value={editStatus}
                      onChange={(e: any) => setEditStatus(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs"
                    >
                      <option value="CONFORME">Conforme</option>
                      <option value="EN_COURS">En cours d’audit</option>
                      <option value="A_VERIFIER">À vérifier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Notes d’audit et justifications</label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => saveEdit(ind.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-800/60">
                  <div className="text-slate-300 italic">
                    « {ind.notes} »
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Dernière revue : {new Date(ind.lastAuditedAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              )}

              {/* Linked Evidence Documents */}
              {evidenceDocs.length > 0 && (
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400">Preuves rattachées :</span>
                  {evidenceDocs.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => onOpenDocPreview(doc.id)}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-blue-400 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      <span>{doc.referenceCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
