/**
 * Financial Integrity Tests: Invoices, VAT & Exact Cent Computations
 * Enforces rules from section 6:
 * - Integer decimal values for currency (cents)
 * - Explicit currency (EUR)
 * - Strict balance calculations and partial payments
 * - No floating point drift
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseStore } from '../src/server/database.ts';

test('Finance Integrity: Invoices calculate exact cents with no floating point drift', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  const invoice = db.createInvoice({
    invoiceNumber: 'FAC-TEST-001',
    companyId: 'COMP-ACME',
    issueDate: '2026-03-01',
    dueDate: '2026-04-01',
    tvaRateBps: 2000, // 20.00%
    items: [
      { description: 'Module 1 - 3.5h', quantity: 2, unitPriceHtCents: 45000 }, // 90 000 cts
      { description: 'Frais de support pédagogique', quantity: 3, unitPriceHtCents: 3333 }, // 9 999 cts
    ],
    actor: admin,
  });

  assert.equal(invoice.totalHtCents, 99999); // 999.99 EUR
  // TVA 20% on 99999 cts: round(99999 * 2000 / 10000) = round(19999.8) = 20000 cts (200.00 EUR)
  assert.equal(invoice.totalTvaCents, 20000);
  assert.equal(invoice.totalTtcCents, 119999); // 1 199.99 EUR
  assert.equal(invoice.paidCents, 0);
  assert.equal(invoice.status, 'ISSUED');
  assert.equal(invoice.currency, 'EUR');
});

test('Finance Integrity: Partial payments update paid amount and remaining balance accurately', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  const invoice = db.createInvoice({
    invoiceNumber: 'FAC-TEST-002',
    companyId: 'COMP-ACME',
    issueDate: '2026-03-01',
    dueDate: '2026-04-01',
    tvaRateBps: 0, // Exonéré
    items: [{ description: 'Formation Complète', quantity: 1, unitPriceHtCents: 100000 }], // 1 000.00 EUR
    actor: admin,
  });

  // First payment of 400.00 EUR
  const payment1 = db.recordPayment({
    invoiceId: invoice.id,
    amountCents: 40000,
    method: 'VIREMENT',
    reference: 'VIR-01',
    date: '2026-03-05',
    actor: admin,
  });

  assert.equal(payment1.amountCents, 40000);
  assert.equal(invoice.paidCents, 40000);
  assert.equal(invoice.status, 'PARTIALLY_PAID');

  // Second payment completing the balance (600.00 EUR)
  const payment2 = db.recordPayment({
    invoiceId: invoice.id,
    amountCents: 60000,
    method: 'VIREMENT',
    reference: 'VIR-02',
    date: '2026-03-10',
    actor: admin,
  });

  assert.equal(payment2.amountCents, 60000);
  assert.equal(invoice.paidCents, 100000);
  assert.equal(invoice.status, 'PAID');
});

test('Finance Integrity: Rejects overpayment attempts and negative amounts', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  const invoice = db.createInvoice({
    invoiceNumber: 'FAC-TEST-003',
    companyId: 'COMP-ACME',
    issueDate: '2026-03-01',
    dueDate: '2026-04-01',
    tvaRateBps: 0,
    items: [{ description: 'Session Test', quantity: 1, unitPriceHtCents: 50000 }], // 500.00 EUR
    actor: admin,
  });

  // Attempt to pay 500.01 EUR (overpayment)
  assert.throws(
    () => {
      db.recordPayment({
        invoiceId: invoice.id,
        amountCents: 50001,
        method: 'VIREMENT',
        reference: 'VIR-OVER',
        date: '2026-03-05',
        actor: admin,
      });
    },
    { message: /dépasse le solde restant/ }
  );

  // Attempt to pay negative amount
  assert.throws(
    () => {
      db.recordPayment({
        invoiceId: invoice.id,
        amountCents: -100,
        method: 'VIREMENT',
        reference: 'VIR-NEG',
        date: '2026-03-05',
        actor: admin,
      });
    },
    { message: /strictement supérieur à zéro/ }
  );
});
