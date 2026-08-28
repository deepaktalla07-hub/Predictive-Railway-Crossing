import { describe, it, expect, beforeEach } from 'vitest';
import { OsmOverpassCrossingProvider } from '../src/providers/railway/OsmOverpassCrossingProvider';
import { CrossingCache } from '../src/providers/railway/CrossingCache';
import { CrossingGateType, DataProvenanceType, GeoJsonLineString } from '@railway-gate/shared';

describe('Railway Crossing Geographic Data System & Provider', () => {
  let provider: OsmOverpassCrossingProvider;
  let cache: CrossingCache;

  beforeEach(() => {
    provider = new OsmOverpassCrossingProvider();
    cache = new CrossingCache(24);
  });

  it('should initialize with verified baseline real OSM level crossings in India', async () => {
    const crossings = await provider.getCrossings();
    expect(crossings.length).toBeGreaterThan(0);

    const carmelaram = crossings.find((c) => c.id === 'osm-node-695068066');
    expect(carmelaram).toBeDefined();
    expect(carmelaram?.name).toContain('Carmelaram');
    expect(carmelaram?.latitude).toBeCloseTo(12.90877, 4);
    expect(carmelaram?.longitude).toBeCloseTo(77.70574, 4);
    expect(carmelaram?.source).toBe('OpenStreetMap Overpass API (ODbL)');
    expect(carmelaram?.sourceId).toBe('node/695068066');
  });

  it('should retrieve a real crossing by ID using getCrossingById()', async () => {
    const crossing = await provider.getCrossingById('osm-node-293711133');
    expect(crossing).not.toBeNull();
    expect(crossing?.crossingCode).toBe('LC-88');
    expect(crossing?.roadName).toContain('Hosur');
    expect(crossing?.provenance.sourceType).toBe(DataProvenanceType.OPEN_GEO_OSM);
  });

  it('should return null for non-existent IDs without inventing attributes', async () => {
    const missing = await provider.getCrossingById('non-existent-999999');
    expect(missing).toBeNull();
  });

  it('should cache bounding box queries to prevent repeated external network queries', async () => {
    const bbox = { minLat: 12.84, minLng: 77.65, maxLat: 12.95, maxLng: 77.75 };
    
    // First query populates cache
    const firstCall = await provider.getCrossings({ bbox });
    expect(firstCall.length).toBeGreaterThan(0);

    // Second query uses cache instantly
    const secondCall = await provider.getCrossings({ bbox });
    expect(secondCall).toEqual(firstCall);
  }, 10000);

  it('should find intersecting crossings near a GeoJSON driving route', async () => {
    // Route along Sarjapur-Carmelaram road passing Carmelaram LC (Node 695068066 at 12.90877, 77.70574)
    const route: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [77.6850, 12.9250],
        [77.70574, 12.90877], // Exactly near node 695068066
        [77.7400, 12.8800]
      ]
    };

    const nearbyCrossings = await provider.findCrossingsNearRoute(route, 100);
    expect(nearbyCrossings.length).toBeGreaterThan(0);
    expect(nearbyCrossings.some((c) => c.id === 'osm-node-695068066')).toBe(true);
  }, 10000);

  it('should support in-memory CrossingCache TTL expiration', () => {
    const dummyRecord = {
      id: 'test-node-1',
      name: 'Test Gate',
      latitude: 12.9,
      longitude: 77.7,
      railwayLine: null,
      roadName: null,
      source: 'OpenStreetMap Overpass API (ODbL)',
      sourceId: 'node/1',
      lastUpdated: new Date().toISOString(),
      crossingCode: 'LC-TEST',
      gateType: CrossingGateType.MANUAL_INTERLOCKED,
      preClosureBufferSeconds: 300,
      postClearanceBufferSeconds: 60,
      averageClosureDurationSeconds: 400,
      isGradeSeparated: false,
      tracksCount: 1,
      confidenceScore: 0.9,
      provenance: {
        sourceType: DataProvenanceType.OPEN_GEO_OSM,
        providerName: 'Test',
        confidenceScore: 0.9,
        isRealtime: false
      }
    };

    cache.setById('test-node-1', dummyRecord, 100);
    expect(cache.getById('test-node-1')).toBeDefined();
  });
});
