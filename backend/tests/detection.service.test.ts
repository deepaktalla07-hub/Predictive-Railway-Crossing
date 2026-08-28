import { describe, it, expect, beforeEach } from 'vitest';
import { RailwayCrossingDetectionService } from '../src/services/detection.service';
import { CrossingRepository } from '../src/repositories/crossing.repository';
import { DevStubCrossingProvider } from '../src/providers/railway/DevStubCrossingProvider';
import { GeoJsonLineString, Coordinate, CrossingGateType, DataProvenanceType } from '@railway-gate/shared';

describe('RailwayCrossingDetectionService - Route to Crossing Detection', () => {
  let detectionService: RailwayCrossingDetectionService;
  let crossingRepo: CrossingRepository;

  beforeEach(() => {
    const provider = new DevStubCrossingProvider();
    crossingRepo = new CrossingRepository(provider);
    detectionService = new RailwayCrossingDetectionService(crossingRepo);
  });

  it('1. should detect crossings using actual road geometry rather than straight-line distance', async () => {
    // Route curves around Silk Board and passes directly through LC-88A (12.8523, 77.6612)
    const routeGeometry: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [77.6238, 12.9177], // Silk Board
        [77.6400, 12.8800], // Electronic City link
        [77.6612, 12.8523], // Directly at LC-88A
        [77.6720, 12.8450], // ROB Flyover
        [77.8253, 12.7409]  // Hosur
      ]
    };

    const matches = await detectionService.detectCrossingsAlongRoute({
      route: routeGeometry,
      departureTime: new Date('2026-08-19T09:00:00.000Z'),
      totalDurationSeconds: 2400,
      totalDistanceMeters: 28000,
      proximityThresholdMeters: 80
    });

    expect(matches.length).toBeGreaterThan(0);
    const lc88 = matches.find((m) => m.crossingId === 'dev-lc-88a');
    expect(lc88).toBeDefined();
    expect(lc88?.crossingName).toContain('Hosur Road');
    expect(lc88?.source).toBe('Development Stub Fixture');
    expect(lc88?.distance).toBeGreaterThan(0);
    expect(lc88?.estimatedArrivalTime).toBeDefined();
    expect(lc88?.routePosition.segmentIndex).toBeGreaterThanOrEqual(1);
    expect(lc88?.routePosition.coordinates).toBeDefined();
  });

  it('2. should strictly order multiple crossings according to direction of travel', async () => {
    // Route traversing from North to South passing LC-92B (Carmelaram) then LC-88A (Hosur Rd)
    const northToSouthRoute: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [77.6850, 12.9250], // Start near Bellandur
        [77.6980, 12.9150], // Crosses LC-92B first (dist ~2.5km)
        [77.6750, 12.8800], // Middle connector
        [77.6612, 12.8523], // Crosses LC-88A second (dist ~10km)
        [77.6720, 12.8450]  // Crosses ROB flyover third (dist ~12km)
      ]
    };

    const matches = await detectionService.detectCrossingsAlongRoute({
      route: northToSouthRoute,
      departureTime: '2026-08-19T09:00:00.000Z',
      totalDurationSeconds: 1800,
      totalDistanceMeters: 15000,
      proximityThresholdMeters: 90
    });

    expect(matches.length).toBeGreaterThanOrEqual(2);
    
    // Verify strictly ascending order of distances along the user's travel trajectory
    for (let i = 0; i < matches.length - 1; i++) {
      expect(matches[i].distance).toBeLessThanOrEqual(matches[i + 1].distance);
      
      const arrival1 = new Date(matches[i].estimatedArrivalTime).getTime();
      const arrival2 = new Date(matches[i + 1].estimatedArrivalTime).getTime();
      expect(arrival1).toBeLessThanOrEqual(arrival2);
    }
  });

  it('3. should respect configurable proximity threshold', async () => {
    // Route is offset ~88m north of LC-88A (which is at lat: 12.8523, lng: 77.6612)
    const routePassingClose: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [77.6600, 12.8531],
        [77.6630, 12.8531]
      ]
    };

    // With a tight 10m threshold, it should NOT match (distance is ~88m)
    const tightMatches = await detectionService.detectCrossingsAlongRoute({
      route: routePassingClose,
      proximityThresholdMeters: 10
    });
    expect(tightMatches.length).toBe(0);

    // With a generous 150m threshold, it SHOULD match
    const looseMatches = await detectionService.detectCrossingsAlongRoute({
      route: routePassingClose,
      proximityThresholdMeters: 150
    });
    expect(looseMatches.length).toBeGreaterThan(0);
  });

  it('4. should handle routes with zero railway crossings (No Crossings)', async () => {
    // Route far from any railway track (e.g. MG Road to Indiranagar)
    const urbanRoute: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [77.6090, 12.9750],
        [77.6200, 12.9760],
        [77.6408, 12.9784]
      ]
    };

    const matches = await detectionService.detectCrossingsAlongRoute({
      route: urbanRoute,
      proximityThresholdMeters: 60
    });

    expect(matches).toEqual([]);
  });

  it('5. should gracefully handle invalid coordinates and missing data without throwing', async () => {
    // Empty coordinates
    const emptyResult = await detectionService.detectCrossingsAlongRoute({
      route: { type: 'LineString', coordinates: [] }
    });
    expect(emptyResult).toEqual([]);

    // Single coordinate (cannot form a route)
    const singlePointResult = await detectionService.detectCrossingsAlongRoute({
      route: [{ lat: 12.9, lng: 77.6 }]
    });
    expect(singlePointResult).toEqual([]);

    // Route with null/missing crossing attributes
    const routeNearUnknown: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [77.7240, 12.9850],
        [77.7250, 12.9850], // Near dev-lc-unknown
        [77.7260, 12.9850]
      ]
    };

    const unknownMatches = await detectionService.detectCrossingsAlongRoute({
      route: routeNearUnknown,
      proximityThresholdMeters: 100
    });

    if (unknownMatches.length > 0) {
      const match = unknownMatches[0];
      expect(match.crossingId).toBe('dev-lc-unknown');
      expect(match.railwayLine).toBeNull(); // missing data preserved as null
      expect(match.estimatedArrivalTime).toBeDefined();
    }
  });
});
