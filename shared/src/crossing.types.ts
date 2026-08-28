import { Coordinate } from './geo.types';
import { ProvenanceMetadata } from './provenance.types';

export enum CrossingGateType {
  MANUAL_INTERLOCKED = 'MANUAL_INTERLOCKED',
  AUTOMATIC_BARRIER = 'AUTOMATIC_BARRIER',
  UNMANNED_OPEN = 'UNMANNED_OPEN',
  SPECIAL_GRADE = 'SPECIAL_GRADE',
  UNKNOWN = 'UNKNOWN'
}

export enum GateOperationalStatus {
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  OPENING = 'OPENING',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Standard Railway Crossing Record adhering to strict data integrity.
 * Missing attributes are explicitly stored as null/unknown.
 */
export interface RailwayCrossingRecord {
  id: string;                    // Unique identifier (e.g. 'osm-node-293711133')
  name: string | null;           // Official or descriptive name (null if unmapped)
  latitude: number;              // Real WGS84 latitude
  longitude: number;             // Real WGS84 longitude
  railwayLine: string | null;    // Real railway corridor or line code (null if unmapped)
  roadName: string | null;       // Real road or highway name (null if unmapped)
  source: string;                // e.g. 'OpenStreetMap Overpass API (ODbL)'
  sourceId: string;              // e.g. 'node/293711133'
  lastUpdated: string;           // ISO timestamp

  // Real physical attributes (when mapped)
  crossingCode: string;          // e.g. 'LC-134' or 'LC-OSM-293711133'
  gateType: CrossingGateType;
  preClosureBufferSeconds: number;
  postClearanceBufferSeconds: number;
  averageClosureDurationSeconds: number;
  isGradeSeparated: boolean;
  tracksCount: number | null;
  confidenceScore: number;
  osmTags?: Record<string, string>;
  provenance: ProvenanceMetadata;
}

// Backward-compatible alias
export type RailwayCrossing = RailwayCrossingRecord;

export interface LiveCrossingStatus {
  crossingId: string;
  currentStatus: GateOperationalStatus;
  estimatedReopenTime?: string;
  activeClosureReason?: string;
  confidence: number;
  lastUpdated: string;
  source: string;
}

/**
 * Result of detecting a railway level-crossing along an actual road route geometry.
 */
export interface DetectedCrossing {
  crossingId: string;
  crossingName: string | null;
  routePosition: {
    segmentIndex: number;
    fractionAlongSegment: number;
    normalizedPosition: number; // 0.0 (start) to 1.0 (destination)
    coordinates: Coordinate;
  };
  distance: number; // Distance in meters along the actual road route from start
  estimatedArrivalTime: string; // ISO 8601 timestamp
  source: string;

  // Additional context
  crossingCode: string;
  railwayLine: string | null;
  roadName: string | null;
  gateType: CrossingGateType;
  isGradeSeparated: boolean;
  distanceFromRouteCenterlineMeters: number;
  lastUpdated: string;
  rawCrossing: RailwayCrossingRecord;
}
