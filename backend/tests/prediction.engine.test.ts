import { describe, it, expect, beforeEach } from 'vitest';
import { TrainCrossingPredictionEngine } from '../src/services/prediction.engine';
import { LocalBaselineTrainDataProvider } from '../src/providers/trains/LocalBaselineTrainDataProvider';
import {
  CrossingGateType,
  DataProvenanceType,
  PredictionConfidenceLevel,
  RailwayCrossingRecord
} from '@railway-gate/shared';

describe('TrainCrossingPredictionEngine - Train to Level Crossing Estimation', () => {
  let engine: TrainCrossingPredictionEngine;
  let trainProvider: LocalBaselineTrainDataProvider;

  const mockCrossing: RailwayCrossingRecord = {
    id: 'osm-node-695068066',
    name: 'Carmelaram Level Crossing LC-134',
    latitude: 12.9150,
    longitude: 77.6980,
    railwayLine: 'SWR-SBC-HSRA',
    roadName: 'Sarjapur Main Road',
    source: 'OpenStreetMap Overpass API (ODbL)',
    sourceId: 'node/695068066',
    lastUpdated: new Date().toISOString(),
    crossingCode: 'LC-134',
    gateType: CrossingGateType.MANUAL_INTERLOCKED,
    preClosureBufferSeconds: 360,
    postClearanceBufferSeconds: 120,
    averageClosureDurationSeconds: 480,
    isGradeSeparated: false,
    tracksCount: 2,
    confidenceScore: 0.95,
    provenance: {
      sourceType: DataProvenanceType.THIRD_PARTY_VERIFIED,
      providerName: 'OpenStreetMap Overpass API (ODbL)',
      confidenceScore: 0.95,
      isRealtime: false,
      lastSyncedAt: new Date().toISOString()
    }
  };

  beforeEach(() => {
    trainProvider = new LocalBaselineTrainDataProvider();
    engine = new TrainCrossingPredictionEngine(trainProvider);
  });

  it('1. should calculate predicted crossing time using route distance and station sequence', async () => {
    const result = await engine.predictCrossingEvent({
      crossing: mockCrossing,
      trainNumber: '12678', // Intercity SBC -> HSRA passing CRLM at 06:44
      currentTime: new Date('2026-08-19T06:25:00.000Z')
    });

    expect(result.trainNumber).toBe('12678');
    expect(result.crossingId).toBe(mockCrossing.id);
    expect(result.predictedCrossingTime).not.toBeNull();
    expect(result.formattedCrossingTime).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.method).toBe('STATIC_TIMETABLE_INTERPOLATION');
    expect(result.isApproaching).toBe(true);
    expect(result.uncertaintyWindow).not.toBeNull();
    expect(result.uncertaintyWindow?.formattedText).toBe('± 3 minutes');
    expect(result.reason).toContain('Based on scheduled timetable progression');
    expect(result.dataSources.length).toBeGreaterThan(0);
    expect(result.lastUpdated).toBeDefined();
  });

  it('2. should return UNKNOWN when train route or schedule does not exist without fabricating data', async () => {
    const result = await engine.predictCrossingEvent({
      crossing: mockCrossing,
      trainNumber: '99999', // Non-existent train
      currentTime: new Date()
    });

    expect(result.confidence).toBe(PredictionConfidenceLevel.UNKNOWN);
    expect(result.predictedCrossingTime).toBeNull();
    expect(result.formattedCrossingTime).toBeNull();
    expect(result.isApproaching).toBe(false);
    expect(result.uncertaintyWindow).toBeNull();
  });

  it('3. should provide a bounded uncertainty window (earliest to latest arrival)', async () => {
    const result = await engine.predictCrossingEvent({
      crossing: mockCrossing,
      trainNumber: '06515', // MEMU SBC -> HSRA
      currentTime: new Date('2026-08-19T08:20:00.000Z')
    });

    expect(result.uncertaintyWindow).not.toBeNull();
    if (result.uncertaintyWindow && result.predictedCrossingTime) {
      const predictedMs = new Date(result.predictedCrossingTime).getTime();
      const earliestMs = new Date(result.uncertaintyWindow.earliestCrossingTime).getTime();
      const latestMs = new Date(result.uncertaintyWindow.latestCrossingTime).getTime();

      expect(earliestMs).toBeLessThan(predictedMs);
      expect(latestMs).toBeGreaterThan(predictedMs);
      expect(latestMs - earliestMs).toBe(result.uncertaintyWindow.plusMinusSeconds * 2 * 1000);
    }
  });

  it('4. should not present predictions as guaranteed and include qualifying reasons', async () => {
    const result = await engine.predictCrossingEvent({
      crossing: mockCrossing,
      trainNumber: '12678'
    });

    expect(result.reason).not.toBe('');
    expect(result.provenance.notes).toBeDefined();
    expect(result.confidenceScore).toBeLessThanOrEqual(0.95);
  });
});
