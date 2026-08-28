import { describe, it, expect, beforeEach } from 'vitest';
import { LocalBaselineTrainDataProvider } from '../src/providers/trains/LocalBaselineTrainDataProvider';
import { RapidApiTrainDataProvider } from '../src/providers/trains/RapidApiTrainDataProvider';
import { HybridTrainDataProvider } from '../src/providers/trains/HybridTrainDataProvider';
import { TrainDataCache } from '../src/providers/trains/TrainDataCache';
import { DataProvenanceType } from '@railway-gate/shared';

describe('TrainDataProvider Suite - Indian Railways Integration', () => {
  let baselineProvider: LocalBaselineTrainDataProvider;
  let cache: TrainDataCache;

  beforeEach(() => {
    baselineProvider = new LocalBaselineTrainDataProvider();
    cache = new TrainDataCache();
  });

  it('1. should return verified static train schedule with station stops', async () => {
    const schedule = await baselineProvider.getTrainSchedule('12678');
    expect(schedule).not.toBeNull();
    expect(schedule?.trainNumber).toBe('12678');
    expect(schedule?.trainName).toContain('Intercity');
    expect(schedule?.stops.length).toBeGreaterThan(2);
    expect(schedule?.stops[0].stationCode).toBe('SBC');
  });

  it('2. should return train route and station sequences', async () => {
    const route = await baselineProvider.getTrainRoute('06515');
    expect(route).not.toBeNull();
    expect(route?.trainNumber).toBe('06515');
    expect(route?.origin).toBe('KSR Bengaluru City');
    expect(route?.destination).toBe('Hosur');
    expect(route?.totalStations).toBe(3);
  });

  it('3. should return UNKNOWN when live train GPS coordinates cannot be obtained without inventing them', async () => {
    const position = await baselineProvider.getTrainPosition('12678');
    expect(position.status).toBe('UNKNOWN');
    expect(position.position).toBeNull(); // Never generate fake coordinates
    expect(position.isLive).toBe(false);
    expect(position.provenance.sourceType).toBe(DataProvenanceType.UNKNOWN);
  });

  it('4. should calculate estimated arrival time based on scheduled stop', async () => {
    const eta = await baselineProvider.getTrainETA('12678', 'CRLM');
    expect(eta.targetStationOrCrossing).toBe('CRLM');
    expect(eta.scheduledArrival).toBe('06:44:00');
    expect(eta.estimatedArrival).toBeDefined();
  });

  it('5. should handle RapidApi provider rate limiting and cache TTL', () => {
    expect(cache.isRateLimited('test_endpoint')).toBe(false);
    cache.markRateLimited('test_endpoint', 60);
    expect(cache.isRateLimited('test_endpoint')).toBe(true);

    cache.set('test_key', { test: true }, 1); // 1 sec TTL
    expect(cache.get('test_key')).toEqual({ test: true });
  });

  it('6. Hybrid provider should seamlessly fall back to baseline when no API key is provided', async () => {
    const hybrid = new HybridTrainDataProvider('', '');
    const schedule = await hybrid.getTrainSchedule('12678');
    expect(schedule).not.toBeNull();
    expect(schedule?.trainNumber).toBe('12678');

    const status = await hybrid.getTrainStatus('12678');
    expect(status.currentStatus).toBe('UNKNOWN');
    expect(status.delayMinutes).toBeNull();
  });

  it('7. should return null for non-existent train numbers', async () => {
    const missing = await baselineProvider.getTrainSchedule('99999');
    expect(missing).toBeNull();
  });
});
