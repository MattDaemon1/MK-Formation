/**
 * MK Formation — Finance, Invoicing & Payments View
 * Strict integer cent computations, partial payment tracking, and VAT calculations
 */

import React, { useState } from 'react';
import { appState } from '../services/appState.ts';
import { filterInvoicesForUser, canManageInvoices } from '../server/policy.ts';
import { Invoice, InvoicePayment } from '../types/index.ts';
import { CreditCard, Plus, CheckCircle2, AlertCircle, FileText, ArrowRight } from 'lucide-react';

interface FinanceViewProps {
  onOpenDocPreview: (docId: string) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ onOpenDocPreview }) => {
  const user = appState.getCurrentUser();
  const allInvoices = appState.getInvoices();
  const allCompanies = appState.getCompanies();
  const allSessions = appState.getSessions();

  const userInvoices = filterInvoicesForUser(user, allInvoices);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    userInvoices.length > 0 ? userInvoices[0].id : ''
  );

  const activeInvoice =
    userInvoices.find((inv) => inv.id === selectedInvoiceId) || userInvoices[0];

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmountEuros, setPaymentAmountEuros] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'VIREMENT' | 'CB' | 'CHEQUE'>('VIREMENT');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState(allCompanies[0]?.id || '');
  const [newInvoiceNumber, setNewInvoiceNumber] = useState(
    `FAC-${new Date().getFullYear()}-${String(allInvoices.length + 1).padStart(3, '0')}`
  );
  const [newDueDate, setNewDueDate] = useState('2026-04-15');
  const [newItemDesc, setNewItemDesc] = useState('Formation Professionnelle Continue');
  const [newItemAmountEuros, setNewItemAmountEuros] = useState('1800');

  const formatEuro = (cents: number) => {
    return (cents / 100).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €';
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    if (!activeInvoice) return;

    try {
      const amountCents = Math.round(parseFloat(paymentAmountEuros.replace(',', '.')) * 100);
      if (isNaN(amountCents) || amountCents <= 0) {
        setPaymentError('Veuillez saisir un montant valide');
        return;
      }

      appState.recordPayment({
        invoiceId: activeInvoice.id,
        amountCents,
        method: paymentMethod,
        reference: paymentReference || `REG-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().split('T')[0],
      });

      setShowPaymentModal(false);
      setPaymentAmountEuros('');
      setPaymentReference('');
    } catch (err: any) {
      setPaymentError(err.message);
    }
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const unitPriceHtCents = Math.round(parseFloat(newItemAmountEuros.replace(',', '.')) * 100);
      const created = appState.createInvoice({
        invoiceNumber: newInvoiceNumber,
        companyId: newCompanyId,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: newDueDate,
        tvaRateBps: 0, // Exonéré Art. 261-4-4a CGI
        items: [
          {
            description: newItemDesc,
            quantity: 1,
            unitPriceHtCents,
          },
        ],
      });
      setShowCreateInvoiceModal(false);
      setSelectedInvoiceId(created.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Facturation & Suivi des Règlements
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Comptabilité simplifiée, gestion des acomptes, calculs en centimes et exonérations de TVA.
          </p>
        </div>
        {canManageInvoices(user) && (
          <button
            onClick={() => setShowCreateInvoiceModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Émettre une facture
          </button>
        )}
      </div>

      {userInvoices.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded p-12 text-center text-xs text-slate-500">
          Aucune facture disponible pour votre entreprise.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice List */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Factures Émises ({userInvoices.length})
            </h2>
            <div className="space-y-2">
              {userInvoices.map((inv) => {
                const isSelected = activeInvoice?.id === inv.id;
                const comp = allCompanies.find((c) => c.id === inv.companyId);
                const remaining = inv.totalTtcCents - inv.paidCents;
                return (
                  <button
                    key={inv.id}
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className={`w-full text-left p-3.5 rounded border transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-white">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-xs font-mono font-semibold tabular-nums text-slate-100">
                        {formatEuro(inv.totalTtcCents)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 truncate">
                      {comp?.name || 'Entreprise'}
                    </div>
                    <div className="mt-2 text-[10px] flex items-center justify-between text-slate-400">
                      <span>Échéance : {inv.dueDate}</span>
                      <span
                        className={`font-semibold ${
                          inv.status === 'PAID'
                            ? 'text-emerald-400'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'text-amber-400'
                            : 'text-blue-400'
                        }`}
                      >
                        {inv.status === 'PAID'
                          ? 'Réglée'
                          : inv.status === 'PARTIALLY_PAID'
                          ? `Reste ${formatEuro(remaining)}`
                          : 'À payer'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Invoice Detail */}
          {activeInvoice && (
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                      {activeInvoice.invoiceNumber}
                    </span>
                    <h2 className="text-base font-bold text-white tracking-tight mt-1">
                      Facture de Formation Professionnelle
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Émise le {activeInvoice.issueDate} · Échéance le {activeInvoice.dueDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManageInvoices(user) && activeInvoice.paidCents < activeInvoice.totalTtcCents && (
                      <button
                        onClick={() => {
                          const remainingEuros = ((activeInvoice.totalTtcCents - activeInvoice.paidCents) / 100).toFixed(2);
                          setPaymentAmountEuros(remainingEuros);
                          setShowPaymentModal(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Enregistrer un règlement
                      </button>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="mt-5">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 font-medium">Prestation / Désignation</th>
                        <th className="py-2 font-medium text-right">Qté</th>
                        <th className="py-2 font-medium text-right">P.U. HT</th>
                        <th className="py-2 font-medium text-right">Total HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {activeInvoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 text-slate-200">{item.description}</td>
                          <td className="py-2.5 text-right font-mono text-slate-300">{item.quantity}</td>
                          <td className="py-2.5 text-right font-mono text-slate-300">{formatEuro(item.unitPriceHtCents)}</td>
                          <td className="py-2.5 text-right font-mono font-medium text-slate-100">{formatEuro(item.totalHtCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs text-right">
                    <div className="flex justify-between text-slate-400">
                      <span>Total HT :</span>
                      <span className="font-mono tabular-nums">{formatEuro(activeInvoice.totalHtCents)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>TVA (Exonération Art. 261-4-4a CGI) :</span>
                      <span className="font-mono tabular-nums">{formatEuro(activeInvoice.totalTvaCents)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                      <span>Total TTC :</span>
                      <span className="font-mono tabular-nums">{formatEuro(activeInvoice.totalTtcCents)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 pt-1">
                      <span>Montant déjà réglé :</span>
                      <span className="font-mono tabular-nums">{formatEuro(activeInvoice.paidCents)}</span>
                    </div>
                    <div className="flex justify-between text-amber-400 font-semibold pt-1 border-t border-slate-800">
                      <span>Reste à payer :</span>
                      <span className="font-mono tabular-nums">
                        {formatEuro(activeInvoice.totalTtcCents - activeInvoice.paidCents)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                <div className="mt-8 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                    Historique des règlements ({activeInvoice.payments.length})
                  </h3>
                  {activeInvoice.payments.length === 0 ? (
                    <p className="text-xs text-slate-500">Aucun règlement enregistré pour cette facture.</p>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {activeInvoice.payments.map((p) => (
                        <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-200">{formatEuro(p.amountCents)}</span>
                            <span className="text-slate-400 ml-2">via {p.method}</span>
                            <span className="text-[10px] text-slate-500 font-mono ml-2">Réf: {p.reference}</span>
                          </div>
                          <span className="text-slate-400 font-mono">{p.date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-sm font-bold tracking-tight mb-4">
              Enregistrer un paiement pour la facture {activeInvoice.invoiceNumber}
            </h3>
            {paymentError && (
              <div className="p-3 mb-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded text-xs">
                {paymentError}
              </div>
            )}
            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Montant reçu (€)</label>
                <input
                  type="text"
                  required
                  value={paymentAmountEuros}
                  onChange={(e) => setPaymentAmountEuros(e.target.value)}
                  placeholder="ex: 900.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Solde restant : {formatEuro(activeInvoice.totalTtcCents - activeInvoice.paidCents)}
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Moyen de règlement</label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                >
                  <option value="VIREMENT">Virement bancaire</option>
                  <option value="CB">Carte bancaire</option>
                  <option value="CHEQUE">Chèque</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Référence bancaire / transaction</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="ex: VIR-2026-ACME-01"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
                >
                  Confirmer l’encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-sm font-bold tracking-tight mb-4">Émettre une facture</h3>
            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Numéro de facture</label>
                <input
                  type="text"
                  required
                  value={newInvoiceNumber}
                  onChange={(e) => setNewInvoiceNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Entreprise cliente</label>
                <select
                  value={newCompanyId}
                  onChange={(e) => setNewCompanyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                >
                  {allCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Date d’échéance</label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Désignation de la formation</label>
                <input
                  type="text"
                  required
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Montant total (€ HT)</label>
                <input
                  type="text"
                  required
                  value={newItemAmountEuros}
                  onChange={(e) => setNewItemAmountEuros(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                >
                  Émettre la facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
