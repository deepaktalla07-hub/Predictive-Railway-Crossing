import {
  LiveTrainPositionResult,
  LiveTrainStatusResult,
  LiveTrainTelemetry,
  TrainETAResult,
  TrainRouteResult,
  TrainSchedule,
  TrainScheduleResult
} from '@railway-gate/shared';
import { ITrainDataProvider } from '../providers/trains/ITrainDataProvider';
import { DevStubTrainProvider } from '../providers/trains/DevStubTrainProvider';

export class TrainRepository {
  constructor(private provider: ITrainDataProvider = new DevStubTrainProvider()) {}

  public async getTrainPosition(trainNumber: string): Promise<LiveTrainPositionResult> {
    return this.provider.getTrainPosition(trainNumber);
  }

  public async getTrainRoute(trainNumber: string): Promise<TrainRouteResult | null> {
    return this.provider.getTrainRoute(trainNumber);
  }

  public async getTrainSchedule(trainNumber: string): Promise<TrainScheduleResult | null> {
    return this.provider.getTrainSchedule(trainNumber);
  }

  public async getTrainETA(
    trainNumber: string,
    stationCodeOrCrossingId: string
  ): Promise<TrainETAResult> {
    return this.provider.getTrainETA(trainNumber, stationCodeOrCrossingId);
  }

  public async getTrainStatus(trainNumber: string): Promise<LiveTrainStatusResult> {
    return this.provider.getTrainStatus(trainNumber);
  }

  // Kinematic calculations
  public async getSchedulesForLine(railLineCode: string): Promise<TrainSchedule[]> {
    return this.provider.getSchedulesForLine(railLineCode);
  }

  public async getScheduledTrainsNearCrossing(
    crossingId: string,
    windowStart: Date,
    windowEnd: Date
  ) {
    return this.provider.getScheduledTrainsNearCrossing(crossingId, windowStart, windowEnd);
  }

  public async getLiveTelemetry(trainNumber: string): Promise<LiveTrainTelemetry | null> {
    return this.provider.getLiveTelemetry(trainNumber);
  }
}
