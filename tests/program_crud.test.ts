/**
 * Unit & Integration Tests: Catalog Program CRUD & Qualiopi Versioning
 * Verifies dynamic creation, modification, versioning, archive and safe deletion of training programs.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseStore } from '../src/server/database.ts';

test('Catalog CRUD: Creates a new training program with its initial version v1', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  const newProg = db.createProgram({
    title: 'Architecture Microservices & APIs Haute Performance',
    referenceCode: 'MK-DEV-02',
    category: 'Architecture Logicielle',
    summary: 'Concevoir des architectures distribuées résilientes et scalables.',
    durationHours: 21,
    durationDays: 3,
    priceHtCents: 240000, // 2 400.00 EUR
    objectives: ['Maîtriser les patterns microservices', 'Sécuriser les échanges d’APIs'],
    prerequisites: ['Bonne pratique de Docker et du développement backend'],
    targetAudience: ['Architectes logiciels, Lead Devs'],
    actor: admin,
  });

  assert.equal(newProg.title, 'Architecture Microservices & APIs Haute Performance');
  assert.equal(newProg.referenceCode, 'MK-DEV-02');
  assert.equal(newProg.active, true);
  assert.ok(newProg.currentVersionId);

  const version = db.programVersions.get(newProg.currentVersionId);
  assert.ok(version);
  assert.equal(version.versionNumber, 1);
  assert.equal(version.durationHours, 21);
  assert.equal(version.priceHtCents, 240000);
});

test('Catalog CRUD: Rejects duplicate program reference code', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  // Try to create another program with the existing reference MK-SEC-01
  assert.throws(
    () => {
      db.createProgram({
        title: 'Doublon Programme',
        referenceCode: 'MK-SEC-01',
        category: 'Test',
        summary: 'Test',
        durationHours: 7,
        durationDays: 1,
        priceHtCents: 100000,
        objectives: ['Test'],
        prerequisites: ['None'],
        targetAudience: ['All'],
        actor: admin,
      });
    },
    { message: /existe déjà/ }
  );
});

test('Catalog CRUD: Updates program details and toggles active status', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  const prog = db.programs.get('PROG-MK-CYBER')!;

  const updated = db.updateProgram({
    id: prog.id,
    title: 'Cybersécurité Avancée & Audit OWASP 2026',
    referenceCode: 'MK-SEC-01-V2026',
    category: 'Sécurité Offensive & Défensive',
    summary: 'Programme actualisé avec les nouveaux vecteurs d’attaques.',
    active: false,
    actor: admin,
  });

  assert.equal(updated.title, 'Cybersécurité Avancée & Audit OWASP 2026');
  assert.equal(updated.referenceCode, 'MK-SEC-01-V2026');
  assert.equal(updated.active, false);

  // Toggle back to active
  const reactivated = db.toggleProgramActive(prog.id, admin);
  assert.equal(reactivated.active, true);
});

test('Catalog CRUD: Versioning creates version v2 while keeping v1 intact', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  const prog = db.programs.get('PROG-MK-CYBER')!;
  const v1 = db.programVersions.get(prog.currentVersionId)!;
  assert.equal(v1.versionNumber, 1);

  const v2 = db.createProgramVersion({
    programId: prog.id,
    changelogNotes: 'Mise à niveau vers l’OWASP Top 10 2026',
    durationHours: 21,
    durationDays: 3,
    priceHtCents: 220000,
    objectives: [...v1.objectives, 'Maîtriser les audits de dépendances automatisés'],
    prerequisites: v1.prerequisites,
    targetAudience: v1.targetAudience,
    evaluationMethods: v1.evaluationMethods,
    pedagogicalMeans: v1.pedagogicalMeans,
    modules: v1.modules,
    actor: admin,
  });

  assert.equal(v2.versionNumber, 2);
  assert.equal(prog.currentVersionId, v2.id);
  // v1 is still intact in the database
  assert.equal(db.programVersions.get(v1.id)?.versionNumber, 1);
});

test('Catalog CRUD: Blocks deletion if sessions are linked and allows deletion if no sessions linked', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  // 1. PROG-MK-CYBER is used by SESS-2026-01 -> Deletion must be blocked
  assert.throws(
    () => {
      db.deleteProgram('PROG-MK-CYBER', admin);
    },
    { message: /Suppression impossible/ }
  );

  // 2. Create a temporary program with no sessions
  const tempProg = db.createProgram({
    title: 'Programme Temporaire',
    referenceCode: 'TEMP-01',
    category: 'Test',
    summary: 'Sans session',
    durationHours: 7,
    durationDays: 1,
    priceHtCents: 50000,
    objectives: ['Test'],
    prerequisites: ['None'],
    targetAudience: ['All'],
    actor: admin,
  });

  assert.ok(db.programs.has(tempProg.id));

  // Deletion must succeed
  const deleted = db.deleteProgram(tempProg.id, admin);
  assert.equal(deleted, true);
  assert.equal(db.programs.has(tempProg.id), false);
});
