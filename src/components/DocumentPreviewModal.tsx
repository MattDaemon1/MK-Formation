/**
 * MK Formation — High-Fidelity Printable Document Viewer Modal
 * Renders official Conventions, Convocations, Certificates, Invoices, and Attendance sheets
 * with certified SHA-256 fingerprint stamps.
 */

import React from 'react';
import { appState } from '../services/appState.ts';
import { DocumentRecord } from '../types/index.ts';
import { ShieldCheck, Printer, X, Download } from 'lucide-react';

interface DocumentPreviewModalProps {
  documentId: string;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  documentId,
  onClose,
}) => {
  const documents = appState.getDocuments();
  const doc = documents.find((d) => d.id === documentId);

  if (!doc) return null;

  const snapshot = doc.contentSnapshot || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-3xl w-full text-slate-100 shadow-2xl overflow-hidden my-8">
        {/* Modal Top Actions */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
              {doc.type}
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {doc.referenceCode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimer / Exporter PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet (A4-like clean paper design) */}
        <div className="p-8 sm:p-12 bg-white text-slate-900 min-h-[500px]">
          {/* Header Organization */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-6">
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900">
                MATT KONNECT
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Organisme de Formation Professionnelle
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Déclaration d’activité enregistrée sous le n° 11 75 00000 75
              </div>
              <div className="text-[11px] text-slate-500">
                12 rue de la Paix, 75002 Paris · contact@mattkonnect.com
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono font-bold text-slate-700">
                Réf : {doc.referenceCode}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Date : {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>

          {/* Document Title */}
          <div className="my-8 text-center">
            <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900">
              {doc.title}
            </h1>
            <div className="text-xs text-slate-500 mt-1">
              Conforme aux exigences réglementaires et au Référentiel National Qualité (Qualiopi)
            </div>
          </div>

          {/* Dynamic Content based on snapshot */}
          <div className="space-y-6 text-xs text-slate-800 leading-relaxed">
            {doc.type === 'CONVOCATION' && (
              <>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-bold text-slate-900 mb-1">
                    Bénéficiaire convoqué(e) : {snapshot.beneficiaryName}
                  </div>
                  <div className="text-slate-600">
                    Entreprise / Employeur : {snapshot.companyName}
                  </div>
                </div>

                <p>
                  Nous avons le plaisir de vous convoquer à l’action de formation professionnelle intitulée :
                </p>

                <div className="p-4 bg-slate-100 border border-slate-300 rounded font-semibold text-slate-900">
                  {snapshot.trainingTitle}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold block text-slate-900">Dates & Durée :</span>
                    {snapshot.dates} ({snapshot.durationHours} heures)
                  </div>
                  <div>
                    <span className="font-bold block text-slate-900">Modalité :</span>
                    {snapshot.modality}
                  </div>
                </div>

                <div>
                  <span className="font-bold block text-slate-900">Lieu de réalisation :</span>
                  {snapshot.location}
                </div>

                <p className="text-[11px] text-slate-600 italic">
                  Merci de vous munir d’une pièce d’identité ou de vos identifiants de connexion sécurisés pour signer la feuille d’émargement dématérialisée.
                </p>
              </>
            )}

            {doc.type === 'CONVENTION' && (
              <>
                <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 border border-slate-200 rounded">
                  <div>
                    <span className="font-bold block text-slate-900">L’Organisme de formation :</span>
                    MATT KONNECT SAS<br />
                    12 rue de la Paix, 75002 Paris<br />
                    SIREN : 800 000 000
                  </div>
                  <div>
                    <span className="font-bold block text-slate-900">Le Client :</span>
                    {snapshot.companyName}<br />
                    SIREN : {snapshot.companySiren}<br />
                    {snapshot.companyAddress}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Article 1 — Objet de la convention</h4>
                  <p>
                    Le Client confie à Matt Konnect la réalisation de l’action de formation :{' '}
                    <strong>{snapshot.sessionTitle}</strong>, d’une durée de{' '}
                    <strong>{snapshot.durationHours} heures</strong>.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Article 2 — Bénéficiaires désignés</h4>
                  <p>
                    Participants inscrits :{' '}
                    {Array.isArray(snapshot.participants)
                      ? snapshot.participants.join(', ')
                      : 'Salarié(s) de l’entreprise'}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Article 3 — Conditions financières</h4>
                  <p>
                    Le coût total de la prestation s’élève à{' '}
                    <strong>{((snapshot.priceHtCents || 180000) / 100).toFixed(2)} € HT</strong>.
                    Exonération de TVA conformément à l’article 261-4-4a du Code Général des Impôts.
                  </p>
                </div>
              </>
            )}

            {doc.type === 'CERTIFICAT_REALISATION' && (
              <>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center">
                  <div className="font-bold text-sm text-slate-900 uppercase">
                    Certificat de Réalisation d’une Action de Formation
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Établi conformément aux dispositions de l’article R. 6331-59 du Code du Travail
                  </div>
                </div>

                <p>
                  Je soussigné(e), <strong>Matthieu Konnect</strong>, représentant légal du dispensateur de formation <strong>MATT KONNECT SAS</strong>, atteste que le bénéficiaire :
                </p>

                <div className="p-4 bg-slate-100 border border-slate-300 rounded">
                  <div className="font-bold text-slate-900">
                    Nom & Prénom : {snapshot.beneficiaryName}
                  </div>
                  <div className="text-slate-700">
                    Entreprise cliente : {snapshot.companyName}
                  </div>
                </div>

                <p>
                  a activement suivi et réalisé l’action de formation professionnelle suivante :
                </p>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-1">
                  <div><strong>Intitulé :</strong> {snapshot.trainingTitle}</div>
                  <div><strong>Nature de l'action :</strong> Action de formation (Art. L. 6313-1 du Code du travail)</div>
                  <div><strong>Période de réalisation :</strong> du {snapshot.dates}</div>
                  <div><strong>Durée totale réalisée :</strong> {snapshot.completedHours} heures sur {snapshot.totalHours} heures prévues</div>
                  <div><strong>Modalité :</strong> {snapshot.modality}</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 text-[11px]">
                  <strong>Assiduité et réalisation :</strong> L’assiduité du participant a été attestée par les feuilles d’émargement électroniques horodatées et conservées dans le dossier de preuves.
                </div>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="text-slate-600 text-[11px]">
                    Fait à Paris, le {new Date(doc.createdAt).toLocaleDateString('fr-FR')}<br />
                    Pour valoir ce que de droit auprès de l’employeur et de l’OPCO.
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">Pour Matt Konnect</div>
                    <div className="text-slate-600 text-[11px]">Signature numérique certifiée</div>
                    <div className="font-mono text-[10px] text-slate-500 mt-1">SHA-256: {doc.sha256Fingerprint.slice(0, 16)}...</div>
                  </div>
                </div>
              </>
            )}

            {doc.type === 'ATTESTATION_FIN' && (
              <>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center">
                  <div className="font-bold text-sm text-slate-900 uppercase">
                    Attestation Individuelle de Fin de Formation
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Évaluation de l’atteinte des objectifs pédagogiques (Qualiopi - Indicateur 11)
                  </div>
                </div>

                <p>
                  L’organisme de formation <strong>MATT KONNECT</strong> atteste que :
                </p>

                <div className="p-4 bg-slate-100 border border-slate-300 rounded font-bold text-slate-900 text-sm">
                  {snapshot.beneficiaryName}
                </div>

                <p>
                  a suivi la formation <strong>« {snapshot.trainingTitle} »</strong> d’une durée de <strong>{snapshot.durationHours} heures</strong>, dispensée du {snapshot.dates}.
                </p>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <div className="font-bold text-slate-900">Évaluation des acquis :</div>
                  <div className="text-slate-700">
                    • Évaluation sommative continue : <strong>{snapshot.evaluationResult || 'Objectifs validés avec succès'}</strong>
                  </div>
                  <div className="text-slate-700">
                    • Taux d’assiduité constaté : <strong>{snapshot.attendanceRate || '100%'}</strong>
                  </div>
                </div>
              </>
            )}

            {doc.type !== 'CONVOCATION' && doc.type !== 'CONVENTION' && doc.type !== 'CERTIFICAT_REALISATION' && doc.type !== 'ATTESTATION_FIN' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded">
                <p className="font-semibold text-slate-900 mb-2">Données de synthèse du document :</p>
                <pre className="text-[11px] text-slate-700 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(snapshot, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Cryptographic Certification Stamp */}
          <div className="mt-12 pt-6 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-bold text-slate-700">Empreinte numérique SHA-256 certifiée :</span>
                <div className="font-mono text-[9px] text-slate-600">
                  {doc.sha256Fingerprint}
                </div>
              </div>
            </div>
            <div className="text-right">
              Émis via MK Formation · Matt Konnect
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
