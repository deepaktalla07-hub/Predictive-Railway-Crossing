import {
  BoundingBox,
  CrossingGateType,
  DataProvenanceType,
  GeoJsonLineString,
  RailwayCrossingRecord
} from '@railway-gate/shared';
import { GetCrossingsOptions, IRailwayCrossingProvider } from './IRailwayCrossingProvider';
import { distanceToPolylineMeters } from '../../utils/geo.utils';

export class DevStubCrossingProvider implements IRailwayCrossingProvider {
  public readonly providerName = 'Development Stub Railway Crossing Registry';
  public readonly dataSourceAttribution = 'Development Test Dataset (Unverified Stub)';

  private fixtures: RailwayCrossingRecord[] = [
    {
      id: 'dev-lc-88a',
      name: 'Hosur Road Level Crossing (Demo)',
      latitude: 12.8523,
      longitude: 77.6612,
      railwayLine: 'Bangalore - Salem Main Line',
      roadName: 'Hosur Main Road',
      source: 'Development Stub Fixture',
      sourceId: 'dev-stub/lc-88a',
      lastUpdated: new Date().toISOString(),
      crossingCode: 'LC-88A',
      gateType: CrossingGateType.MANUAL_INTERLOCKED,
      preClosureBufferSeconds: 360,
      postClearanceBufferSeconds: 120,
      averageClosureDurationSeconds: 600,
      isGradeSeparated: false,
      tracksCount: 2,
      confidenceScore: 0.9,
      provenance: {
        sourceType: DataProvenanceType.UNVERIFIED_DEV_STUB,
        providerName: this.providerName,
        confidenceScore: 0.9,
        isRealtime: false,
        notes: 'DEMO DATA: Deterministic test crossing fixture for local development'
      }
    },
    {
      id: 'dev-lc-92b',
      name: 'Karmelaram Gate (Demo)',
      latitude: 12.9150,
      longitude: 77.6980,
      railwayLine: 'Baiyyappanahalli - Hosur Section',
      roadName: 'Sarjapur - Carmelaram Road',
      source: 'Development Stub Fixture',
      sourceId: 'dev-stub/lc-92b',
      lastUpdated: new Date().toISOString(),
      crossingCode: 'LC-92B',
      gateType: CrossingGateType.AUTOMATIC_BARRIER,
      preClosureBufferSeconds: 300,
      postClearanceBufferSeconds: 90,
      averageClosureDurationSeconds: 480,
      isGradeSeparated: false,
      tracksCount: 2,
      confidenceScore: 0.9,
      provenance: {
        sourceType: DataProvenanceType.UNVERIFIED_DEV_STUB,
        providerName: this.providerName,
        confidenceScore: 0.9,
        isRealtime: false,
        notes: 'DEMO DATA: Deterministic test crossing fixture for local development'
      }
    },
    {
      id: 'dev-rob-flyover',
      name: 'Electronic City Flyover ROB (Grade Separated)',
      latitude: 12.8450,
      longitude: 77.6720,
      railwayLine: 'SWR-SBC-HSRA',
      roadName: 'Elevated Expressway',
      source: 'Development Stub Fixture',
      sourceId: 'dev-stub/rob-104',
      lastUpdated: new Date().toISOString(),
      crossingCode: 'ROB-104',
      gateType: CrossingGateType.SPECIAL_GRADE,
      preClosureBufferSeconds: 0,
      postClearanceBufferSeconds: 0,
      averageClosureDurationSeconds: 0,
      isGradeSeparated: true,
      tracksCount: 2,
      confidenceScore: 0.95,
      provenance: {
        sourceType: DataProvenanceType.UNVERIFIED_DEV_STUB,
        providerName: this.providerName,
        confidenceScore: 0.95,
        isRealtime: false,
        notes: 'DEMO DATA: Grade-separated overpass (never closes for road traffic)'
      }
    },
    {
      id: 'dev-lc-unknown',
      name: 'Hoodi Industrial Crossing (Insufficient Data)',
      latitude: 12.9850,
      longitude: 77.7250,
      railwayLine: null,
      roadName: 'Hoodi - ITPL Link Road',
      source: 'Development Stub Fixture',
      sourceId: 'dev-stub/lc-unk-404',
      lastUpdated: new Date().toISOString(),
      crossingCode: 'LC-UNK-404',
      gateType: CrossingGateType.UNKNOWN,
      preClosureBufferSeconds: 300,
      postClearanceBufferSeconds: 120,
      averageClosureDurationSeconds: 600,
      isGradeSeparated: false,
      tracksCount: 1,
      confidenceScore: 0.35,
      provenance: {
        sourceType: DataProvenanceType.UNKNOWN,
        providerName: this.providerName,
        confidenceScore: 0.35,
        isRealtime: false,
        notes: 'DEMO DATA: Simulated missing/unverified schedule feed for UI testing'
      }
    }
  ];

  public async getCrossings(options?: GetCrossingsOptions): Promise<RailwayCrossingRecord[]> {
    if (options?.bbox) {
      return this.fixtures.filter(
        (c) =>
          c.latitude >= options.bbox!.minLat &&
          c.latitude <= options.bbox!.maxLat &&
          c.longitude >= options.bbox!.minLng &&
          c.longitude <= options.bbox!.maxLng
      );
    }
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    return this.fixtures.slice(offset, offset + limit);
  }

  public async getCrossingById(id: string): Promise<RailwayCrossingRecord | null> {
    return this.fixtures.find((c) => c.id === id) || null;
  }

  public async findCrossingsNearRoute(
    route: GeoJsonLineString,
    bufferMeters = 80
  ): Promise<RailwayCrossingRecord[]> {
    return this.fixtures.filter((c) => {
      const { minDistanceMeters } = distanceToPolylineMeters(
        { lat: c.latitude, lng: c.longitude },
        route
      );
      return minDistanceMeters <= bufferMeters;
    });
  }

  public async getCrossingsInCorridor(
    bbox: BoundingBox,
    _routePolyline?: GeoJsonLineString
  ): Promise<RailwayCrossingRecord[]> {
    return this.getCrossings({ bbox });
  }
}
