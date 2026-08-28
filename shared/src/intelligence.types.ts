import { Coordinate } from './geo.types';
import { CrossingGateType, GateOperationalStatus } from './crossing.types';
import { DataSourceProvenanceEntry, ProvenanceCategory } from './provenance.types';
import { RiskLevel } from './risk.types';

export interface IntelligenceCrossingStatus {
  status: GateOperationalStatus;
  gateType: CrossingGateType;
  isGradeSeparated: boolean;
  tracksCount: number;
  provenanceCategory: ProvenanceCategory;
  summary: string;
}

export interface IntelligenceTrainInformation {
  trainNumber: string | null;
  trainName: string | null;
  currentPosition: {
    latitude: number;
    longitude: number;
    speedKmh: number;
    lastStationPassed: string | null;
    nextStationExpected: string | null;
    isLiveGps: boolean;
  } | null;
  routeDistanceToCrossingMeters: number | null;
  trainETAAtCrossing: string | null;
  delayMinutes: number;
  trainStatus: 'RUNNING' | 'DELAYED' | 'ON_TIME' | 'STOPPED' | 'CANCELLED' | 'UNKNOWN';
  provenanceCategory: ProvenanceCategory;
}

export interface IntelligencePredictedCrossingTime {
  predictedCrossingTime: string | null; // ISO-8601
  formattedCrossingTime: string | null; // e.g. "09:15:30"
  closureStartTime: string | null;      // ISO-8601
  reopenTime: string | null;            // ISO-8601
  closureDurationSeconds: number;
  uncertaintyBufferSeconds: number;
  provenanceCategory: 'CALCULATED';
}

export interface IntelligenceUserArrivalTime {
  arrivalTime: string; // ISO-8601
  formattedArrivalTime: string; // e.g. "09:15:00"
  distanceFromStartMeters: number;
  formattedDistance: string; // e.g. "10.0 km"
  estimatedTravelTimeSeconds: number;
  formattedTravelTime: string; // e.g. "15 min"
  uncertaintyWindow: {
    minArrival: string;
    maxArrival: string;
    plusMinusSeconds: number;
    formattedText: string;
  };
  trafficAware: boolean;
  trafficCondition: 'FREE_FLOW' | 'MODERATE' | 'HEAVY' | 'UNVERIFIED';
  provenanceCategory: 'ESTIMATED';
}

export interface IntelligenceTimeDifference {
  seconds: number | null;
  formattedText: string; // e.g. "30 seconds"
  relativeTiming: 'TRAIN_BEFORE_USER' | 'TRAIN_AFTER_USER' | 'COINCIDENT' | 'UNKNOWN';
}

export interface IntelligenceConfidence {
  overallScore: number; // 0.0 to 1.0
  level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  explanation: string;
}

export interface CrossingIntelligenceRecord {
  crossingId: string;
  crossingCode: string;
  crossingName: string;
  location: Coordinate;
  crossingStatus: IntelligenceCrossingStatus;
  trainInformation: IntelligenceTrainInformation;
  predictedTrainCrossingTime: IntelligencePredictedCrossingTime;
  userArrivalTime: IntelligenceUserArrivalTime;
  timeDifference: IntelligenceTimeDifference;
  riskLevel: RiskLevel;
  confidence: IntelligenceConfidence;
  dataSources: DataSourceProvenanceEntry[];
  lastUpdated: string;
  recommendation: string;
}

export interface RouteIntelligenceSummary {
  overallRiskLevel: RiskLevel;
  totalCrossingsCount: number;
  conflictingCrossingsCount: number;
  highestRiskCrossing: CrossingIntelligenceRecord | null;
  crossings: CrossingIntelligenceRecord[];
  analyzedAt: string;
}
