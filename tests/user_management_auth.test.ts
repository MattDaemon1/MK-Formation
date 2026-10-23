/**
 * Unit & Integration Tests: User Management, RBAC Creation & Self-Registration
 * Verifies:
 * - Admin creation of any role (Admin, Trainer, Client Contact, Beneficiary)
 * - Privilege escalation guard (non-admin cannot create admin/trainers)
 * - Account suspension & password reset
 * - Public self-registration for Enterprises and Trainees
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseStore } from '../src/server/database.ts';

test('User Provisioning: Admin can create a new Trainer account', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  const trainer = db.createUser({
    role: 'TRAINER',
    firstName: 'Julien',
    lastName: 'Morel',
    email: 'julien.morel@mattkonnect.com',
    phone: '06 55 44 33 22',
    password: 'TrainerPass2026!',
    actor: admin,
  });

  assert.ok(trainer.id);
  assert.equal(trainer.role, 'TRAINER');
  assert.equal(trainer.email, 'julien.morel@mattkonnect.com');
  assert.equal(trainer.active, true);

  // Verify authentication succeeds
  const auth = db.authenticate('julien.morel@mattkonnect.com', 'TrainerPass2026!');
  assert.ok(auth);
  assert.equal(auth.user.role, 'TRAINER');
});

test('User Provisioning: Admin can create another Administrator', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  const newAdmin = db.createUser({
    role: 'ADMIN',
    firstName: 'Marc',
    lastName: 'Admin2',
    email: 'marc.admin@mattkonnect.com',
    password: 'AdminPassword2026!',
    actor: admin,
  });

  assert.equal(newAdmin.role, 'ADMIN');
  const auth = db.authenticate('marc.admin@mattkonnect.com', 'AdminPassword2026!');
  assert.ok(auth);
});

test('Security Guard: Non-admin cannot provision users via createUser', () => {
  const db = new DatabaseStore();
  const trainer = db.users.get('USR-TRAIN-01')!;

  assert.throws(
    () => {
      db.createUser({
        role: 'ADMIN',
        firstName: 'Hacker',
        lastName: 'Attempt',
        email: 'hacker@example.com',
        actor: trainer,
      });
    },
    { message: /Seul un administrateur/ }
  );
});

test('Account Lifecycle: Admin can suspend and reactivate a user account', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;
  const trainer = db.users.get('USR-TRAIN-01')!;

  // Suspend
  const suspended = db.toggleUserActive(trainer.id, admin);
  assert.equal(suspended.active, false);

  // Authentication must fail for suspended user
  const authFailed = db.authenticate('sophie.formateur@mattkonnect.com', 'TrainerPass2026!');
  assert.equal(authFailed, null);

  // Reactivate
  const reactivated = db.toggleUserActive(trainer.id, admin);
  assert.equal(reactivated.active, true);

  const authSuccess = db.authenticate('sophie.formateur@mattkonnect.com', 'TrainerPass2026!');
  assert.ok(authSuccess);
});

test('Account Lifecycle: Admin cannot suspend their own account', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;

  assert.throws(
    () => {
      db.toggleUserActive(admin.id, admin);
    },
    { message: /Impossible de désactiver votre propre compte/ }
  );
});

test('Password Management: Admin can reset a user password', () => {
  const db = new DatabaseStore();
  const admin = db.users.get('USR-ADMIN-01')!;
  const learner = db.users.get('USR-BEN-LUCAS')!;

  db.resetUserPassword(learner.id, 'BrandNewPass2026!', admin);

  // Old password fails
  const oldAuth = db.authenticate('lucas.martin@acme-industries.fr', 'LearnerPass2026!');
  assert.equal(oldAuth, null);

  // New password succeeds
  const newAuth = db.authenticate('lucas.martin@acme-industries.fr', 'BrandNewPass2026!');
  assert.ok(newAuth);
});

test('Self-Registration: Public Enterprise Client registration creates company + CLIENT_CONTACT user', () => {
  const db = new DatabaseStore();

  const reg = db.selfRegister({
    accountType: 'COMPANY_CLIENT',
    companyName: 'Nouveau Groupe France SAS',
    siren: '987654321',
    firstName: 'Béatrice',
    lastName: 'Vidal',
    email: 'beatrice.vidal@nouveau-groupe.fr',
    password: 'SecurePassword2026!',
    city: 'Lyon',
    postalCode: '69001',
  });

  assert.ok(reg.user.id);
  assert.equal(reg.user.role, 'CLIENT_CONTACT');
  assert.ok(reg.user.companyId);
  assert.ok(reg.token);

  // Verify company was created in database
  const comp = db.companies.get(reg.user.companyId);
  assert.ok(comp);
  assert.equal(comp.name, 'Nouveau Groupe France SAS');
  assert.equal(comp.siren, '987654321');

  // Verify can authenticate with credentials
  const auth = db.authenticate('beatrice.vidal@nouveau-groupe.fr', 'SecurePassword2026!');
  assert.ok(auth);
});

test('Self-Registration: Public Beneficiary registration attaches to existing company with role BENEFICIARY', () => {
  const db = new DatabaseStore();

  const reg = db.selfRegister({
    accountType: 'BENEFICIARY',
    companyId: 'COMP-ACME',
    firstName: 'Paul',
    lastName: 'Giraud',
    email: 'paul.giraud@acme-industries.fr',
    password: 'TraineeSecurePass2026!',
  });

  assert.ok(reg.user.id);
  assert.equal(reg.user.role, 'BENEFICIARY');
  assert.equal(reg.user.companyId, 'COMP-ACME');

  const auth = db.authenticate('paul.giraud@acme-industries.fr', 'TraineeSecurePass2026!');
  assert.ok(auth);
});

test('Session Lifecycle: appState supports login, logout, and authentication status', async () => {
  const { appState } = await import('../src/services/appState.ts');

  // Verify authenticated initially
  assert.equal(appState.isAuthenticated(), true);

  // Logout clears session
  appState.logout();
  assert.equal(appState.isAuthenticated(), false);

  // Invalid login fails
  const failed = appState.login('unknown@test.com', 'badpass');
  assert.equal(failed, false);
  assert.equal(appState.isAuthenticated(), false);

  // Valid login restores session
  const success = appState.login('marc.dupont@mattkonnect.com', 'AdminPass2026!');
  assert.equal(success, true);
  assert.equal(appState.isAuthenticated(), true);
  assert.equal(appState.getCurrentUser().role, 'ADMIN');
  assert.equal(appState.getCurrentUser().firstName, 'Marc');
  assert.equal(appState.getCurrentUser().lastName, 'Dupont');
});
