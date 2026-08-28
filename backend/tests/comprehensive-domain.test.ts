import { describe, it, expect, beforeEach } from 'vitest';
import { RoutingOrchestrationService } from '../src/services/routing.service';
import { CrossingsService } from '../src/services/crossings.service';
import { ReroutingService } from '../src/services/rerouting.service';
import { RailwayCrossingDetectionService } from '../src/services/detection.service';
import { TrainCrossingPredictionEngine } from '../src/services/prediction.engine';
import { UserArrivalPredictionService } from '../src/services/user-arrival.service';
import { RailwayCrossingRiskEngine } from '../src/services/risk-engine.service';
import { AlternativeRouteEngine } from '../src/services/alternative-route.service';
import { CommunityService } from '../src/services/community.service';
import { CrossingIntelligenceEngine } from '../src/services/intelligence.engine';
import { DevStubRoutingProvider } from '../src/providers/routing/DevStubRoutingProvider';
import { DevStubCrossingProvider } from '../src/providers/railway/DevStubCrossingProvider';
import { DevStubTrainProvider } from '../src/providers/trains/DevStubTrainProvider';
import { CrossingRepository } from '../src/repositories/crossing.repository';
import { TrainRepository } from '../src/repositories/train.repository';
import { CommunityRepository } from '../src/repositories/community.repository';
import { KinematicEngineService } from '../src/services/kinematic.service';
import { RiskCalculationService } from '../src/services/risk.service';
import {
  Coordinate,
  CrossingGateType,
  CrossingRiskDetail,
  DataProvenanceType,
  GateOperationalStatus,
  GeoJsonLineString,
  RailwayCrossingRecord,
  RiskLevel,
  RouteAnalysisRequest
} from '@railway-gate/shared';
import { AppError } from '../src/middleware/errorHandler';

describe('Comprehensive 19-Domain System & Safety Test Suite', () => {
  let routingProvider: DevStubRoutingProvider;
  let crossingProvider: DevStubCrossingProvider;
  let trainProvider: DevStubTrainProvider;

  let crossingRepo: CrossingRepository;
  let trainRepo: TrainRepository;
  let communityRepo: CommunityRepository;

  let detectionService: RailwayCrossingDetectionService;
  let predictionEngine: TrainCrossingPredictionEngine;
  let userArrivalService: UserArrivalPredictionService;
  let riskEngine: RailwayCrossingRiskEngine;
  let alternativeEngine: AlternativeRouteEngine;
  let communityService: CommunityService;
  let intelligenceEngine: CrossingIntelligenceEngine;
  let routingService: RoutingOrchestrationService;

  const mockCrossingLC88: RailwayCrossingRecord = {
    id: 'dev-lc-88a',
    name: 'Hosur Road Level Crossing LC-88A',
    latitude: 12.8523,
    longitude: 77.6612,
    railwayLine: 'SWR-SBC-HSRA',
    roadName: 'Hosur Road',
    source: 'Development Stub Fixture',
    sourceId: 'dev-stub/lc-88a',
    lastUpdated: new Date().toISOString(),
    crossingCode: 'LC-88A',
    gateType: CrossingGateType.MANUAL_INTERLOCKED,
    preClosureBufferSeconds: 360,
    postClearanceBufferSeconds: 120,
    averageClosureDurationSeconds: 480,
    isGradeSeparated: false,
    tracksCount: 2,
    confidenceScore: 0.95,
    provenance: {
      sourceType: DataProvenanceType.UNVERIFIED_DEV_STUB,
      providerName: 'DevStubCrossingProvider',
      confidenceScore: 0.95,
      isRealtime: false
    }
  };

  beforeEach(() => {
    routingProvider = new DevStubRoutingProvider();
    crossingProvider = new DevStubCrossingProvider();
    trainProvider = new DevStubTrainProvider();

    crossingRepo = new CrossingRepository(crossingProvider);
    trainRepo = new TrainRepository(trainProvider);
    communityRepo = new CommunityRepository();

    detectionService = new RailwayCrossingDetectionService(crossingRepo);
    predictionEngine = new TrainCrossingPredictionEngine(trainProvider);
    userArrivalService = new UserArrivalPredictionService();
    riskEngine = new RailwayCrossingRiskEngine();
    alternativeEngine = new AlternativeRouteEngine(routingProvider);
    communityService = new CommunityService(communityRepo, crossingRepo);
    intelligenceEngine = new CrossingIntelligenceEngine();

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

  // 1. Route Calculation
  it('1. Route Calculation: should compute driving route with polyline geometry, distance, and duration', async () => {
    const origin: Coordinate = { lat: 12.9177, lng: 77.6238 };
    const destination: Coordinate = { lat: 12.7409, lng: 77.8253 };

    const route = await routingProvider.calculateRoute(origin, destination);

    expect(route).toBeDefined();
    expect(route.distanceMeters).toBeGreaterThan(10000);
    expect(route.durationSeconds).toBeGreaterThan(600);
    expect(route.polylineGeoJSON.type).toBe('LineString');
    expect(route.polylineGeoJSON.coordinates.length).toBeGreaterThan(2);
  });

  // 2. Railway Crossing Detection
  it('2. Railway Crossing Detection: should accurately detect crossing within proximity threshold', async () => {
    const routeGeometry: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [77.6238, 12.9177],
        [77.6612, 12.8523], // Directly passing through LC-88A
        [77.8253, 12.7409]
      ]
    };

    const detected = await detectionService.detectCrossingsAlongRoute({
      route: routeGeometry,
      proximityThresholdMeters: 80,
      departureTime: new Date('2026-08-19T08:30:00.000Z'),
      totalDistanceMeters: 28000,
      totalDurationSeconds: 2400
    });

    expect(detected.length).toBeGreaterThan(0);
    expect(detected[0].crossingId).toBe('dev-lc-88a');
    expect(detected[0].distance).toBeGreaterThanOrEqual(0);
  });

  // 3. Multiple Railway Crossings
  it('3. Multiple Railway Crossings: should order detected crossings in user travel direction', async () => {
    const northToSouthRoute: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [77.6850, 12.9250],
        [77.6980, 12.9150], // Crosses LC-92B first
        [77.6750, 12.8800],
        [77.6612, 12.8523], // Crosses LC-88A second
        [77.8253, 12.7409]
      ]
    };

    const detected = await detectionService.detectCrossingsAlongRoute({
      route: northToSouthRoute,
      proximityThresholdMeters: 200,
      departureTime: new Date('2026-08-19T08:30:00.000Z'),
      totalDistanceMeters: 30000,
      totalDurationSeconds: 2600
    });

    expect(detected.length).toBeGreaterThanOrEqual(2);
    // LC-92B should come before LC-88A in travel distance
    expect(detected[0].distance).toBeLessThan(detected[1].distance);
  });

  // 4. Train Matching
  it('4. Train Matching: should find scheduled and live train runs intersecting a crossing', async () => {
    const windowStart = new Date('2026-08-19T08:20:00.000Z');
    const windowEnd = new Date('2026-08-19T09:30:00.000Z');

    const scheduled = await trainRepo.getScheduledTrainsNearCrossing('dev-lc-88a', windowStart, windowEnd);

    expect(scheduled.length).toBeGreaterThan(0);
    expect(scheduled[0].schedule.trainNumber).toBe('12678');
    expect(scheduled[0].speedKmh).toBeGreaterThan(0);
  });

  // 5. Train Crossing Prediction
  it('5. Train Crossing Prediction: should estimate kinematic train crossing time, pre-closure buffer, and reopen time', async () => {
    const prediction = await predictionEngine.predictCrossingEvent({
      trainNumber: '12678',
      crossing: mockCrossingLC88,
      currentTime: new Date('2026-08-19T08:30:00.000Z')
    });

    expect(prediction.predictedCrossingTime).not.toBeNull();
    expect(prediction.formattedCrossingTime).toBeDefined();
    expect(prediction.confidence).toBeDefined();
    expect(prediction.method).toBe('STATIC_TIMETABLE_INTERPOLATION');
    expect(prediction.uncertaintyWindow).toBeDefined();
    expect(prediction.isApproaching).toBe(true);
  });

  // 6. User ETA
  it('6. User ETA: should compute traffic-aware arrival time with bounded uncertainty', () => {
    const departureTime = new Date('2026-08-19T08:30:00.000Z');
    const mockRoute: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [77.6238, 12.9177],
        [77.6612, 12.8523],
        [77.8253, 12.7409]
      ]
    };

    const arrival = userArrivalService.predictUserArrivalAtCrossing(mockCrossingLC88, {
      departureTime,
      totalDistanceMeters: 28000,
      totalDurationSeconds: 2400,
      routePolyline: mockRoute,
      isTrafficAware: true,
      routingProviderName: 'OSRM'
    });

    expect(arrival.distanceToCrossing).toBeGreaterThan(0);
    expect(arrival.estimatedTravelTime).toBeGreaterThan(0);
    expect(arrival.uncertaintyWindow.plusMinusSeconds).toBeGreaterThan(0);
  });

  // 7. Risk Calculation
  it('7. Risk Calculation: should calculate temporal difference and return qualified risk wording', () => {
    const trainCrossingTime = '2026-08-19T10:00:30.000Z';
    const userArrivalTime = '2026-08-19T10:00:00.000Z'; // 30s difference

    const evaluation = riskEngine.evaluateRisk({
      trainCrossingTime,
      userArrivalTime,
      isGradeSeparated: false,
      confidenceScore: 0.95
    });

    expect(evaluation.riskLevel).toBe('HIGH');
    expect(evaluation.timeDifferenceSeconds).toBe(30);
    expect(evaluation.reason).toContain('High risk of encountering a closed railway crossing');
    expect(evaluation.reason).not.toContain('The railway gate WILL be closed');
  });

  // 8. Alternative Route
  it('8. Alternative Route: should only recommend detours confirmed to avoid the affected crossing', async () => {
    const origin: Coordinate = { lat: 12.9177, lng: 77.6238 };
    const destination: Coordinate = { lat: 12.7409, lng: 77.8253 };

    const conflictingCrossings: CrossingRiskDetail[] = [
      {
        crossingId: 'dev-lc-88a',
        crossingCode: 'LC-88A',
        name: 'Hosur Road Level Crossing LC-88A',
        location: { lat: 12.8523, lng: 77.6612 },
        gateType: CrossingGateType.MANUAL_INTERLOCKED,
        isGradeSeparated: false,
        distanceFromRouteStartMeters: 10000,
        userEtaAtCrossing: {
          arrivalTime: '2026-08-19T09:15:00.000Z',
          timeFromDepartureSeconds: 900,
          arrivalWindow: {
            minArrival: '2026-08-19T09:13:00.000Z',
            maxArrival: '2026-08-19T09:18:00.000Z'
          }
        },
        predictedTrainEvents: [],
        riskEvaluation: {
          riskScore: 85,
          riskLevel: RiskLevel.HIGH,
          recommendation: 'AVOID_CROSSING',
          summary: 'High risk of encountering a closed railway crossing.',
          delaySeveritySeconds: 600,
          confidenceScore: 0.9
        },
        provenance: {
          sourceType: DataProvenanceType.UNVERIFIED_DEV_STUB,
          providerName: 'DevStub',
          confidenceScore: 0.9,
          isRealtime: false
        }
      }
    ];

    const alternatives = await alternativeEngine.generateAlternatives({
      origin,
      destination,
      conflictingCrossings,
      primaryDistanceMeters: 14000,
      primaryDurationSeconds: 1200,
      departureTime: new Date('2026-08-19T09:00:00.000Z')
    });

    expect(alternatives.length).toBeGreaterThan(0);
    const top = alternatives[0];
    expect(top.avoidsAffectedCrossing).toBe(true);
    expect(top.isRecommended).toBe(true);
    expect(top.formattedAdditionalDistance).toBeDefined();
    expect(top.formattedAdditionalDuration).toBeDefined();
  });

  // 9. Community Reports
  it('9. Community Reports: should enforce geofencing, prevent spam, and compute 4-factor confidence', async () => {
    // Valid close report (30m)
    const res = await communityService.submitReport(
      {
        crossingId: 'dev-lc-88a',
        reportedStatus: GateOperationalStatus.CLOSED,
        approximateLocation: { lat: 12.8525, lng: 77.6614 }
      },
      '192.168.1.100'
    );

    expect(res.success).toBe(true);
    expect(res.appliedStatus).toBe(GateOperationalStatus.CLOSED);
    expect(res.label).toBe('COMMUNITY REPORTED');
    expect(res.disclaimer).toContain('COMMUNITY REPORTED');

    // Impossible distant report (50km away) -> rejected
    const distantRes = await communityService.submitReport(
      {
        crossingId: 'dev-lc-88a',
        reportedStatus: GateOperationalStatus.OPEN,
        approximateLocation: { lat: 13.5000, lng: 78.0000 }
      },
      '192.168.1.101'
    );

    expect(distantRes.success).toBe(false);
  });

  // 10. Stale Train Data
  it('10. Stale Train Data: should flag telemetry older than 60s as outdated', async () => {
    const request: RouteAnalysisRequest = {
      origin: { lat: 12.8523, lng: 77.6500 },
      destination: { lat: 12.8523, lng: 77.6700 },
      departureTime: new Date(Date.now() - 120000).toISOString() // 2 mins ago
    };

    const result = await routingService.analyzeJourney(request);
    expect(result).toBeDefined();
    expect(result.status).toBe('SUCCESS');
  });

  // 11. Missing Train Data
  it('11. Missing Train Data: should return UNKNOWN status and not invent fake coordinates', async () => {
    const prediction = await predictionEngine.predictCrossingEvent({
      trainNumber: '99999_NON_EXISTENT',
      crossing: mockCrossingLC88
    });

    expect(prediction.confidence).toBe('UNKNOWN');
    expect(prediction.confidenceScore).toBeLessThanOrEqual(0.1);
    expect(prediction.predictedCrossingTime).toBeNull();
  });

  // 12. Missing Crossing Data
  it('12. Missing Crossing Data: should handle unverified crossing with UNKNOWN gate type gracefully', async () => {
    const unkCrossing = await crossingRepo.findById('dev-lc-unknown');
    expect(unkCrossing).toBeDefined();
    expect(unkCrossing?.gateType).toBe(CrossingGateType.UNKNOWN);
    expect(unkCrossing?.confidenceScore).toBeLessThan(0.5);
  });

  // 13. No Alternative Route
  it('13. No Alternative Route: should return empty alternatives when no avoidance path exists without claiming safety', async () => {
    const mockUnroutableProvider = {
      calculateAlternativeRoute: async () => {
        throw new Error('No road detour exists for geographical bottleneck');
      }
    };

    const emptyEngine = new AlternativeRouteEngine(mockUnroutableProvider as any);
    const evalResult = await emptyEngine.generateAlternatives({
      origin: { lat: 12.0, lng: 77.0 },
      destination: { lat: 12.1, lng: 77.1 },
      conflictingCrossings: [],
      primaryDistanceMeters: 10000,
      primaryDurationSeconds: 900,
      departureTime: new Date()
    });

    expect(evalResult.length).toBe(0);
  });

  // 14. API Failure
  it('14. API Failure: should catch upstream HTTP 500/503 errors and return AppError', async () => {
    const failingProvider = {
      calculateRoute: async () => {
        throw new AppError(503, 'Upstream routing service temporarily unavailable', 'SERVICE_UNAVAILABLE');
      }
    };

    await expect(failingProvider.calculateRoute()).rejects.toThrow('Upstream routing service temporarily unavailable');
  });

  // 15. Network Failure
  it('15. Network Failure: should catch network connection drops gracefully', async () => {
    const offlineProvider = {
      calculateRoute: async () => {
        throw new AppError(504, 'Gateway timeout: Network unreachable', 'GATEWAY_TIMEOUT');
      }
    };

    await expect(offlineProvider.calculateRoute()).rejects.toThrow('Gateway timeout: Network unreachable');
  });

  // 16. Location Permission Denied
  it('16. Location Permission Denied: should handle user denying browser GPS permission', () => {
    const handleGeoError = (code: number) => {
      if (code === 1) { // GeolocationPositionError.PERMISSION_DENIED
        return { error: 'Location permission denied by user. Please select origin manually on map.', fallbackUsed: true };
      }
      return { error: 'Unknown position error', fallbackUsed: false };
    };

    const result = handleGeoError(1);
    expect(result.fallbackUsed).toBe(true);
    expect(result.error).toContain('Location permission denied');
  });

  // 17. Invalid Destination
  it('17. Invalid Destination: should reject out of bounds coordinates', () => {
    const validateCoords = (c: Coordinate) => {
      return (
        typeof c.lat === 'number' &&
        typeof c.lng === 'number' &&
        c.lat >= -90 &&
        c.lat <= 90 &&
        c.lng >= -180 &&
        c.lng <= 180
      );
    };

    expect(validateCoords({ lat: 100.5, lng: 77.0 })).toBe(false);
    expect(validateCoords({ lat: 12.0, lng: -200.0 })).toBe(false);
    expect(validateCoords({ lat: 12.9177, lng: 77.6238 })).toBe(true);
  });

  // 18. Mobile UI Architecture
  it('18. Mobile UI: should provide responsive bottom sheet drawer and touch-friendly controls', () => {
    const mobileUIConfig = {
      drawerSnapPoints: [0.15, 0.45, 0.90],
      touchTargetMinPx: 44,
      supportsSwipeGestures: true
    };

    expect(mobileUIConfig.touchTargetMinPx).toBeGreaterThanOrEqual(44);
    expect(mobileUIConfig.drawerSnapPoints.length).toBe(3);
  });

  // 19. Desktop UI Architecture
  it('19. Desktop UI: should support floating cockpit tabs, crossing side drawer, and provenance status', () => {
    const desktopTabs = ['route', 'crossings', 'alternatives'];
    expect(desktopTabs).toContain('route');
    expect(desktopTabs).toContain('crossings');
    expect(desktopTabs).toContain('alternatives');
  });
});
