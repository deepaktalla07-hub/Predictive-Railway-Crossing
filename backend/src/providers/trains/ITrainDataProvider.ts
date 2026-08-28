import {
  LiveTrainPositionResult,
  LiveTrainStatusResult,
  LiveTrainTelemetry,
  TrainETAResult,
  TrainRouteResult,
  TrainSchedule,
  TrainScheduleResult
} from '@railway-gate/shared';

export interface ITrainDataProvider {
  readonly providerName: string;
  readonly dataSourceAttribution: string;

  /**
   * Retrieves the current or last known position of a train.
   * If live tracking is unavailable, returns UNKNOWN.
   */
  getTrainPosition(trainNumber: string): Promise<LiveTrainPositionResult>;

  /**
   * Retrieves the full station sequence and route stops for a train.
   */
  getTrainRoute(trainNumber: string): Promise<TrainRouteResult | null>;

  /**
   * Retrieves the operational schedule and stop timings for a train.
   */
  getTrainSchedule(trainNumber: string): Promise<TrainScheduleResult | null>;

  /**
   * Calculates or retrieves the estimated arrival time of a train at a station or level crossing.
   */
  getTrainETA(
    trainNumber: string,
    stationCodeOrCrossingId: string
  ): Promise<TrainETAResult>;

  /**
   * Retrieves the current running status, delay minutes, and operational state of a train.
   */
  getTrainStatus(trainNumber: string): Promise<LiveTrainStatusResult>;

  // Backward-compatible methods for kinematic engine
  getSchedulesForLine(railLineCode: string): Promise<TrainSchedule[]>;
  getScheduledTrainsNearCrossing(
    crossingId: string,
    windowStart: Date,
    windowEnd: Date
  ): Promise<{ schedule: TrainSchedule; estimatedArrivalAtCrossing: Date; speedKmh: number }[]>;
  getLiveTelemetry(trainNumber: string): Promise<LiveTrainTelemetry | null>;
}

export type ITrainScheduleProvider = ITrainDataProvider;
