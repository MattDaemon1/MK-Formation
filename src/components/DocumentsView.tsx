/**
 * MK Formation — Documents Vault & Evidence Repository
 * Features: Secure document access, SHA-256 fingerprint verification, and filter by type
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import { filterDocumentsForUser } from '../server/policy.ts';
import { DocumentRecord, DocumentType } from '../types/index.ts';
import { FileText, ShieldCheck, Eye, Search, Filter } from 'lucide-react';

interface DocumentsViewProps {
  onOpenDocPreview: (docId: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ onOpenDocPreview }) => {
  const user = appState.getCurrentUser();
  const allDocuments = appState.getDocuments();

  const userDocuments = filterDocumentsForUser(user, allDocuments);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const filteredDocs = userDocuments.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.referenceCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'ALL' || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Documents Réglementaires & Empreintes Cryptographiques
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Conventions, convocations, émargements et attestations certifiés par hachage SHA-256 immuable.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par référence, titre ou bénéficiaire..."
            className="w-full bg-slate-900 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded text-xs w-full sm:w-auto overflow-x-auto">
          {['ALL', 'CONVENTION', 'CONVOCATION', 'EMARGEMENT', 'ATTESTATION_FIN'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
                selectedType === t
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'ALL'
                ? 'Tous'
                : t === 'CONVENTION'
                ? 'Conventions'
                : t === 'CONVOCATION'
                ? 'Convocations'
                : t === 'EMARGEMENT'
                ? 'Émargements'
                : 'Attestations'}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid / Table */}
      {filteredDocs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded p-12 text-center text-xs text-slate-500">
          Aucun document ne correspond aux critères de recherche.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <th className="py-3 px-4 font-medium">Référence & Type</th>
                <th className="py-3 px-4 font-medium">Titre du document</th>
                <th className="py-3 px-4 font-medium">Date d’émission</th>
                <th className="py-3 px-4 font-medium">Empreinte SHA-256</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <span className="font-mono font-semibold text-slate-200 block">
                      {doc.referenceCode}
                    </span>
                    <span className="text-[10px] text-blue-400 uppercase">
                      {doc.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-200">
                    {doc.title}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono">
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[140px]" title={doc.sha256Fingerprint}>
                        {doc.sha256Fingerprint.substring(0, 16)}...
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onOpenDocPreview(doc.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" /> Consulter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
