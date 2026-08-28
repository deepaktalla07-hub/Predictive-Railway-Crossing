import { Coordinate } from './geo.types';
import { GateOperationalStatus } from './crossing.types';
import { ProvenanceMetadata } from './provenance.types';

export type UserReportableStatus = 'OPEN' | 'CLOSING' | 'CLOSED' | 'OPENED' | 'OPENING';

export interface CommunityGateReportRequest {
  crossingId: string;
  status: UserReportableStatus;
  timestamp?: string; // ISO-8601 (defaults to now)
  approximateLocation: Coordinate;
  notes?: string;
  reporterSessionId?: string;
}

// Backward-compatible alias
export interface GateReportRequest {
  crossingId: string;
  reportedStatus: GateOperationalStatus;
  reporterCoordinate?: Coordinate;
  approximateLocation?: Coordinate;
  status?: UserReportableStatus;
  sourceType?: string;
  confidence?: number;
  waitTimeMinutes?: number;
  notes?: string;
  reportedAt?: string;
  timestamp?: string;
  reporterSessionId?: string;
}

export interface CommunityConfidenceMetrics {
  recencyWeight: number;       // 0.0 to 1.0 based on age decay
  independentReportsCount: number;
  averageDistanceMeters: number;
  distanceWeight: number;      // 0.0 to 1.0 based on reporter proximity
  agreementRatio: number;      // 0.0 to 1.0 consensus among recent reports
  overallConfidence: number;   // Combined 0.0 to 1.0 score
}

export interface CommunityCrossingStatusResult {
  crossingId: string;
  crossingCode: string;
  status: GateOperationalStatus;
  label: 'COMMUNITY REPORTED';
  isOfficialData: false;
  confidenceScore: number;
  confidenceMetrics: CommunityConfidenceMetrics;
  recentReportsCount: number;
  lastReportedAt: string;
  disclaimer: string;
  provenance: ProvenanceMetadata;
}

export interface GateReportResponse {
  success: boolean;
  reportId: string;
  crossingId: string;
  appliedStatus: GateOperationalStatus;
  consensusScore: number;
  label: 'COMMUNITY REPORTED';
  message: string;
  expiresAt: string;
  disclaimer: string;
}
