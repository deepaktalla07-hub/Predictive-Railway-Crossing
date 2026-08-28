import { Pool } from 'pg';
import { GateOperationalStatus, GateReportRequest } from '@railway-gate/shared';
import { getDatabasePool } from '../../db/pool';

export interface GateReportEntity {
  id: string;
  crossingId: string;
  reportedStatus: GateOperationalStatus;
  sourceType: string;
  confidence: number;
  verificationStatus: string;
  waitTimeMinutes: number | null;
  notes: string | null;
  reportedAt: Date;
  createdAt: Date;
}

export class GateReportDbRepository {
  constructor(private pool: Pool = getDatabasePool()) {}

  public async createReport(report: GateReportRequest): Promise<GateReportEntity> {
    const query = `
      INSERT INTO gate_reports (
        id, crossing_id, reported_status, source_type, confidence,
        verification_status, wait_time_minutes, notes, reported_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, crossing_id as "crossingId", reported_status as "reportedStatus",
                source_type as "sourceType", confidence,
                verification_status as "verificationStatus",
                wait_time_minutes as "waitTimeMinutes", notes,
                reported_at as "reportedAt", created_at as "createdAt";
    `;
    const values = [
      `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      report.crossingId,
      report.reportedStatus,
      report.sourceType || 'COMMUNITY_USER',
      report.confidence || 0.85,
      'VERIFIED',
      report.waitTimeMinutes || null,
      report.notes || null,
      report.reportedAt ? new Date(report.reportedAt) : new Date()
    ];
    const { rows } = await this.pool.query(query, values);
    return rows[0];
  }

  public async getRecentForCrossing(crossingId: string, limit = 10): Promise<GateReportEntity[]> {
    const query = `
      SELECT id, crossing_id as "crossingId", reported_status as "reportedStatus",
             source_type as "sourceType", confidence,
             verification_status as "verificationStatus",
             wait_time_minutes as "waitTimeMinutes", notes,
             reported_at as "reportedAt", created_at as "createdAt"
      FROM gate_reports
      WHERE crossing_id = $1
      ORDER BY reported_at DESC
      LIMIT $2;
    `;
    const { rows } = await this.pool.query(query, [crossingId, limit]);
    return rows;
  }
}
