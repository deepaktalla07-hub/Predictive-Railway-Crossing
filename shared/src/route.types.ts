import { Coordinate, GeoJsonLineString } from './geo.types';
import { CrossingRiskDetail, RiskLevel, RouteRiskSummary } from './risk.types';
import { ProvenanceMetadata } from './provenance.types';

export interface RouteWaypoint {
  coordinate: Coordinate;
  address?: string;
  name?: string;
}

export interface RouteAnalysisRequest {
  origin: Coordinate;
  destination: Coordinate;
  departureTime?: string; // ISO-8601 (defaults to now)
  currentUserLocation?: Coordinate; // Optional real-time user GPS coordinate
  avoidHighRiskGates?: boolean;
  crossingBufferMeters?: number;
}

export interface UserCrossingArrivalPrediction {
  crossingId: string;
  crossingCode: string;
  userPosition: Coordinate;
  userArrivalTime: string; // ISO-8601
  formattedArrivalTime: string; // e.g. "09:55:30"
  distanceToCrossing: number; // in meters
  formattedDistance: string; // e.g. "4.2 km"
  estimatedTravelTime: number; // in seconds
  formattedTravelTime: string; // e.g. "8 min 15 sec"
  lastUpdated: string; // ISO-8601
  uncertaintyWindow: {
    plusMinusSeconds: number;
    formattedText: string; // e.g. "± 2 min 10 sec"
    minArrival: string; // ISO-8601
    maxArrival: string; // ISO-8601
  };
  trafficAware: boolean;
  trafficCondition: 'FREE_FLOW' | 'MODERATE' | 'HEAVY' | 'UNVERIFIED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  reason: string;
  provenance: ProvenanceMetadata;
}

export interface NormalRouteComparison {
  normalDistanceMeters: number;
  normalDurationSeconds: number;
  formattedNormalDistance: string; // e.g. "12.4 km"
  formattedNormalDuration: string; // e.g. "28 min"
  normalRiskLevel: RiskLevel;
}

export interface PrimaryRouteResult {
  id: string;
  summary: string;
  distanceMeters: number;
  durationSeconds: number;
  formattedDistance?: string; // e.g. "12.4 km"
  formattedDuration?: string; // e.g. "28 min"
  polylineGeoJSON: GeoJsonLineString;
  riskSummary: RouteRiskSummary;
  crossings: CrossingRiskDetail[];
  userArrivalPredictions?: UserCrossingArrivalPrediction[];
  provenance: ProvenanceMetadata;
}

export interface AlternativeRouteResult {
  id: string;
  title: string;
  summary: string;
  strategyType: 'GRADE_SEPARATED_ROB_RUB' | 'ALTERNATE_CROSSING' | 'DEPARTURE_TIME_SHIFT';
  distanceMeters: number;
  durationSeconds: number;
  formattedDistance: string; // e.g. "14.1 km"
  formattedDuration: string; // e.g. "32 min"
  additionalDistanceMeters: number; // e.g. 1700
  formattedAdditionalDistance: string; // e.g. "+1.7 km"
  additionalDurationSeconds: number; // e.g. 240
  formattedAdditionalDuration: string; // e.g. "+4 min"
  netTimeDifferenceSeconds: number; // positive = takes longer driving, negative = faster
  timeSavedVsGateWaitSeconds: number; // net benefit
  avoidsAffectedCrossing: boolean; // Confirmed by spatial geometry algorithm
  safetyConfirmationReason: string; // Explains why it is safer
  avoidedCrossings: string[];
  isRecommended: boolean;
  rankingScore: number;
  normalRouteComparison: NormalRouteComparison;
  polylineGeoJSON: GeoJsonLineString;
  riskSummary: RouteRiskSummary;
  suggestedDepartureTime?: string;
}

export interface RouteAnalysisResponse {
  status: 'SUCCESS' | 'PARTIAL' | 'ERROR';
  requestId: string;
  analyzedAt: string;
  dataAgeSeconds?: number;
  isStale?: boolean;
  staleWarning?: string;
  cached?: boolean;
  requestParams: {
    origin: Coordinate;
    destination: Coordinate;
    departureTime: string;
  };
  primaryRoute: PrimaryRouteResult;
  alternativeRoutes: AlternativeRouteResult[];
}
