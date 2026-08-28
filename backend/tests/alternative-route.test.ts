import { describe, it, expect, beforeEach } from 'vitest';
import { AlternativeRouteEngine } from '../src/services/alternative-route.service';
import { DevStubRoutingProvider } from '../src/providers/routing/DevStubRoutingProvider';
import {
  Coordinate,
  CrossingGateType,
  CrossingRiskDetail,
  DataProvenanceType,
  RiskLevel
} from '@railway-gate/shared';

describe('AlternativeRouteEngine - Route Comparison & Avoidance Verification', () => {
  let engine: AlternativeRouteEngine;
  let routingProvider: DevStubRoutingProvider;

  const origin: Coordinate = { lat: 12.9177, lng: 77.6238 }; // Silk Board
  const destination: Coordinate = { lat: 12.7409, lng: 77.8253 }; // Hosur

  const highRiskCrossing: CrossingRiskDetail = {
    crossingId: 'osm-node-293711133',
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
    predictedTrainEvents: [
      {
        trainNumber: '12678',
        trainName: 'Intercity Superfast Express',
        estimatedCrossingTime: '2026-08-19T09:15:30.000Z',
        uncertaintyBufferSeconds: 180,
        gateClosureWindow: {
          closeStartTime: '2026-08-19T09:09:30.000Z',
          reopenTime: '2026-08-19T09:18:30.000Z',
          durationSeconds: 540
        },
        temporalOverlapSeconds: 300,
        confidenceScore: 0.92,
        provenance: {
          sourceType: DataProvenanceType.CALCULATED_ESTIMATE,
          providerName: 'Kinematic Engine',
          confidenceScore: 0.92,
          isRealtime: false
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
      sourceType: DataProvenanceType.THIRD_PARTY_VERIFIED,
      providerName: 'OpenStreetMap Overpass API',
      confidenceScore: 0.95,
      isRealtime: false
    }
  };

  beforeEach(() => {
    routingProvider = new DevStubRoutingProvider();
    engine = new AlternativeRouteEngine(routingProvider);
  });

  it('1. should generate alternative routes when a crossing has HIGH risk', async () => {
    const alternatives = await engine.generateAlternatives({
      origin,
      destination,
      conflictingCrossings: [highRiskCrossing],
      primaryDurationSeconds: 1680, // 28 mins
      primaryDistanceMeters: 12400, // 12.4 km
      departureTime: new Date('2026-08-19T09:00:00.000Z')
    });

    expect(alternatives.length).toBeGreaterThan(0);
    const robAlt = alternatives.find((a) => a.strategyType === 'GRADE_SEPARATED_ROB_RUB');
    expect(robAlt).toBeDefined();
    expect(robAlt?.distanceMeters).toBeGreaterThan(12400); // e.g. 14.1 km
    expect(robAlt?.additionalDistanceMeters).toBeGreaterThan(0); // e.g. +1.7 km
    expect(robAlt?.formattedAdditionalDistance).toContain('+');
    expect(robAlt?.formattedAdditionalDuration).toContain('+');
    expect(robAlt?.normalRouteComparison.formattedNormalDistance).toBe('12.4 km');
    expect(robAlt?.normalRouteComparison.formattedNormalDuration).toBe('28 min');
  });

  it('2. should verify that recommended alternatives actually avoid the affected crossing', async () => {
    const alternatives = await engine.generateAlternatives({
      origin,
      destination,
      conflictingCrossings: [highRiskCrossing],
      primaryDurationSeconds: 1680,
      primaryDistanceMeters: 12400,
      departureTime: new Date('2026-08-19T09:00:00.000Z')
    });

    const recommended = alternatives.find((a) => a.isRecommended);
    expect(recommended).toBeDefined();
    expect(recommended?.avoidsAffectedCrossing).toBe(true);
    expect(recommended?.avoidedCrossings).toContain(highRiskCrossing.crossingCode);
    expect(recommended?.safetyConfirmationReason).toContain('Confirmed:');
  });

  it('3. should return empty array when no crossings have HIGH or MODERATE risk', async () => {
    const clearCrossing: CrossingRiskDetail = {
      ...highRiskCrossing,
      riskEvaluation: {
        ...highRiskCrossing.riskEvaluation,
        riskScore: 10,
        riskLevel: RiskLevel.LOW
      }
    };

    const alternatives = await engine.generateAlternatives({
      origin,
      destination,
      conflictingCrossings: [clearCrossing],
      primaryDurationSeconds: 1680,
      primaryDistanceMeters: 12400,
      departureTime: new Date('2026-08-19T09:00:00.000Z')
    });

    expect(alternatives).toEqual([]);
  });
});
