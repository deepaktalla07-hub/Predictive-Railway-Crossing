import { describe, it, expect, beforeEach } from 'vitest';
import { CrossingIntelligenceEngine } from '../src/services/intelligence.engine';
import { CommunityService } from '../src/services/community.service';
import { CommunityRepository } from '../src/repositories/community.repository';
import { CrossingRepository } from '../src/repositories/crossing.repository';
import { DevStubCrossingProvider } from '../src/providers/railway/DevStubCrossingProvider';
import {
  CrossingGateType,
  CrossingRiskDetail,
  DataProvenanceType,
  GateOperationalStatus,
  RiskLevel,
  UserCrossingArrivalPrediction
} from '@railway-gate/shared';

describe('Crossing Intelligence Engine Suite', () => {
  let engine: CrossingIntelligenceEngine;
  let communityService: CommunityService;

  const mockCrossingDetail: CrossingRiskDetail = {
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
        maxArrival: '2026-08-19T09:17:00.000Z'
      }
    },
    predictedTrainEvents: [
      {
        trainNumber: '12678',
        trainName: 'Intercity Express',
        estimatedCrossingTime: '2026-08-19T09:15:30.000Z', // 30 seconds difference -> HIGH RISK
        uncertaintyBufferSeconds: 180,
        gateClosureWindow: {
          closeStartTime: '2026-08-19T09:09:30.000Z',
          reopenTime: '2026-08-19T09:18:30.000Z',
          durationSeconds: 540
        },
        temporalOverlapSeconds: 300,
        confidenceScore: 0.92,
        provenance: {
          sourceType: DataProvenanceType.CALCULATED,
          providerName: 'Kinematic Train Engine',
          confidenceScore: 0.92,
          isRealtime: true,
          lastSyncedAt: new Date().toISOString()
        }
      }
    ],
    riskEvaluation: {
      riskScore: 85,
      riskLevel: RiskLevel.HIGH,
      recommendation: 'AVOID_CROSSING',
      summary: 'High risk of encountering a closed railway crossing.',
      delaySeveritySeconds: 540,
      confidenceScore: 0.92
    },
    provenance: {
      sourceType: DataProvenanceType.OPEN_DATA,
      providerName: 'OpenStreetMap Overpass API',
      confidenceScore: 0.95,
      isRealtime: false,
      lastSyncedAt: new Date().toISOString()
    }
  };

  const mockUserPrediction: UserCrossingArrivalPrediction = {
    crossingId: 'dev-lc-88a',
    crossingCode: 'LC-88A',
    userPosition: { lat: 12.8523, lng: 77.6612 },
    userArrivalTime: '2026-08-19T09:15:00.000Z',
    formattedArrivalTime: '09:15:00',
    distanceToCrossing: 10000,
    formattedDistance: '10.0 km',
    estimatedTravelTime: 900,
    formattedTravelTime: '15 min',
    lastUpdated: new Date().toISOString(),
    uncertaintyWindow: {
      plusMinusSeconds: 120,
      formattedText: '± 2 min',
      minArrival: '2026-08-19T09:13:00.000Z',
      maxArrival: '2026-08-19T09:17:00.000Z'
    },
    trafficAware: true,
    trafficCondition: 'MODERATE',
    confidence: 'HIGH',
    reason: 'Traffic-aware ETA from routing provider',
    provenance: {
      sourceType: DataProvenanceType.ESTIMATED,
      providerName: 'Traffic Routing Service',
      confidenceScore: 0.90,
      isRealtime: true
    }
  };

  beforeEach(async () => {
    const crossingProvider = new DevStubCrossingProvider();
    const crossingRepo = new CrossingRepository(crossingProvider);
    const communityRepo = new CommunityRepository();
    communityService = new CommunityService(communityRepo, crossingRepo);

    // Seed a community report
    await communityService.submitReport(
      {
        crossingId: 'dev-lc-88a',
        reportedStatus: GateOperationalStatus.CLOSED,
        approximateLocation: { lat: 12.8524, lng: 77.6613 }
      },
      '192.168.1.1'
    );

    engine = new CrossingIntelligenceEngine(communityService);
  });

  it('1. should combine all 9 data dimensions into a complete CrossingIntelligenceRecord', async () => {
    const result = await engine.generateCrossingIntelligence({
      crossingDetail: mockCrossingDetail,
      userPrediction: mockUserPrediction
    });

    // 1. crossingStatus
    expect(result.crossingStatus).toBeDefined();
    expect(result.crossingStatus.status).toBe(GateOperationalStatus.CLOSED);

    // 2. trainInformation
    expect(result.trainInformation.trainNumber).toBe('12678');
    expect(result.trainInformation.trainName).toBe('Intercity Express');

    // 3. predictedTrainCrossingTime
    expect(result.predictedTrainCrossingTime.predictedCrossingTime).toBe('2026-08-19T09:15:30.000Z');
    expect(result.predictedTrainCrossingTime.provenanceCategory).toBe('CALCULATED');

    // 4. userArrivalTime
    expect(result.userArrivalTime.arrivalTime).toBe('2026-08-19T09:15:00.000Z');
    expect(result.userArrivalTime.provenanceCategory).toBe('ESTIMATED');

    // 5. timeDifference
    expect(result.timeDifference.seconds).toBe(30);
    expect(result.timeDifference.formattedText).toBe('30 seconds');

    // 6. riskLevel
    expect(result.riskLevel).toBe(RiskLevel.HIGH);

    // 7. confidence
    expect(result.confidence.overallScore).toBeGreaterThan(0.7);

    // 8. recommendation
    expect(result.recommendation).toContain('High risk of encountering a closed railway crossing');
    expect(result.recommendation).not.toContain('The railway gate WILL be closed');
  });

  it('2. should clearly distinguish provenance categories in dataSources', async () => {
    const result = await engine.generateCrossingIntelligence({
      crossingDetail: mockCrossingDetail,
      userPrediction: mockUserPrediction
    });

    const categories = result.dataSources.map((s) => s.category);

    expect(categories).toContain('OPEN DATA');
    expect(categories).toContain('REAL-TIME PROVIDER');
    expect(categories).toContain('CALCULATED');
    expect(categories).toContain('ESTIMATED');
    expect(categories).toContain('COMMUNITY');

    // Ensure all entries have valid attributions and confidence scores
    result.dataSources.forEach((source) => {
      expect(source.attribution).toBeDefined();
      expect(source.confidenceScore).toBeGreaterThan(0);
      expect(source.freshnessSec).toBeGreaterThanOrEqual(0);
    });
  });

  it('3. should generate route intelligence summary for multiple crossings', async () => {
    const routeSummary = await engine.generateRouteIntelligence(
      [mockCrossingDetail],
      [mockUserPrediction]
    );

    expect(routeSummary.totalCrossingsCount).toBe(1);
    expect(routeSummary.conflictingCrossingsCount).toBe(1);
    expect(routeSummary.overallRiskLevel).toBe(RiskLevel.HIGH);
    expect(routeSummary.highestRiskCrossing).toBeDefined();
    expect(routeSummary.highestRiskCrossing?.crossingCode).toBe('LC-88A');
  });
});
