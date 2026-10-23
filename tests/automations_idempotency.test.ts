/**
 * Unit & Integration Tests: Reliable & Idempotent Automations
 * Enforces prompt section 7 rules:
 * - Deduplication via idempotency keys
 * - Retries and max attempts enforcement
 * - Traceable delivery status (PENDING / ACCEPTED / DELIVERED / FAILED)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomationEngine } from '../src/server/automations.ts';

test('Automations: Idempotency prevents duplicate job creation for same event and recipient', () => {
  const engine = new AutomationEngine();

  // First scheduling of a convocation
  const res1 = engine.queueJob({
    trigger: 'CONVOCATION_ISSUED',
    recipientEmail: 'lucas.martin@acme-industries.fr',
    recipientName: 'Lucas Martin',
    relatedEntityType: 'ENROLLMENT',
    relatedEntityId: 'ENR-2026-01',
    payload: { sessionRef: 'SESS-2026-001' },
  });

  assert.equal(res1.isNew, true);
  assert.equal(res1.job.status, 'PENDING');
  assert.equal(res1.job.attempts, 0);

  // Immediate replay / duplicate trigger attempt
  const res2 = engine.queueJob({
    trigger: 'CONVOCATION_ISSUED',
    recipientEmail: 'lucas.martin@acme-industries.fr',
    recipientName: 'Lucas Martin',
    relatedEntityType: 'ENROLLMENT',
    relatedEntityId: 'ENR-2026-01',
    payload: { sessionRef: 'SESS-2026-001' },
  });

  // MUST NOT create duplicate
  assert.equal(res2.isNew, false);
  assert.equal(res2.job.id, res1.job.id);
  assert.equal(engine.getAllJobs().length, 1);
});

test('Automations: Different triggers or different recipients generate separate jobs', () => {
  const engine = new AutomationEngine();

  const job1 = engine.queueJob({
    trigger: 'CONVOCATION_ISSUED',
    recipientEmail: 'stagiaire1@acme.fr',
    recipientName: 'Stagiaire 1',
    relatedEntityType: 'ENROLLMENT',
    relatedEntityId: 'ENR-01',
    payload: {},
  });

  const job2 = engine.queueJob({
    trigger: 'CONVOCATION_ISSUED',
    recipientEmail: 'stagiaire2@acme.fr',
    recipientName: 'Stagiaire 2',
    relatedEntityType: 'ENROLLMENT',
    relatedEntityId: 'ENR-02',
    payload: {},
  });

  const job3 = engine.queueJob({
    trigger: 'SESSION_REMINDER_J7',
    recipientEmail: 'stagiaire1@acme.fr',
    recipientName: 'Stagiaire 1',
    relatedEntityType: 'ENROLLMENT',
    relatedEntityId: 'ENR-01',
    payload: {},
  });

  assert.notEqual(job1.job.id, job2.job.id);
  assert.notEqual(job1.job.id, job3.job.id);
  assert.equal(engine.getAllJobs().length, 3);
});

test('Automations: Failed deliveries are recorded and can be retried up to maxAttempts', () => {
  const engine = new AutomationEngine();

  const { job } = engine.queueJob({
    trigger: 'SESSION_REMINDER_J1',
    recipientEmail: 'lucas.martin@acme-industries.fr',
    recipientName: 'Lucas Martin',
    relatedEntityType: 'SESSION',
    relatedEntityId: 'SESS-01',
    payload: {},
  });

  // Attempt 1 fails
  const failedJob1 = engine.processJob(job.id, true);
  assert.equal(failedJob1.status, 'FAILED');
  assert.equal(failedJob1.attempts, 1);

  // Attempt 2 fails
  const failedJob2 = engine.processJob(job.id, true);
  assert.equal(failedJob2.status, 'FAILED');
  assert.equal(failedJob2.attempts, 2);

  // Attempt 3 succeeds
  const successJob = engine.processJob(job.id, false);
  assert.equal(successJob.status, 'DELIVERED');
  assert.equal(successJob.attempts, 3);
  assert.match(successJob.resultMessage!, /Remise confirmée/);
});
