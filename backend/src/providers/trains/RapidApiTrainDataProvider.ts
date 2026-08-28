import axios, { AxiosInstance } from 'axios';
import {
  Coordinate,
  DataProvenanceType,
  LiveTrainPositionResult,
  LiveTrainStatusResult,
  LiveTrainTelemetry,
  TrainETAResult,
  TrainRouteResult,
  TrainSchedule,
  TrainScheduleResult,
  TrainScheduleStop
} from '@railway-gate/shared';
import { ITrainDataProvider } from './ITrainDataProvider';
import { TrainDataCache } from './TrainDataCache';
import { addSeconds, toIsoStringSafe } from '../../utils/time.utils';

export interface RapidApiConfig {
  apiKey: string;
  apiHost?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class RapidApiTrainDataProvider implements ITrainDataProvider {
  public readonly providerName = 'RapidAPI Indian Railway Live Service';
  public readonly dataSourceAttribution = 'Indian Railways Live Telemetry via RapidAPI';

  private client: AxiosInstance;
  private cache: TrainDataCache;
  private maxRetries: number;

  constructor(private config: RapidApiConfig) {
    this.maxRetries = config.maxRetries || 2;
    this.cache = new TrainDataCache();

    this.client = axios.create({
      baseURL: `https://${config.apiHost || 'irctc1.p.rapidapi.com'}`,
      headers: {
        'x-rapidapi-key': config.apiKey,
        'x-rapidapi-host': config.apiHost || 'irctc1.p.rapidapi.com'
      },
      timeout: config.timeoutMs || 5000
    });
  }

  /**
   * Retrieves the current or last known position of a train.
   */
  public async getTrainPosition(trainNumber: string): Promise<LiveTrainPositionResult> {
    const cacheKey = `pos_${trainNumber}`;
    const cached = this.cache.get<LiveTrainPositionResult>(cacheKey);
    if (cached) return cached;

    if (this.cache.isRateLimited('rapidapi_train')) {
      console.warn(`[RapidApiTrainDataProvider] Rate-limited cooldown active, returning UNKNOWN for ${trainNumber}`);
      return this.buildUnknownPosition(trainNumber);
    }

    try {
      const data = await this.executeWithRetry<any>(`/api/v3/getTrainLiveStatus?trainNo=${trainNumber}`);

      if (data && data.status && data.data) {
        const d = data.data;
        const currentStationCode = d.current_station_code || d.station_from || null;
        const currentStationName = d.current_station_name || null;
        const nextStationCode = d.next_station_code || null;
        const nextStationName = d.next_station_name || null;
        const delayMinutes = typeof d.delay === 'number' ? d.delay : null;

        let status: 'RUNNING' | 'STOPPED' | 'TERMINATED' | 'UNKNOWN' = 'RUNNING';
        if (d.status === 'Terminated' || d.is_terminated) status = 'TERMINATED';
        else if (d.status === 'Stopped' || d.current_status?.toLowerCase().includes('stopped')) status = 'STOPPED';

        const result: LiveTrainPositionResult = {
          trainNumber,
          position: null, // Note: NTES/IRCTC provides station-level progress, not continuous raw GPS lat/lng
          currentStation: currentStationCode ? { code: currentStationCode, name: currentStationName || currentStationCode } : null,
          nextStation: nextStationCode ? { code: nextStationCode, name: nextStationName || nextStationCode } : null,
          status,
          delayMinutes,
          speedKmh: typeof d.speed === 'number' ? d.speed : null,
          lastUpdated: new Date().toISOString(),
          isLive: true,
          provenance: {
            sourceType: DataProvenanceType.THIRD_PARTY_VERIFIED,
            providerName: this.providerName,
            confidenceScore: 0.92,
            isRealtime: true,
            lastSyncedAt: new Date().toISOString(),
            notes: `Live status synced from ${this.providerName}`
          }
        };

        this.cache.set(cacheKey, result, 90); // 90 seconds TTL
        return result;
      }
    } catch (err: any) {
      console.warn(`[RapidApiTrainDataProvider] Failed to get train position for ${trainNumber}:`, err.message);
    }

    return this.buildUnknownPosition(trainNumber);
  }

  /**
   * Retrieves the full station sequence and route stops for a train.
   */
  public async getTrainRoute(trainNumber: string): Promise<TrainRouteResult | null> {
    const cacheKey = `route_${trainNumber}`;
    const cached = this.cache.get<TrainRouteResult>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.executeWithRetry<any>(`/api/v1/getTrainSchedule?trainNo=${trainNumber}`);

      if (data && data.status && data.data && Array.isArray(data.data.route)) {
        const d = data.data;
        const stations: TrainScheduleStop[] = d.route.map((r: any, idx: number) => ({
          stationCode: r.station_code,
          stationName: r.station_name || r.station_code,
          stopSequence: idx + 1,
          scheduledArrival: r.arrival_time,
          scheduledDeparture: r.departure_time,
          distanceFromOriginKm: typeof r.distance === 'number' ? r.distance : 0,
          haltMinutes: typeof r.halt === 'number' ? r.halt : 0
        }));

        const result: TrainRouteResult = {
          trainNumber,
          trainName: d.train_name || `Train ${trainNumber}`,
          origin: stations[0]?.stationName || '',
          destination: stations[stations.length - 1]?.stationName || '',
          totalStations: stations.length,
          stations,
          runsOnDays: [1, 2, 3, 4, 5, 6, 7],
          provenance: {
            sourceType: DataProvenanceType.THIRD_PARTY_VERIFIED,
            providerName: this.providerName,
            confidenceScore: 0.95,
            isRealtime: false,
            lastSyncedAt: new Date().toISOString()
          }
        };

        this.cache.set(cacheKey, result, 86400); // 24 hours TTL for static route
        return result;
      }
    } catch (err: any) {
      console.warn(`[RapidApiTrainDataProvider] Failed to get route for ${trainNumber}:`, err.message);
    }

    return null;
  }

  /**
   * Retrieves the operational schedule and stop timings for a train.
   */
  public async getTrainSchedule(trainNumber: string): Promise<TrainScheduleResult | null> {
    const route = await this.getTrainRoute(trainNumber);
    if (!route) return null;

    return {
      trainNumber: route.trainNumber,
      trainName: route.trainName,
      scheduleDays: route.runsOnDays,
      stops: route.stations,
      provenance: route.provenance
    };
  }

  /**
   * Calculates or retrieves the estimated arrival time of a train at a station or level crossing.
   */
  public async getTrainETA(
    trainNumber: string,
    stationCodeOrCrossingId: string
  ): Promise<TrainETAResult> {
    const cacheKey = `eta_${trainNumber}_${stationCodeOrCrossingId}`;
    const cached = this.cache.get<TrainETAResult>(cacheKey);
    if (cached) return cached;

    const status = await this.getTrainStatus(trainNumber);
    const schedule = await this.getTrainSchedule(trainNumber);

    if (!schedule || status.currentStatus === 'UNKNOWN') {
      return {
        trainNumber,
        targetStationOrCrossing: stationCodeOrCrossingId,
        scheduledArrival: null,
        estimatedArrival: null,
        delayMinutes: null,
        status: 'UNKNOWN',
        confidence: 0.3,
        provenance: {
          sourceType: DataProvenanceType.UNKNOWN,
          providerName: this.providerName,
          confidenceScore: 0.3,
          isRealtime: false,
          notes: 'Unable to calculate live ETA due to missing live status feed'
        }
      };
    }

    const matchedStop = schedule.stops.find(
      (s) => s.stationCode.toUpperCase() === stationCodeOrCrossingId.toUpperCase()
    );

    const delayMinutes = status.delayMinutes || 0;
    let scheduledArrival = matchedStop?.scheduledArrival || null;
    let estimatedArrival = null;

    if (scheduledArrival) {
      // Interpolate estimated arrival = scheduled + delay
      const today = new Date().toISOString().split('T')[0];
      const scheduledDate = new Date(`${today}T${scheduledArrival}`);
      if (!isNaN(scheduledDate.getTime())) {
        const estimatedDate = addSeconds(scheduledDate, delayMinutes * 60);
        estimatedArrival = toIsoStringSafe(estimatedDate);
      }
    }

    const etaResult: TrainETAResult = {
      trainNumber,
      targetStationOrCrossing: stationCodeOrCrossingId,
      scheduledArrival,
      estimatedArrival,
      delayMinutes,
      status: delayMinutes > 5 ? 'DELAYED' : delayMinutes < -2 ? 'EARLY' : 'ON_TIME',
      confidence: 0.9,
      provenance: {
        sourceType: DataProvenanceType.THIRD_PARTY_VERIFIED,
        providerName: this.providerName,
        confidenceScore: 0.9,
        isRealtime: status.isLive,
        lastSyncedAt: new Date().toISOString()
      }
    };

    this.cache.set(cacheKey, etaResult, 90);
    return etaResult;
  }

  /**
   * Retrieves the current running status, delay minutes, and operational state of a train.
   */
  public async getTrainStatus(trainNumber: string): Promise<LiveTrainStatusResult> {
    const cacheKey = `status_${trainNumber}`;
    const cached = this.cache.get<LiveTrainStatusResult>(cacheKey);
    if (cached) return cached;

    if (this.cache.isRateLimited('rapidapi_train')) {
      return this.buildUnknownStatus(trainNumber);
    }

    try {
      const data = await this.executeWithRetry<any>(`/api/v3/getTrainLiveStatus?trainNo=${trainNumber}`);

      if (data && data.status && data.data) {
        const d = data.data;
        const delay = typeof d.delay === 'number' ? d.delay : 0;
        let currentStatus: 'RUNNING' | 'DELAYED' | 'ON_TIME' | 'CANCELLED' | 'UNKNOWN' = 'RUNNING';

        if (d.is_cancelled) currentStatus = 'CANCELLED';
        else if (delay > 5) currentStatus = 'DELAYED';
        else currentStatus = 'ON_TIME';

        const result: LiveTrainStatusResult = {
          trainNumber,
          trainName: d.train_name || `Train ${trainNumber}`,
          currentStatus,
          delayMinutes: delay,
          lastStationPassed: d.current_station_name || d.current_station_code || null,
          nextStationExpected: d.next_station_name || d.next_station_code || null,
          etaNextStation: d.eta || null,
          isLive: true,
          lastChecked: new Date().toISOString(),
          source: this.providerName,
          provenance: {
            sourceType: DataProvenanceType.THIRD_PARTY_VERIFIED,
            providerName: this.providerName,
            confidenceScore: 0.92,
            isRealtime: true,
            lastSyncedAt: new Date().toISOString()
          }
        };

        this.cache.set(cacheKey, result, 90);
        return result;
      }
    } catch (err: any) {
      console.warn(`[RapidApiTrainDataProvider] Error getting status for ${trainNumber}:`, err.message);
    }

    return this.buildUnknownStatus(trainNumber);
  }

  // Backward-compatible methods for kinematic prediction engine
  public async getSchedulesForLine(railLineCode: string): Promise<TrainSchedule[]> {
    return [];
  }

  public async getScheduledTrainsNearCrossing(
    crossingId: string,
    windowStart: Date,
    windowEnd: Date
  ): Promise<{ schedule: TrainSchedule; estimatedArrivalAtCrossing: Date; speedKmh: number }[]> {
    return [];
  }

  public async getLiveTelemetry(trainNumber: string): Promise<LiveTrainTelemetry | null> {
    const status = await this.getTrainStatus(trainNumber);
    if (status.currentStatus === 'UNKNOWN') return null;

    return {
      trainNumber,
      trainName: status.trainName,
      delayMinutes: status.delayMinutes || 0,
      lastStationCodePassed: status.lastStationPassed || undefined,
      nextStationCode: status.nextStationExpected || undefined,
      recordedAt: status.lastChecked,
      provenance: status.provenance
    };
  }

  /**
   * Executes HTTP request with exponential backoff and rate-limit detection.
   */
  private async executeWithRetry<T>(url: string): Promise<T | null> {
    let attempts = 0;
    let delayMs = 400;

    while (attempts <= this.maxRetries) {
      try {
        const startTime = Date.now();
        const response = await this.client.get<T>(url);
        const duration = Date.now() - startTime;
        console.log(`[RapidApiTrainDataProvider] GET ${url} -> ${response.status} (${duration}ms)`);
        return response.data;
      } catch (err: any) {
        attempts++;

        // Handle Rate Limit (HTTP 429)
        if (err.response?.status === 429) {
          console.warn('[RapidApiTrainDataProvider] HTTP 429 Too Many Requests. Cooling down for 60s.');
          this.cache.markRateLimited('rapidapi_train', 60);
          return null;
        }

        // Retry only on server error (502, 503, 504) or timeout
        const isTransient =
          err.code === 'ECONNABORTED' ||
          err.code === 'ETIMEDOUT' ||
          (err.response?.status >= 500 && err.response?.status <= 504);

        if (attempts <= this.maxRetries && isTransient) {
          console.warn(`[RapidApiTrainDataProvider] Request failed (${err.message}), retrying in ${delayMs}ms (attempt ${attempts}/${this.maxRetries})...`);
          await new Promise((res) => setTimeout(res, delayMs));
          delayMs *= 2;
        } else {
          throw err;
        }
      }
    }

    return null;
  }

  private buildUnknownPosition(trainNumber: string): LiveTrainPositionResult {
    return {
      trainNumber,
      position: null,
      currentStation: null,
      nextStation: null,
      status: 'UNKNOWN',
      delayMinutes: null,
      speedKmh: null,
      lastUpdated: new Date().toISOString(),
      isLive: false,
      provenance: {
        sourceType: DataProvenanceType.UNKNOWN,
        providerName: this.providerName,
        confidenceScore: 0.2,
        isRealtime: false,
        notes: 'Live train GPS/telemetry feed unavailable. Returning UNKNOWN.'
      }
    };
  }

  private buildUnknownStatus(trainNumber: string): LiveTrainStatusResult {
    return {
      trainNumber,
      trainName: `Train ${trainNumber}`,
      currentStatus: 'UNKNOWN',
      delayMinutes: null,
      lastStationPassed: null,
      nextStationExpected: null,
      etaNextStation: null,
      isLive: false,
      lastChecked: new Date().toISOString(),
      source: this.providerName,
      provenance: {
        sourceType: DataProvenanceType.UNKNOWN,
        providerName: this.providerName,
        confidenceScore: 0.2,
        isRealtime: false,
        notes: 'Live status unverified.'
      }
    };
  }
}
