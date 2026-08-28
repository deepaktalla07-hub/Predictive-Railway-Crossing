import { describe, it, expect, beforeEach } from 'vitest';
import { UserArrivalPredictionService } from '../src/services/user-arrival.service';
import {
  CrossingGateType,
  DataProvenanceType,
  GeoJsonLineString,
  RailwayCrossingRecord
} from '@railway-gate/shared';

describe('UserArrivalPredictionService - User to Crossing Arrival Prediction', () => {
  let service: UserArrivalPredictionService;

  const mockRoute: GeoJsonLineString = {
    type: 'LineString',
    coordinates: [
      [77.6238, 12.9177], // Silk Board (Origin, 0km)
      [77.6612, 12.8523], // Electronic City LC-88A (Crossing at ~10km)
      [77.8253, 12.7409]  // Hosur (Destination, ~28km)
    ]
  };

  const mockCrossing: RailwayCrossingRecord = {
    id: 'osm-node-293711133',
    name: 'Hosur Road Level Crossing LC-88A',
    latitude: 12.8523,
    longitude: 77.6612,
    railwayLine: 'SWR-SBC-HSRA',
    roadName: 'Hosur Road',
    source: 'OpenStreetMap Overpass API (ODbL)',
    sourceId: 'node/293711133',
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
      sourceType: DataProvenanceType.THIRD_PARTY_VERIFIED,
      providerName: 'OpenStreetMap Overpass API (ODbL)',
      confidenceScore: 0.95,
      isRealtime: false,
      lastSyncedAt: new Date().toISOString()
    }
  };

  beforeEach(() => {
    service = new UserArrivalPredictionService();
  });

  it('1. should calculate user arrival time, distance to crossing, and estimated travel time', () => {
    const departureTime = new Date('2026-08-19T09:00:00.000Z');
    const prediction = service.predictUserArrivalAtCrossing(mockCrossing, {
      routePolyline: mockRoute,
      totalDistanceMeters: 28000,
      totalDurationSeconds: 2400, // 40 minutes total trip
      departureTime,
      isTrafficAware: true,
      routingProviderName: 'Google Maps Directions API'
    });

    expect(prediction.crossingId).toBe(mockCrossing.id);
    expect(prediction.crossingCode).toBe('LC-88A');
    expect(prediction.distanceToCrossing).toBeGreaterThan(5000);
    expect(prediction.distanceToCrossing).toBeLessThan(15000);
    expect(prediction.estimatedTravelTime).toBeGreaterThan(300);
    expect(prediction.userArrivalTime).toBeDefined();
    expect(prediction.formattedArrivalTime).toBeDefined();
    expect(prediction.formattedDistance).toContain('km');
    expect(prediction.lastUpdated).toBeDefined();
  });

  it('2. should provide a bounded uncertainty window without claiming exact arrival', () => {
    const departureTime = new Date('2026-08-19T09:00:00.000Z');
    const prediction = service.predictUserArrivalAtCrossing(mockCrossing, {
      routePolyline: mockRoute,
      totalDistanceMeters: 28000,
      totalDurationSeconds: 2400,
      departureTime,
      isTrafficAware: false
    });

    expect(prediction.uncertaintyWindow).toBeDefined();
    expect(prediction.uncertaintyWindow.plusMinusSeconds).toBeGreaterThan(60);
    expect(prediction.uncertaintyWindow.formattedText).toContain('±');

    const etaMs = new Date(prediction.userArrivalTime).getTime();
    const minMs = new Date(prediction.uncertaintyWindow.minArrival).getTime();
    const maxMs = new Date(prediction.uncertaintyWindow.maxArrival).getTime();

    expect(minMs).toBeLessThan(etaMs);
    expect(maxMs).toBeGreaterThan(etaMs);
    expect(maxMs - minMs).toBe(prediction.uncertaintyWindow.plusMinusSeconds * 2 * 1000);
  });

  it('3. should update remaining distance and arrival when current user location is provided', () => {
    const departureTime = new Date('2026-08-19T09:00:00.000Z');
    // User is halfway along the route near coordinate (12.88, 77.64)
    const currentUserLocation = { lat: 12.8800, lng: 77.6400 };

    const fromStart = service.predictUserArrivalAtCrossing(mockCrossing, {
      routePolyline: mockRoute,
      totalDistanceMeters: 28000,
      totalDurationSeconds: 2400,
      departureTime
    });

    const fromMidway = service.predictUserArrivalAtCrossing(mockCrossing, {
      routePolyline: mockRoute,
      totalDistanceMeters: 28000,
      totalDurationSeconds: 2400,
      departureTime,
      currentUserLocation
    });

    // Midway distance and travel time should be less than from trip start
    expect(fromMidway.distanceToCrossing).toBeLessThan(fromStart.distanceToCrossing);
    expect(fromMidway.estimatedTravelTime).toBeLessThan(fromStart.estimatedTravelTime);
  });
});
