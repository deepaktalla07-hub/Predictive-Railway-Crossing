/**
 * Data provenance and integrity classification.
 * Prevents unverified or fabricated data from being treated as authoritative.
 */

export enum DataProvenanceType {
  OFFICIAL = 'OFFICIAL',                         // Official static timetable or government rail feed
  REAL_TIME_PROVIDER = 'REAL-TIME PROVIDER',     // Verified live train telemetry / API
  OPEN_DATA = 'OPEN DATA',                       // OpenStreetMap Overpass spatial infrastructure
  COMMUNITY = 'COMMUNITY',                       // Crowdsourced gate report with proximity validation
  CALCULATED = 'CALCULATED',                     // Kinematic algorithm interpolation
  ESTIMATED = 'ESTIMATED',                       // Traffic-aware ETA / arrival prediction
  UNKNOWN = 'UNKNOWN',                           // Missing, unverified, or expired data

  // Backward-compatible aliases
  OFFICIAL_RAIL = 'OFFICIAL',
  OPEN_GEO_OSM = 'OPEN DATA',
  THIRD_PARTY_VERIFIED = 'REAL-TIME PROVIDER',
  CALCULATED_ESTIMATE = 'CALCULATED',
  COMMUNITY_REPORTED = 'COMMUNITY',
  UNVERIFIED_DEV_STUB = 'UNKNOWN'
}

export type ProvenanceCategory =
  | 'OFFICIAL'
  | 'REAL-TIME PROVIDER'
  | 'OPEN DATA'
  | 'COMMUNITY'
  | 'CALCULATED'
  | 'ESTIMATED'
  | 'UNKNOWN';

export interface DataSourceProvenanceEntry {
  category: ProvenanceCategory;
  sourceName: string;
  attribution: string;
  license?: string;
  isRealtime: boolean;
  freshnessSec: number;
  lastUpdated: string;
  confidenceScore: number;
  notes?: string;
}

export interface ProvenanceMetadata {
  sourceType: DataProvenanceType;
  providerName: string;
  confidenceScore: number; // 0.0 to 1.0
  lastSyncedAt?: string;
  isRealtime: boolean;
  notes?: string;
  license?: string;
  referenceId?: string;
}
