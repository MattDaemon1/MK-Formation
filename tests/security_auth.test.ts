/**
 * Unit & Security Tests: Authentication & Cryptographic Security
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, generateSecureToken, computeSha256Fingerprint } from '../src/server/crypto.ts';
import { DatabaseStore } from '../src/server/database.ts';

test('Security Auth: Password hashing generates distinct salts and validates matching password', () => {
  const p1 = hashPassword('SecretPassword123!');
  const p2 = hashPassword('SecretPassword123!');

  // Unique salt per hash
  assert.notEqual(p1.salt, p2.salt);
  assert.notEqual(p1.hash, p2.hash);

  // Correct verification
  assert.equal(verifyPassword('SecretPassword123!', p1.hash, p1.salt), true);
  assert.equal(verifyPassword('SecretPassword123!', p2.hash, p2.salt), true);

  // Incorrect verification fails
  assert.equal(verifyPassword('WrongPassword!', p1.hash, p1.salt), false);
  assert.equal(verifyPassword('', p1.hash, p1.salt), false);
});

test('Security Auth: Secure tokens have sufficient entropy and uniqueness', () => {
  const t1 = generateSecureToken(32);
  const t2 = generateSecureToken(32);

  assert.equal(t1.length, 64); // 32 bytes hex = 64 characters
  assert.notEqual(t1, t2);
});

test('Security Auth: SHA-256 fingerprint produces deterministic hash for document snapshot', () => {
  const dataA = { title: 'Convention 2026', total: 180000, company: 'Acme' };
  const dataB = { company: 'Acme', title: 'Convention 2026', total: 180000 };

  const hashA = computeSha256Fingerprint(dataA);
  const hashB = computeSha256Fingerprint(dataB);

  // Key order independent
  assert.equal(hashA, hashB);
  assert.equal(hashA.length, 64);

  // Change produces different hash
  const dataC = { ...dataA, total: 180001 };
  assert.notEqual(computeSha256Fingerprint(dataC), hashA);
});

test('Security Auth: Store authentication succeeds for valid credentials and rejects invalid', () => {
  const db = new DatabaseStore();

  const authSuccess = db.authenticate('admin@mattkonnect.com', 'AdminPass2026!');
  assert.ok(authSuccess);
  assert.equal(authSuccess.user.email, 'admin@mattkonnect.com');
  assert.equal(authSuccess.user.role, 'ADMIN');
  assert.ok(authSuccess.token);

  // Invalid password
  const authFailPass = db.authenticate('admin@mattkonnect.com', 'WrongPass!');
  assert.equal(authFailPass, null);

  // Unknown email
  const authFailEmail = db.authenticate('hacker@unknown.com', 'AdminPass2026!');
  assert.equal(authFailEmail, null);
});
