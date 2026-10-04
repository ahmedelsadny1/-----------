import { ulid } from 'ulid';
import { getSqlite } from '../connection.js';

export interface SyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  idempotencyKey: string;
  retryCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  lastError?: string;
  createdAt: string;
}

export class SyncRepository {
  enqueue(
    entityType: string,
    entityId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: any,
    idempotencyKey: string,
  ): void {
    const sqlite = getSqlite();
    const id = ulid();
    const now = new Date().toISOString();

    sqlite
      .prepare(
        `INSERT OR IGNORE INTO sync_queue (
          id, entity_type, entity_id, operation, payload,
          idempotency_key, retry_count, max_retries, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 10, 'PENDING', ?)`,
      )
      .run(id, entityType, entityId, operation, JSON.stringify(payload), idempotencyKey, now);
  }

  getPendingQueue(limit = 50): SyncQueueItem[] {
    const sqlite = getSqlite();
    const rows = sqlite
      .prepare(
        `SELECT * FROM sync_queue
         WHERE status IN ('PENDING', 'FAILED') AND retry_count < max_retries
         ORDER BY created_at ASC LIMIT ?`,
      )
      .all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      operation: r.operation,
      payload: JSON.parse(r.payload),
      idempotencyKey: r.idempotency_key,
      retryCount: r.retry_count,
      status: r.status,
      lastError: r.last_error,
      createdAt: r.created_at,
    }));
  }

  markCompleted(id: string): void {
    const sqlite = getSqlite();
    sqlite
      .prepare(
        `UPDATE sync_queue SET status = 'COMPLETED', processed_at = ? WHERE id = ?`,
      )
      .run(new Date().toISOString(), id);
  }

  markFailed(id: string, error: string): void {
    const sqlite = getSqlite();
    sqlite
      .prepare(
        `UPDATE sync_queue SET
          status = 'FAILED',
          retry_count = retry_count + 1,
          last_error = ?
         WHERE id = ?`,
      )
      .run(error, id);
  }

  getStats(): { pendingCount: number; failedCount: number } {
    const sqlite = getSqlite();
    const pending = sqlite
      .prepare(`SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING'`)
      .get() as { count: number };
    const failed = sqlite
      .prepare(`SELECT COUNT(*) as count FROM sync_queue WHERE status = 'FAILED'`)
      .get() as { count: number };

    return {
      pendingCount: pending?.count || 0,
      failedCount: failed?.count || 0,
    };
  }
}
