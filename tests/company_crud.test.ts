/**
 * Unit & Integration Tests: Company CRUD & Contact Registration
 * Verifies dynamic creation of companies, duplicate SIREN rejection, and user attachment.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseStore } from '../src/server/database.ts';
import { canAccessCompany } from '../src/server/policy.ts';

test('Company CRUD: Creates a new client company with valid SIREN', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  const newCompany = db.createCompany({
    name: 'TechNova Solutions SAS',
    siren: '912345678',
    siret: '91234567800019',
    address: '8 Rue de la Bourse',
    city: 'Bordeaux',
    postalCode: '33000',
    contactEmail: 'rh@technova.fr',
    contactPhone: '05 56 00 11 22',
    opcoName: 'OPCO Atlas',
    notes: 'Accord cadre 2026',
    actor: admin,
  });

  assert.ok(newCompany.id);
  assert.equal(newCompany.name, 'TechNova Solutions SAS');
  assert.equal(newCompany.siren, '912345678');
  assert.equal(newCompany.city, 'Bordeaux');

  // Verify it exists in database
  const retrieved = db.companies.get(newCompany.id);
  assert.ok(retrieved);
  assert.equal(retrieved.contactEmail, 'rh@technova.fr');
});

test('Company CRUD: Rejects duplicate SIREN', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  // Company A already uses SIREN 512345678
  assert.throws(
    () => {
      db.createCompany({
        name: 'Autre Entreprise avec même SIREN',
        siren: '512 345 678', // with spaces to test normalization
        address: '1 rue Test',
        city: 'Lyon',
        postalCode: '69001',
        contactEmail: 'autre@test.fr',
        contactPhone: '04 00 00 00 00',
        actor: admin,
      });
    },
    { message: /existe déjà/ }
  );
});

test('Company CRUD: Updates company information', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  const company = db.companies.get('COMP-ACME')!;
  const updated = db.updateCompany({
    id: company.id,
    name: 'Acme Industries Global SAS',
    siren: company.siren,
    siret: '51234567800032',
    address: '20 Rue du Faubourg Saint-Honoré',
    city: 'Paris',
    postalCode: '75008',
    contactEmail: 'direction-rh@acme-global.fr',
    contactPhone: '01 40 20 30 99',
    opcoName: 'OPCO Atlas',
    notes: 'Nouvelle adresse siège',
    actor: admin,
  });

  assert.equal(updated.name, 'Acme Industries Global SAS');
  assert.equal(updated.city, 'Paris');
  assert.equal(updated.postalCode, '75008');
  assert.equal(updated.contactEmail, 'direction-rh@acme-global.fr');
});

test('Company Users: Registers a client contact and a beneficiary attached to the company', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  // Register client contact
  const contact = db.createCompanyUser({
    companyId: 'COMP-ACME',
    firstName: 'Thomas',
    lastName: 'Moreau',
    email: 'thomas.moreau@acme-industries.fr',
    phone: '06 11 22 33 44',
    role: 'CLIENT_CONTACT',
    actor: admin,
  });

  assert.ok(contact.id);
  assert.equal(contact.role, 'CLIENT_CONTACT');
  assert.equal(contact.companyId, 'COMP-ACME');
  assert.ok(contact.passwordHash);
  assert.ok(contact.salt);

  // Register beneficiary
  const beneficiary = db.createCompanyUser({
    companyId: 'COMP-ACME',
    firstName: 'Élodie',
    lastName: 'Fontaine',
    email: 'elodie.fontaine@acme-industries.fr',
    role: 'BENEFICIARY',
    actor: admin,
  });

  assert.ok(beneficiary.id);
  assert.equal(beneficiary.role, 'BENEFICIARY');
  assert.equal(beneficiary.companyId, 'COMP-ACME');

  // Verify RBAC isolation: Thomas can only access COMP-ACME, not COMP-BETA
  assert.equal(canAccessCompany(contact, 'COMP-ACME'), true);
  assert.equal(canAccessCompany(contact, 'COMP-BETA'), false);
});

test('Company Users: Rejects duplicate user email', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  assert.throws(
    () => {
      db.createCompanyUser({
        companyId: 'COMP-ACME',
        firstName: 'Lucas',
        lastName: 'Martin',
        email: 'lucas.martin@acme-industries.fr', // already registered
        role: 'BENEFICIARY',
        actor: admin,
      });
    },
    { message: /existe déjà/ }
  );
});

test('Company Enrollment: Directly enrolls employee in a session and generates convocation + convention', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  // 1. Create a new employee for Acme
  const newLearner = db.createCompanyUser({
    companyId: 'COMP-ACME',
    firstName: 'Alexandre',
    lastName: 'Rousseau',
    email: 'alexandre.rousseau@acme-industries.fr',
    role: 'BENEFICIARY',
    actor: admin,
  });

  // 2. Enroll Alexandre in session SESS-2026-01
  const enrollment = db.enrollBeneficiary({
    sessionId: 'SESS-2026-01',
    beneficiaryId: newLearner.id,
    companyId: 'COMP-ACME',
    actor: admin,
  });

  assert.ok(enrollment.id);
  assert.equal(enrollment.status, 'REGISTERED');
  assert.equal(enrollment.beneficiaryId, newLearner.id);
  assert.equal(enrollment.companyId, 'COMP-ACME');

  // 3. Generate Convocation document
  const session = db.sessions.get('SESS-2026-01')!;
  const convSnapshot = {
    reference: `DOC-CNV-TEST-002`,
    beneficiaryName: `${newLearner.firstName} ${newLearner.lastName}`,
    companyName: 'Acme Industries SAS',
    trainingTitle: session.title,
    dates: `${session.startDate} au ${session.endDate}`,
    location: session.location,
    organizer: 'Matt Konnect',
  };

  const convDoc = db.generateDocument({
    referenceCode: convSnapshot.reference,
    type: 'CONVOCATION',
    title: `Convocation officielle — ${newLearner.firstName} ${newLearner.lastName}`,
    relatedEntityType: 'ENROLLMENT',
    relatedEntityId: enrollment.id,
    companyId: 'COMP-ACME',
    beneficiaryId: newLearner.id,
    contentSnapshot: convSnapshot,
    actor: admin,
  });

  assert.ok(convDoc.id);
  assert.equal(convDoc.type, 'CONVOCATION');
  assert.ok(convDoc.sha256Fingerprint);
  assert.equal(convDoc.sha256Fingerprint.length, 64);

  // 4. Update enrollment status to CONVOKED
  enrollment.status = 'CONVOKED';
  enrollment.convocationSentAt = new Date().toISOString();
  assert.equal(enrollment.status, 'CONVOKED');

  // 5. Generate / Update Convention document
  const conventionParticipants = Array.from(db.enrollments.values())
    .filter((e) => e.sessionId === session.id && e.companyId === 'COMP-ACME')
    .map((e) => {
      const u = db.users.get(e.beneficiaryId);
      return u ? `${u.firstName} ${u.lastName}` : 'Stagiaire';
    });

  const conventionDoc = db.generateDocument({
    referenceCode: 'CNV-ACME-002',
    type: 'CONVENTION',
    title: `Convention de formation professionnelle — Acme Industries SAS`,
    relatedEntityType: 'SESSION',
    relatedEntityId: session.id,
    companyId: 'COMP-ACME',
    contentSnapshot: {
      reference: 'CNV-ACME-002',
      companyName: 'Acme Industries SAS',
      participants: conventionParticipants,
      sessionTitle: session.title,
    },
    actor: admin,
  });

  assert.ok(conventionDoc.id);
  assert.equal(conventionDoc.type, 'CONVENTION');
  assert.ok(conventionDoc.contentSnapshot.participants.includes('Alexandre Rousseau'));
  assert.ok(conventionDoc.contentSnapshot.participants.includes('Lucas Martin'));
});

