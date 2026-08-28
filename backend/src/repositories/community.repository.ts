import { GateOperationalStatus, GateReportRequest } from '@railway-gate/shared';

export interface StoredGateReport {
  id: string;
  crossingId: string;
  reportedStatus: GateOperationalStatus;
  reportedAt: Date;
  expiresAt: Date;
  trustScore: number;
  reporterIpHash?: string;
  notes?: string;
}

export class CommunityRepository {
  private reports: StoredGateReport[] = [];

  public async saveReport(
    req: GateReportRequest,
    options: { reporterIpHash?: string; trustScore?: number; ttlSeconds?: number } = {}
  ): Promise<StoredGateReport> {
    const ttl = options.ttlSeconds || 900; // 15 minutes default validity
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const report: StoredGateReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      crossingId: req.crossingId,
      reportedStatus: req.reportedStatus,
      reportedAt: now,
      expiresAt,
      trustScore: options.trustScore || 1.0,
      reporterIpHash: options.reporterIpHash,
      notes: req.notes
    };

    this.reports.push(report);
    this.cleanExpired();
    return report;
  }

  public async getActiveReports(crossingId: string): Promise<StoredGateReport[]> {
    this.cleanExpired();
    return this.reports.filter((r) => r.crossingId === crossingId);
  }

  private cleanExpired() {
    const now = new Date();
    this.reports = this.reports.filter((r) => r.expiresAt > now);
  }
}
