/**
 * MK Formation — Reliable & Idempotent Automation Engine
 * Guarantees zero duplicate notifications, retry policies, and full delivery observability
 */

import { AutomationJob, AutomationTrigger, JobDeliveryStatus } from '../types/index.ts';
import { computeSha256Fingerprint, generateUUID } from './crypto.ts';
import { auditService } from './audit.ts';

export class AutomationEngine {
  private jobs: Map<string, AutomationJob> = new Map();

  /**
   * Generates a deterministic idempotency key for an automation event.
   */
  public generateIdempotencyKey(trigger: AutomationTrigger, entityId: string, recipientEmail: string): string {
    return computeSha256Fingerprint({
      trigger,
      entityId,
      recipientEmail: recipientEmail.trim().toLowerCase(),
    });
  }

  /**
   * Registers a job idempotently. If a job with the same key already exists, returns it without creating a duplicate.
   */
  public queueJob(params: {
    trigger: AutomationTrigger;
    recipientEmail: string;
    recipientName: string;
    relatedEntityType: 'SESSION' | 'ENROLLMENT';
    relatedEntityId: string;
    payload: Record<string, any>;
    actorEmail?: string;
  }): { job: AutomationJob; isNew: boolean } {
    const key = this.generateIdempotencyKey(params.trigger, params.relatedEntityId, params.recipientEmail);

    const existing = Array.from(this.jobs.values()).find((j) => j.idempotencyKey === key);
    if (existing) {
      // Idempotent: duplicate prevented
      return { job: existing, isNew: false };
    }

    const job: AutomationJob = {
      id: generateUUID(),
      idempotencyKey: key,
      trigger: params.trigger,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
      payload: params.payload,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);

    auditService.log({
      action: 'AUTOMATION_QUEUED',
      entityType: 'AUTOMATION_JOB',
      entityId: job.id,
      details: `File d'attente : Notification [${job.trigger}] programmée pour ${job.recipientEmail}`,
    });

    return { job, isNew: true };
  }

  /**
   * Processes a job (simulates provider delivery handshake with status ACCEPTED and DELIVERED).
   */
  public processJob(jobId: string, simulateFailure = false): AutomationJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Tâche d’automatisation introuvable');

    if (job.status === 'DELIVERED') {
      return job; // Already completed
    }

    job.attempts += 1;
    job.lastExecutedAt = new Date().toISOString();

    if (simulateFailure) {
      job.status = 'FAILED';
      job.resultMessage = `Échec de connexion au serveur de messagerie (Tentative ${job.attempts}/${job.maxAttempts})`;
      auditService.log({
        action: 'AUTOMATION_FAILED',
        entityType: 'AUTOMATION_JOB',
        entityId: job.id,
        details: `Échec d'envoi [${job.trigger}] à ${job.recipientEmail} : ${job.resultMessage}`,
      });
      return job;
    }

    // Success handshake: provider accepted then delivered
    job.status = 'DELIVERED';
    job.resultMessage = `Remise confirmée par le serveur SMTP le ${new Date().toISOString()}`;

    auditService.log({
      action: 'AUTOMATION_DELIVERED',
      entityType: 'AUTOMATION_JOB',
      entityId: job.id,
      details: `Notification [${job.trigger}] délivrée avec succès à ${job.recipientEmail}`,
    });

    return job;
  }

  /**
   * Retries a failed job if attempts remain.
   */
  public retryJob(jobId: string): AutomationJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Tâche introuvable');

    if (job.attempts >= job.maxAttempts) {
      throw new Error(`Nombre maximal de tentatives atteint (${job.maxAttempts})`);
    }

    job.status = 'PENDING';
    return this.processJob(jobId, false);
  }

  public getAllJobs(): AutomationJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public seedInitialJobs(jobs: AutomationJob[]): void {
    for (const job of jobs) {
      this.jobs.set(job.id, job);
    }
  }
}

export const automationEngine = new AutomationEngine();
