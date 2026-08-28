import { ProvenanceMetadata } from './provenance.types';

export enum PredictionConfidenceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  UNKNOWN = 'UNKNOWN'
}

export interface TimeWindow {
  startTime: string; // ISO-8601
  endTime: string;   // ISO-8601
}

export interface GateClosureWindow {
  closeStartTime: string; // ISO-8601
  reopenTime: string;     // ISO-8601
  durationSeconds: number;
}

export interface PredictionUncertaintyWindow {
  plusMinusSeconds: number;     // e.g. 90
  formattedText: string;        // e.g. "± 1 min 30 sec"
  earliestCrossingTime: string; // ISO-8601
  latestCrossingTime: string;   // ISO-8601
}

export interface PredictedTrainEvent {
  trainNumber: string;
  trainName: string;
  estimatedCrossingTime: string; // ISO-8601 (T_cross_nominal)
  uncertaintyBufferSeconds: number;
  gateClosureWindow: GateClosureWindow;
  temporalOverlapSeconds: number;
  confidenceScore: number;
  provenance: ProvenanceMetadata;
}

export interface TrainCrossingPredictionResult {
  trainNumber: string;
  trainName: string;
  crossingId: string;
  crossingCode: string;
  crossingName: string | null;
  predictedCrossingTime: string | null; // ISO-8601 or null if UNKNOWN
  formattedCrossingTime: string | null; // e.g. "09:59:20"
  confidence: PredictionConfidenceLevel;
  confidenceScore: number;              // 0.0 to 1.0
  method: 'LIVE_GPS_INTERPOLATION' | 'STATION_PROGRESS_KINEMATIC' | 'STATIC_TIMETABLE_INTERPOLATION' | 'UNKNOWN';
  reason: string;                       // e.g. "Based on current train position and route ETA."
  dataSources: string[];
  lastUpdated: string;                  // ISO-8601
  uncertaintyWindow: PredictionUncertaintyWindow | null;
  isApproaching: boolean;
  distanceToCrossingMeters: number | null;
  direction: 'UP' | 'DOWN' | 'TOWARDS_CROSSING' | 'AWAY_FROM_CROSSING' | 'UNKNOWN';
  currentOrLastStation: string | null;
  nextStation: string | null;
  delayMinutes: number | null;
  provenance: ProvenanceMetadata;
}
