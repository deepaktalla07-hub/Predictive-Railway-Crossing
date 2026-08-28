import { Coordinate } from './geo.types';
import { CrossingGateType } from './crossing.types';
import { PredictedTrainEvent } from './prediction.types';
import { ProvenanceMetadata } from './provenance.types';

export enum RiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  UNKNOWN = 'UNKNOWN',

  // Backward-compatible aliases
  CLEAR = 'LOW',
  LOW_RISK = 'LOW',
  MODERATE_WARNING = 'MODERATE',
  HIGH_RISK_BLOCK = 'HIGH'
}

export interface CrossingRiskThresholds {
  highRiskTimeDifferenceSeconds: number;     // e.g. 180 (within 3 mins = HIGH)
  moderateRiskTimeDifferenceSeconds: number; // e.g. 480 (within 8 mins = MODERATE)
  lowRiskTimeDifferenceSeconds: number;      // e.g. > 480 = LOW
  preClosureBufferSeconds: number;           // e.g. 360
  postClearanceBufferSeconds: number;        // e.g. 120
  minConfidenceThreshold: number;           // e.g. 0.4
}

export const DEFAULT_RISK_THRESHOLDS: CrossingRiskThresholds = {
  highRiskTimeDifferenceSeconds: 180,     // <= 3 mins
  moderateRiskTimeDifferenceSeconds: 480, // <= 8 mins
  lowRiskTimeDifferenceSeconds: 900,      // > 8 mins
  preClosureBufferSeconds: 360,           // 6 mins
  postClearanceBufferSeconds: 120,          // 2 mins
  minConfidenceThreshold: 0.4
};

export interface CrossingRiskComparisonResult {
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';
  timeDifferenceSeconds: number | null; // Train crossing time - User arrival time (magnitude)
  formattedTimeDifference: string;      // e.g. "30 seconds" or "3 min 15 sec"
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  confidenceScore: number;
  reason: string;                       // e.g. "High risk of encountering a closed railway crossing."
  trainCrossingTime: string | null;
  userArrivalTime: string | null;
  isGradeSeparated: boolean;
  lastUpdated: string;
  provenance: ProvenanceMetadata;
}

export interface RiskEvaluation {
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  recommendation: 'PROCEED' | 'MONITOR' | 'CONSIDER_DEPARTURE_SHIFT' | 'AVOID_CROSSING' | 'MANUAL_VERIFICATION';
  summary: string;
  delaySeveritySeconds: number;
  confidenceScore: number;
}

export interface CrossingRiskDetail {
  crossingId: string;
  crossingCode: string;
  name: string;
  location: Coordinate;
  gateType: CrossingGateType;
  isGradeSeparated: boolean;
  distanceFromRouteStartMeters: number;
  userEtaAtCrossing: {
    arrivalTime: string;
    timeFromDepartureSeconds: number;
    arrivalWindow: {
      minArrival: string;
      maxArrival: string;
    };
  };
  predictedTrainEvents: PredictedTrainEvent[];
  riskEvaluation: RiskEvaluation;
  riskComparison?: CrossingRiskComparisonResult;
  provenance: ProvenanceMetadata;
}

export interface RouteRiskSummary {
  overallRiskLevel: RiskLevel;
  maxRiskScore: number;
  totalCrossingsCount: number;
  conflictingCrossingsCount: number;
  maxPotentialDelaySeconds: number;
  summaryRecommendation: string;
}
