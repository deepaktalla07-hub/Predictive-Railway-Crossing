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
import { addSeconds, toIsoStringSafe } from '../../utils/time.utils';

export class DevStubTrainProvider implements ITrainDataProvider {
  public readonly providerName = 'Development Stub Train Timetable Engine';
  public readonly dataSourceAttribution = 'Development Test Dataset (Unverified Stub)';

  private schedules: TrainSchedule[] = [
    {
      id: 'sched-12678',
      trainNumber: '12678',
      trainName: 'Intercity Superfast Express (Dev)',
      runsOnDays: [1, 2, 3, 4, 5, 6, 7],
      railLineCode: 'SWR-SBC-HSRA',
      stops: [
        {
          stationCode: 'SBC',
          stationName: 'KSR Bengaluru',
          stopSequence: 1,
          scheduledDeparture: '08:00:00',
          distanceFromOriginKm: 0
        },
        {
          stationCode: 'CRLM',
          stationName: 'Carmelaram',
          stopSequence: 2,
          scheduledArrival: '08:35:00',
          scheduledDeparture: '08:37:00',
          distanceFromOriginKm: 22
        },
        {
          stationCode: 'HSRA',
          stationName: 'Hosur',
          stopSequence: 3,
          scheduledArrival: '09:12:00',
          distanceFromOriginKm: 52
        }
      ],
      provenance: {
        sourceType: DataProvenanceType.UNVERIFIED_DEV_STUB,
        providerName: this.providerName,
        confidenceScore: 0.9,
        isRealtime: false,
        notes: 'DEMO DATA: Simulated timetable for local calculation and kinematic testing'
      }
    },
    {
      id: 'sched-06515',
      trainNumber: '06515',
      trainName: 'MEMU Passenger (Dev)',
      runsOnDays: [1, 2, 3, 4, 5, 6],
      railLineCode: 'SWR-SBC-HSRA',
      stops: [
        {
          stationCode: 'SBC',
          stationName: 'KSR Bengaluru',
          stopSequence: 1,
          scheduledDeparture: '08:45:00',
          distanceFromOriginKm: 0
        },
        {
          stationCode: 'HSRA',
          stationName: 'Hosur',
          stopSequence: 2,
          scheduledArrival: '10:05:00',
          distanceFromOriginKm: 52
        }
      ],
      provenance: {
        sourceType: DataProvenanceType.UNVERIFIED_DEV_STUB,
        providerName: this.providerName,
        confidenceScore: 0.88,
        isRealtime: false,
        notes: 'DEMO DATA: Simulated MEMU service for multi-event testing'
      }
    }
  ];

  public async getTrainPosition(trainNumber: string): Promise<LiveTrainPositionResult> {
    const matched = this.schedules.find((s) => s.trainNumber === trainNumber);

    return {
      trainNumber,
      position: null,
      currentStation: matched?.stops[0] ? { code: matched.stops[0].stationCode, name: matched.stops[0].stationName } : null,
      nextStation: matched?.stops[1] ? { code: matched.stops[1].stationCode, name: matched.stops[1].stationName } : null,
      status: 'UNKNOWN',
      delayMinutes: null,
      speedKmh: null,
      lastUpdated: new Date().toISOString(),
      isLive: false,
      provenance: {
        sourceType: DataProvenanceType.UNVERIFIED_DEV_STUB,
        providerName: this.providerName,
        confidenceScore: 0.3,
        isRealtime: false,
        notes: 'DEMO DATA: Dev stub returning UNKNOWN live position'
      }
    };
  }

  public async getTrainRoute(trainNumber: string): Promise<TrainRouteResult | null> {
    const matched = this.schedules.find((s) => s.trainNumber === trainNumber);
    if (!matched) return null;

    return {
      trainNumber: matched.trainNumber,
      trainName: matched.trainName,
      origin: matched.stops[0]?.stationName || '',
      destination: matched.stops[matched.stops.length - 1]?.stationName || '',
      totalStations: matched.stops.length,
      stations: matched.stops,
      runsOnDays: matched.runsOnDays,
      provenance: matched.provenance
    };
  }

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

  public async getTrainETA(
    trainNumber: string,
    stationCodeOrCrossingId: string
  ): Promise<TrainETAResult> {
    const schedule = await this.getTrainSchedule(trainNumber);
    if (!schedule) {
      return {
        trainNumber,
        targetStationOrCrossing: stationCodeOrCrossingId,
        scheduledArrival: null,
        estimatedArrival: null,
        delayMinutes: null,
        status: 'UNKNOWN',
        confidence: 0.1,
        provenance: {
          sourceType: DataProvenanceType.UNKNOWN,
          providerName: this.providerName,
          confidenceScore: 0.1,
          isRealtime: false
        }
      };
    }

    const matchedStop = schedule.stops.find(
      (s) => s.stationCode.toUpperCase() === stationCodeOrCrossingId.toUpperCase()
    );

    let scheduledArrival = matchedStop?.scheduledArrival || null;
    let estimatedArrival = null;

    if (scheduledArrival) {
      const today = new Date().toISOString().split('T')[0];
      const scheduledDate = new Date(`${today}T${scheduledArrival}`);
      if (!isNaN(scheduledDate.getTime())) {
        estimatedArrival = toIsoStringSafe(scheduledDate);
      }
    }

    return {
      trainNumber,
      targetStationOrCrossing: stationCodeOrCrossingId,
      scheduledArrival,
      estimatedArrival,
      delayMinutes: 0,
      status: 'ON_TIME',
      confidence: 0.85,
      provenance: schedule.provenance
    };
  }

  public async getTrainStatus(trainNumber: string): Promise<LiveTrainStatusResult> {
    const matched = this.schedules.find((s) => s.trainNumber === trainNumber);

    return {
      trainNumber,
      trainName: matched ? matched.trainName : `Train ${trainNumber}`,
      currentStatus: 'UNKNOWN',
      delayMinutes: null,
      lastStationPassed: null,
      nextStationExpected: matched?.stops[0]?.stationName || null,
      etaNextStation: null,
      isLive: false,
      lastChecked: new Date().toISOString(),
      source: this.providerName,
      provenance: {
        sourceType: DataProvenanceType.UNVERIFIED_DEV_STUB,
        providerName: this.providerName,
        confidenceScore: 0.5,
        isRealtime: false,
        notes: 'DEMO DATA: Dev stub returning UNKNOWN status'
      }
    };
  }

  public async getSchedulesForLine(_railLineCode: string): Promise<TrainSchedule[]> {
    return this.schedules;
  }

  public async getScheduledTrainsNearCrossing(
    _crossingId: string,
    windowStart: Date,
    windowEnd: Date
  ): Promise<{ schedule: TrainSchedule; estimatedArrivalAtCrossing: Date; speedKmh: number }[]> {
    const windowMidpoint = new Date(
      windowStart.getTime() + (windowEnd.getTime() - windowStart.getTime()) * 0.45
    );

    const primaryCrossingTime = windowMidpoint;
    const secondaryCrossingTime = addSeconds(windowMidpoint, 1800);

    return [
      {
        schedule: this.schedules[0],
        estimatedArrivalAtCrossing: primaryCrossingTime,
        speedKmh: 75
      },
      {
        schedule: this.schedules[1],
        estimatedArrivalAtCrossing: secondaryCrossingTime,
        speedKmh: 55
      }
    ];
  }

  public async getLiveTelemetry(trainNumber: string): Promise<LiveTrainTelemetry | null> {
    const matched = this.schedules.find((s) => s.trainNumber === trainNumber);
    if (!matched) return null;

    return {
      trainNumber,
      trainName: matched.trainName,
      currentLocation: { lat: 12.875, lng: 77.645 },
      currentSpeedKmh: 72,
      delayMinutes: 3,
      lastStationCodePassed: 'SBC',
      nextStationCode: 'CRLM',
      recordedAt: new Date().toISOString(),
      provenance: {
        sourceType: DataProvenanceType.CALCULATED_ESTIMATE,
        providerName: this.providerName,
        confidenceScore: 0.85,
        isRealtime: false,
        notes: 'DEMO DATA: Kinematic estimate from departure timestamp'
      }
    };
  }
}
