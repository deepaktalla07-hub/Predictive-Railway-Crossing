import {
  LiveTrainPositionResult,
  LiveTrainStatusResult,
  LiveTrainTelemetry,
  TrainETAResult,
  TrainRouteResult,
  TrainSchedule,
  TrainScheduleResult
} from '@railway-gate/shared';
import { ITrainDataProvider } from './ITrainDataProvider';
import { RapidApiTrainDataProvider } from './RapidApiTrainDataProvider';
import { LocalBaselineTrainDataProvider } from './LocalBaselineTrainDataProvider';

export class HybridTrainDataProvider implements ITrainDataProvider {
  public readonly providerName: string;
  public readonly dataSourceAttribution: string;

  private primaryLiveProvider: ITrainDataProvider | null = null;
  private staticBaselineProvider: ITrainDataProvider;

  constructor(rapidApiKey?: string, rapidApiHost?: string) {
    this.staticBaselineProvider = new LocalBaselineTrainDataProvider();

    if (rapidApiKey && rapidApiKey.trim().length > 5) {
      this.primaryLiveProvider = new RapidApiTrainDataProvider({
        apiKey: rapidApiKey,
        apiHost: rapidApiHost,
        timeoutMs: 5000,
        maxRetries: 2
      });
      this.providerName = 'Hybrid Indian Railways Live Telemetry & Schedule Engine';
      this.dataSourceAttribution = 'Indian Railways Live Telemetry (RapidAPI) + GODL Static Timetable';
    } else {
      this.providerName = this.staticBaselineProvider.providerName;
      this.dataSourceAttribution = this.staticBaselineProvider.dataSourceAttribution;
    }
  }

  public async getTrainPosition(trainNumber: string): Promise<LiveTrainPositionResult> {
    if (this.primaryLiveProvider) {
      const livePos = await this.primaryLiveProvider.getTrainPosition(trainNumber);
      if (livePos.status !== 'UNKNOWN') return livePos;
    }
    return this.staticBaselineProvider.getTrainPosition(trainNumber);
  }

  public async getTrainRoute(trainNumber: string): Promise<TrainRouteResult | null> {
    if (this.primaryLiveProvider) {
      const liveRoute = await this.primaryLiveProvider.getTrainRoute(trainNumber);
      if (liveRoute) return liveRoute;
    }
    return this.staticBaselineProvider.getTrainRoute(trainNumber);
  }

  public async getTrainSchedule(trainNumber: string): Promise<TrainScheduleResult | null> {
    if (this.primaryLiveProvider) {
      const liveSchedule = await this.primaryLiveProvider.getTrainSchedule(trainNumber);
      if (liveSchedule) return liveSchedule;
    }
    return this.staticBaselineProvider.getTrainSchedule(trainNumber);
  }

  public async getTrainETA(
    trainNumber: string,
    stationCodeOrCrossingId: string
  ): Promise<TrainETAResult> {
    if (this.primaryLiveProvider) {
      const liveEta = await this.primaryLiveProvider.getTrainETA(trainNumber, stationCodeOrCrossingId);
      if (liveEta.status !== 'UNKNOWN') return liveEta;
    }
    return this.staticBaselineProvider.getTrainETA(trainNumber, stationCodeOrCrossingId);
  }

  public async getTrainStatus(trainNumber: string): Promise<LiveTrainStatusResult> {
    if (this.primaryLiveProvider) {
      const liveStatus = await this.primaryLiveProvider.getTrainStatus(trainNumber);
      if (liveStatus.currentStatus !== 'UNKNOWN') return liveStatus;
    }
    return this.staticBaselineProvider.getTrainStatus(trainNumber);
  }

  public async getSchedulesForLine(railLineCode: string): Promise<TrainSchedule[]> {
    return this.staticBaselineProvider.getSchedulesForLine(railLineCode);
  }

  public async getScheduledTrainsNearCrossing(
    crossingId: string,
    windowStart: Date,
    windowEnd: Date
  ): Promise<{ schedule: TrainSchedule; estimatedArrivalAtCrossing: Date; speedKmh: number }[]> {
    return this.staticBaselineProvider.getScheduledTrainsNearCrossing(crossingId, windowStart, windowEnd);
  }

  public async getLiveTelemetry(trainNumber: string): Promise<LiveTrainTelemetry | null> {
    if (this.primaryLiveProvider) {
      const telemetry = await this.primaryLiveProvider.getLiveTelemetry(trainNumber);
      if (telemetry) return telemetry;
    }
    return this.staticBaselineProvider.getLiveTelemetry(trainNumber);
  }
}
