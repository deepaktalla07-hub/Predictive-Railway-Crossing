import { Coordinate } from './geo.types';
import { ProvenanceMetadata } from './provenance.types';

export interface TrainStation {
  id: string;
  stationCode: string;
  name: string;
  location: Coordinate;
}

export interface TrainScheduleStop {
  stationCode: string;
  stationName: string;
  stopSequence: number;
  scheduledArrival?: string;   // 'HH:mm:ss'
  scheduledDeparture?: string; // 'HH:mm:ss'
  distanceFromOriginKm: number;
  haltMinutes?: number;
}

export interface TrainSchedule {
  id: string;
  trainNumber: string;
  trainName: string;
  runsOnDays: number[]; // 1=Monday, 7=Sunday
  stops: TrainScheduleStop[];
  railLineCode: string;
  provenance: ProvenanceMetadata;
}

export interface LiveTrainTelemetry {
  trainNumber: string;
  trainName: string;
  currentLocation?: Coordinate;
  currentSpeedKmh?: number;
  delayMinutes: number;
  lastStationCodePassed?: string;
  nextStationCode?: string;
  recordedAt: string;
  provenance: ProvenanceMetadata;
}

export interface LiveTrainPositionResult {
  trainNumber: string;
  position: Coordinate | null;
  currentStation: { code: string; name: string } | null;
  nextStation: { code: string; name: string } | null;
  status: 'RUNNING' | 'STOPPED' | 'TERMINATED' | 'UNKNOWN';
  delayMinutes: number | null;
  speedKmh: number | null;
  lastUpdated: string;
  isLive: boolean;
  provenance: ProvenanceMetadata;
}

export interface TrainRouteResult {
  trainNumber: string;
  trainName: string;
  origin: string;
  destination: string;
  totalStations: number;
  stations: TrainScheduleStop[];
  runsOnDays: number[];
  provenance: ProvenanceMetadata;
}

export interface TrainScheduleResult {
  trainNumber: string;
  trainName: string;
  scheduleDays: number[];
  stops: TrainScheduleStop[];
  provenance: ProvenanceMetadata;
}

export interface TrainETAResult {
  trainNumber: string;
  targetStationOrCrossing: string;
  scheduledArrival: string | null;
  estimatedArrival: string | null;
  delayMinutes: number | null;
  status: 'ON_TIME' | 'DELAYED' | 'EARLY' | 'UNKNOWN';
  confidence: number;
  provenance: ProvenanceMetadata;
}

export interface LiveTrainStatusResult {
  trainNumber: string;
  trainName: string;
  currentStatus: 'RUNNING' | 'DELAYED' | 'ON_TIME' | 'CANCELLED' | 'UNKNOWN';
  delayMinutes: number | null;
  lastStationPassed: string | null;
  nextStationExpected: string | null;
  etaNextStation: string | null;
  isLive: boolean;
  lastChecked: string;
  source: string;
  provenance: ProvenanceMetadata;
}
