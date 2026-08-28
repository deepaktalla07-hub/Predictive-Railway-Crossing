import { describe, it, expect } from 'vitest';
import { CrossingsService } from '../src/services/crossings.service';
import { CrossingRepository } from '../src/repositories/crossing.repository';
import { TrainRepository } from '../src/repositories/train.repository';
import { DevStubCrossingProvider } from '../src/providers/railway/DevStubCrossingProvider';
import { DevStubTrainProvider } from '../src/providers/trains/DevStubTrainProvider';
import { KinematicEngineService } from '../src/services/kinematic.service';
import { RiskCalculationService } from '../src/services/risk.service';
import { GeoJsonLineString } from '@railway-gate/shared';

describe('Crossings Spatial Detection Integration Test', () => {
  const crossingProvider = new DevStubCrossingProvider();
  const trainProvider = new DevStubTrainProvider();
  const crossingRepo = new CrossingRepository(crossingProvider);
  const trainRepo = new TrainRepository(trainProvider);
  const kinematicEngine = new KinematicEngineService();
  const riskCalculator = new RiskCalculationService();

  const service = new CrossingsService(
    crossingRepo,
    trainRepo,
    kinematicEngine,
    riskCalculator
  );

  it('should detect crossing when route polyline passes within road corridor buffer', async () => {
    const crossing = (await crossingProvider.getCrossingById('dev-lc-88a'))!;

    // Create polyline directly traversing through crossing coordinates
    const polyline: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [77.6500, 12.8600],
        [crossing.longitude, crossing.latitude],
        [77.6700, 12.8400]
      ]
    };

    const { crossingDetails, userPredictions } = await service.analyzeRouteCrossings({
      routePolyline: polyline,
      totalDurationSeconds: 1200,
      totalDistanceMeters: 14000,
      departureTime: new Date('2026-08-19T08:30:00.000Z'),
      bufferMeters: 100
    });

    expect(crossingDetails.length).toBeGreaterThan(0);
    expect(userPredictions.length).toBeGreaterThan(0);
    const matched = crossingDetails.find((r) => r.crossingCode === 'LC-88A');
    expect(matched).toBeDefined();
    expect(matched?.userEtaAtCrossing.timeFromDepartureSeconds).toBeGreaterThan(0);
  });
});
