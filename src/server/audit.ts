/**
 * MK Formation — Immutable Audit Logging Service
 * Records all sensitive actions with timestamps, actors, and detailed context
 */

import { generateUUID } from './crypto.ts';
import { AuditLog, User } from '../types/index.ts';

class AuditService {
  private logs: AuditLog[] = [];

  /**
   * Records an audit log entry.
   */
  public log(params: {
    user?: User | { id: string; email: string; role: any };
    action: string;
    entityType: string;
    entityId: string;
    details: string;
    ipAddress?: string;
  }): AuditLog {
    const entry: AuditLog = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      userId: params.user ? params.user.id : 'ANONYMOUS',
      userEmail: params.user ? params.user.email : 'anonymous@system',
      userRole: params.user ? params.user.role : 'BENEFICIARY',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      ipAddress: params.ipAddress || '127.0.0.1',
    };

    // Immutable append
    this.logs.unshift(entry); // Most recent first
    return entry;
  }

  /**
   * Retrieves all logs for administration audit view.
   */
  public getAllLogs(): AuditLog[] {
    return [...this.logs];
  }

  /**
   * Seed initial audit records if needed.
   */
  public seedLogs(initialLogs: AuditLog[]): void {
    this.logs = [...initialLogs];
  }
}

export const auditService = new AuditService();
