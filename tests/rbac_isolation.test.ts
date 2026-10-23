/**
 * Negative Security & RBAC Tests: Multi-Tenant & Client Data Isolation
 * Enforces the fundamental rule: No client can ever view, modify, or guess another client's data.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseStore } from '../src/server/database.ts';
import {
  canAccessCompany,
  canAccessInvoice,
  canAccessDocument,
  canAccessSession,
  canManageInvoices,
  canManageQualiopi,
  canAccessAuditLogs,
} from '../src/server/policy.ts';
import { User, DocumentRecord, Invoice } from '../src/types/index.ts';

test('RBAC Isolation: Client Contact A cannot access Company B details', () => {
  const db = new DatabaseStore();

  const clientUserA = db.users.get('USR-CLIENT-ACME')!;
  const companyA = db.companies.get('COMP-ACME')!;
  const companyB = db.companies.get('COMP-BETA')!;

  // Allowed on own company
  assert.equal(canAccessCompany(clientUserA, companyA.id), true);

  // STRICTLY FORBIDDEN on rival company
  assert.equal(canAccessCompany(clientUserA, companyB.id), false);
});

test('RBAC Isolation: Client Contact A cannot view or download Invoice for Company B', () => {
  const db = new DatabaseStore();

  const clientUserA = db.users.get('USR-CLIENT-ACME')!;
  const invoiceForCompanyA = db.invoices.get('INV-2026-001')!;

  // Create an invoice belonging to Company B
  const invoiceForCompanyB: Invoice = {
    id: 'INV-BETA-001',
    invoiceNumber: 'FAC-2026-002',
    companyId: 'COMP-BETA',
    status: 'ISSUED',
    issueDate: '2026-02-21',
    dueDate: '2026-03-21',
    totalHtCents: 250000,
    tvaRateBps: 2000,
    totalTvaCents: 50000,
    totalTtcCents: 300000,
    paidCents: 0,
    currency: 'EUR',
    items: [],
    payments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Client A can access own invoice
  assert.equal(canAccessInvoice(clientUserA, invoiceForCompanyA), true);

  // Client A CANNOT access Company B's invoice (Negative test)
  assert.equal(canAccessInvoice(clientUserA, invoiceForCompanyB), false);
});

test('RBAC Isolation: Trainer cannot access commercial invoices or manage Qualiopi', () => {
  const db = new DatabaseStore();

  const trainer = db.users.get('USR-TRAIN-01')!;
  const invoice = db.invoices.get('INV-2026-001')!;

  // Trainer cannot view invoices
  assert.equal(canAccessInvoice(trainer, invoice), false);
  assert.equal(canManageInvoices(trainer), false);

  // Trainer cannot manage Qualiopi indicators
  assert.equal(canManageQualiopi(trainer), false);

  // Trainer cannot view audit logs
  assert.equal(canAccessAuditLogs(trainer), false);
});

test('RBAC Isolation: Learner can only access their own personal document, not another learner document', () => {
  const db = new DatabaseStore();

  const learnerLucas = db.users.get('USR-BEN-LUCAS')!;

  const ownDoc: DocumentRecord = {
    id: 'DOC-LUCAS-ATTESTATION',
    referenceCode: 'ATT-2026-001',
    type: 'ATTESTATION_FIN',
    title: 'Attestation de fin de formation — Lucas Martin',
    status: 'GENERATED',
    relatedEntityType: 'ENROLLMENT',
    relatedEntityId: 'ENR-2026-01',
    beneficiaryId: learnerLucas.id,
    companyId: 'COMP-ACME',
    sha256Fingerprint: 'dummyhash',
    contentSnapshot: {},
    createdAt: new Date().toISOString(),
  };

  const otherLearnerDoc: DocumentRecord = {
    id: 'DOC-OTHER-ATTESTATION',
    referenceCode: 'ATT-2026-002',
    type: 'ATTESTATION_FIN',
    title: 'Attestation de fin de formation — Autre Stagiaire',
    status: 'GENERATED',
    relatedEntityType: 'ENROLLMENT',
    relatedEntityId: 'ENR-OTHER',
    beneficiaryId: 'USR-OTHER-LEARNER',
    companyId: 'COMP-OTHER',
    sha256Fingerprint: 'dummyhash',
    contentSnapshot: {},
    createdAt: new Date().toISOString(),
  };

  // Learner can access their own certificate
  assert.equal(canAccessDocument(learnerLucas, ownDoc), true);

  // Learner CANNOT access another learner certificate (Negative test)
  assert.equal(canAccessDocument(learnerLucas, otherLearnerDoc), false);
});

test('RBAC Isolation: Inactive user is denied access to everything', () => {
  const db = new DatabaseStore();
  const activeUser = db.users.get('USR-CLIENT-ACME')!;

  const inactiveUser: User = {
    ...activeUser,
    id: 'USR-INACTIVE',
    active: false,
  };

  const invoice = db.invoices.get('INV-2026-001')!;
  const doc = db.documents.get('DOC-CONV-01')!;

  assert.equal(canAccessCompany(inactiveUser, activeUser.companyId!), false);
  assert.equal(canAccessInvoice(inactiveUser, invoice), false);
  assert.equal(canAccessDocument(inactiveUser, doc), false);
});
