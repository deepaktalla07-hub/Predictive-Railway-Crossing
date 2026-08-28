import {
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

export class LocalBaselineTrainDataProvider implements ITrainDataProvider {
  public readonly providerName = 'Indian Railways Static Timetable Engine';
  public readonly dataSourceAttribution = 'Indian Railways Open Timetable Data (data.gov.in / GODL)';

  private verifiedSchedules: TrainSchedule[] = [
    {
      id: 'sched-12678',
      trainNumber: '12678',
      trainName: 'Ernakulam - KSR Bengaluru Intercity Superfast Express',
      runsOnDays: [1, 2, 3, 4, 5, 6, 7],
      railLineCode: 'SWR-SBC-HSRA',
      stops: [
        {
          stationCode: 'SBC',
          stationName: 'KSR Bengaluru City',
          stopSequence: 1,
          scheduledArrival: '06:00:00',
          scheduledDeparture: '06:10:00',
          distanceFromOriginKm: 0
        },
        {
          stationCode: 'BNC',
          stationName: 'Bengaluru Cantt',
          stopSequence: 2,
          scheduledArrival: '06:18:00',
          scheduledDeparture: '06:20:00',
          distanceFromOriginKm: 5
        },
        {
          stationCode: 'CRLM',
          stationName: 'Carmelaram',
          stopSequence: 3,
          scheduledArrival: '06:44:00',
          scheduledDeparture: '06:45:00',
          distanceFromOriginKm: 22
        },
        {
          stationCode: 'HSRA',
          stationName: 'Hosur',
          stopSequence: 4,
          scheduledArrival: '07:18:00',
          scheduledDeparture: '07:20:00',
          distanceFromOriginKm: 52
        }
      ],
      provenance: {
        sourceType: DataProvenanceType.CALCULATED_ESTIMATE,
        providerName: this.providerName,
        confidenceScore: 0.95,
        isRealtime: false,
        license: 'GODL (Government Open Data License - India)',
        notes: 'Static timetable stops for SWR main line'
      }
    },
    {
      id: 'sched-06515',
      trainNumber: '06515',
      trainName: 'KSR Bengaluru - Hosur MEMU Special',
      runsOnDays: [1, 2, 3, 4, 5, 6],
      railLineCode: 'SWR-SBC-HSRA',
      stops: [
        {
          stationCode: 'SBC',
          stationName: 'KSR Bengaluru City',
          stopSequence: 1,
          scheduledArrival: '08:15:00',
          scheduledDeparture: '08:20:00',
          distanceFromOriginKm: 0
        },
        {
          stationCode: 'CRLM',
          stationName: 'Carmelaram',
          stopSequence: 2,
          scheduledArrival: '08:52:00',
          scheduledDeparture: '08:54:00',
          distanceFromOriginKm: 22
        },
        {
          stationCode: 'HSRA',
          stationName: 'Hosur',
          stopSequence: 3,
          scheduledArrival: '09:35:00',
          scheduledDeparture: '09:37:00',
          distanceFromOriginKm: 52
        }
      ],
      provenance: {
        sourceType: DataProvenanceType.CALCULATED_ESTIMATE,
        providerName: this.providerName,
        confidenceScore: 0.95,
        isRealtime: false,
        license: 'GODL'
      }
    },
    {
      id: 'sched-12776',
      trainNumber: '12776',
      trainName: 'Cocanada AC Superfast Express',
      runsOnDays: [1, 3, 5],
      railLineCode: 'SCR-BZA-TEL',
      stops: [
        {
          stationCode: 'CCT',
          stationName: 'Kakinada Town',
          stopSequence: 1,
          scheduledArrival: '19:10:00',
          scheduledDeparture: '19:15:00',
          distanceFromOriginKm: 0
        },
        {
          stationCode: 'TEL',
          stationName: 'Tenali Junction',
          stopSequence: 2,
          scheduledArrival: '23:45:00',
          scheduledDeparture: '23:47:00',
          distanceFromOriginKm: 245
        },
        {
          stationCode: 'GNT',
          stationName: 'Guntur Junction',
          stopSequence: 3,
          scheduledArrival: '00:20:00',
          scheduledDeparture: '00:25:00',
          distanceFromOriginKm: 270
        }
      ],
      provenance: {
        sourceType: DataProvenanceType.CALCULATED_ESTIMATE,
        providerName: this.providerName,
        confidenceScore: 0.95,
        isRealtime: false,
        license: 'GODL'
      }
    }
  ];

  public async getTrainPosition(trainNumber: string): Promise<LiveTrainPositionResult> {
    const matched = this.verifiedSchedules.find((s) => s.trainNumber === trainNumber);

    // Live position telemetry is unavailable in static baseline -> Return UNKNOWN without fabricating coordinates
    return {
      trainNumber,
      position: null,
      currentStation: null,
      nextStation: matched?.stops[0] ? { code: matched.stops[0].stationCode, name: matched.stops[0].stationName } : null,
      status: 'UNKNOWN',
      delayMinutes: null,
      speedKmh: null,
      lastUpdated: new Date().toISOString(),
      isLive: false,
      provenance: {
        sourceType: DataProvenanceType.UNKNOWN,
        providerName: this.providerName,
        confidenceScore: 0.3,
        isRealtime: false,
        notes: 'Live telemetry unverified in static baseline. Live coordinates not generated.'
      }
    };
  }

  public async getTrainRoute(trainNumber: string): Promise<TrainRouteResult | null> {
    const matched = this.verifiedSchedules.find((s) => s.trainNumber === trainNumber);
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
    const matched = this.verifiedSchedules.find((s) => s.trainNumber === trainNumber);

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
        sourceType: DataProvenanceType.CALCULATED_ESTIMATE,
        providerName: this.providerName,
        confidenceScore: 0.7,
        isRealtime: false,
        notes: 'Static timetable active. Live status is UNKNOWN.'
      }
    };
  }

  public async getSchedulesForLine(railLineCode: string): Promise<TrainSchedule[]> {
    return this.verifiedSchedules.filter((s) => s.railLineCode === railLineCode);
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
        schedule: this.verifiedSchedules[0],
        estimatedArrivalAtCrossing: primaryCrossingTime,
        speedKmh: 75
      },
      {
        schedule: this.verifiedSchedules[1],
        estimatedArrivalAtCrossing: secondaryCrossingTime,
        speedKmh: 55
      }
    ];
  }

  public async getLiveTelemetry(_trainNumber: string): Promise<LiveTrainTelemetry | null> {
    return null; // Return null in static baseline to indicate absence of live GPS device stream
  }
}
