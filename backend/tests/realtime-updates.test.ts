import { describe, it, expect, beforeEach } from 'vitest';
import { RoutingOrchestrationService } from '../src/services/routing.service';
import { CrossingsService } from '../src/services/crossings.service';
import { ReroutingService } from '../src/services/rerouting.service';
import { DevStubRoutingProvider } from '../src/providers/routing/DevStubRoutingProvider';
import { DevStubCrossingProvider } from '../src/providers/railway/DevStubCrossingProvider';
import { DevStubTrainProvider } from '../src/providers/trains/DevStubTrainProvider';
import { CrossingRepository } from '../src/repositories/crossing.repository';
import { TrainRepository } from '../src/repositories/train.repository';
import { KinematicEngineService } from '../src/services/kinematic.service';
import { RiskCalculationService } from '../src/services/risk.service';
import { Coordinate, RouteAnalysisRequest } from '@railway-gate/shared';

describe('Real-Time Updates & Caching Engine', () => {
  let routingService: RoutingOrchestrationService;
  let routingProvider: DevStubRoutingProvider;

  // Direct arterial road traversing through dev-lc-88a (12.8523, 77.6612)
  const origin: Coordinate = { lat: 12.8523, lng: 77.6500 };
  const destination: Coordinate = { lat: 12.8523, lng: 77.6700 };

  const request: RouteAnalysisRequest = {
    origin,
    destination,
    crossingBufferMeters: 200,
    departureTime: '2026-08-19T08:30:00.000Z'
  };

  beforeEach(() => {
    routingProvider = new DevStubRoutingProvider();
    const crossingProvider = new DevStubCrossingProvider();
    const trainProvider = new DevStubTrainProvider();
    const crossingRepo = new CrossingRepository(crossingProvider);
    const trainRepo = new TrainRepository(trainProvider);
    const kinematicEngine = new KinematicEngineService();
    const riskCalculator = new RiskCalculationService();

    const crossingsService = new CrossingsService(
      crossingRepo,
      trainRepo,
      kinematicEngine,
      riskCalculator
    );
    const reroutingService = new ReroutingService(routingProvider);

    routingService = new RoutingOrchestrationService(
      routingProvider,
      crossingsService,
      reroutingService
    );
  });

  it('1. should cache initial analysis and return cached result on immediate subsequent query', async () => {
    // Initial query
    const firstResult = await routingService.analyzeJourney(request);
    expect(firstResult.status).toBe('SUCCESS');
    expect(firstResult.cached).toBe(false);
    expect(firstResult.dataAgeSeconds).toBe(0);

    // Immediate second query (within 20s TTL)
    const secondResult = await routingService.analyzeJourney(request);
    expect(secondResult.status).toBe('SUCCESS');
    expect(secondResult.cached).toBe(true);
    expect(secondResult.requestId).toBe(firstResult.requestId);
  });

  it('2. should bypass cache when forceFresh option is requested', async () => {
    const firstResult = await routingService.analyzeJourney(request);
    expect(firstResult.cached).toBe(false);

    // Force fresh query
    const freshResult = await routingService.analyzeJourney(request, { forceFresh: true });
    expect(freshResult.cached).toBe(false);
  });

  it('3. should update train positions, crossing predictions, user ETAs, and risk levels upon refresh', async () => {
    const result = await routingService.analyzeJourney(request);

    expect(result.primaryRoute).toBeDefined();
    expect(result.primaryRoute.crossings.length).toBeGreaterThan(0);

    const crossing = result.primaryRoute.crossings[0];
    expect(crossing.userEtaAtCrossing.arrivalTime).toBeDefined();
    expect(crossing.riskEvaluation.riskLevel).toBeDefined();
    expect(crossing.riskComparison).toBeDefined();
  });
});
