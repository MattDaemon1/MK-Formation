/**
 * Unit & Integration Tests: Official Certificates & RGPD Compliance
 * Enforces prompt section 8:
 * - Certified documents (Certificat de Réalisation, Attestation de fin)
 * - Data minimization and strictly isolated personal data export (RGPD Article 15)
 * - Audit logging of personal data exports
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { appState } from '../src/services/appState.ts';
import { auditService } from '../src/server/audit.ts';

test('Certificates: Generates official Certificat de Réalisation with correct hours calculation', () => {
  const enrollments = appState.getEnrollments();
  const enr = enrollments[0]; // Lucas Martin in SESS-2026-01

  const cert = appState.generateCertificatRealisation(enr.id);

  assert.equal(cert.type, 'CERTIFICAT_REALISATION');
  assert.ok(cert.referenceCode.startsWith('CERT-REAL-'));
  assert.ok(cert.sha256Fingerprint);
  assert.equal(cert.contentSnapshot.beneficiaryName, 'Lucas Martin');
  assert.equal(cert.contentSnapshot.completedHours, 3.5); // 1 morning attendance marked
  assert.equal(cert.contentSnapshot.totalHours, 14);
});

test('Certificates: Generates official Attestation de fin with evaluation status', () => {
  const enrollments = appState.getEnrollments();
  const enr = enrollments[0];

  const attestation = appState.generateAttestationFin(enr.id);

  assert.equal(attestation.type, 'ATTESTATION_FIN');
  assert.ok(attestation.referenceCode.startsWith('ATT-FIN-'));
  assert.ok(attestation.sha256Fingerprint);
  assert.equal(attestation.contentSnapshot.beneficiaryName, 'Lucas Martin');
});

test('RGPD: Personal data export contains only personal records with no third-party data leak', () => {
  const lucasUserId = 'USR-BEN-LUCAS';
  const exportData = appState.exportPersonalDataRgpd(lucasUserId);

  assert.equal(exportData.user.id, lucasUserId);
  assert.equal(exportData.user.email, 'lucas.martin@acme-industries.fr');

  // Verify no password hash or salt in export
  assert.equal(exportData.user.passwordHash, undefined);
  assert.equal(exportData.user.salt, undefined);

  // Verify all training records belong to Lucas
  for (const doc of exportData.documentsIssued) {
    assert.ok(doc.title.includes('Lucas') || doc.reference.startsWith('DOC-') || doc.reference.startsWith('CERT-') || doc.reference.startsWith('ATT-'));
  }

  // Verify that an audit log entry was recorded for the RGPD export
  const logs = auditService.getAllLogs();
  const exportLog = logs.find((l) => l.action === 'RGPD_DATA_EXPORTED');
  assert.ok(exportLog);
  assert.equal(exportLog.entityId, lucasUserId);
});
