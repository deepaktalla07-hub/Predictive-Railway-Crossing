import { Coordinate, GeoJsonLineString, ProvenanceMetadata } from '@railway-gate/shared';

export interface RawRouteResult {
  summary: string;
  distanceMeters: number;
  durationSeconds: number;
  polylineGeoJSON: GeoJsonLineString;
  provenance: ProvenanceMetadata;
}

export interface IRoutingProvider {
  readonly providerName: string;
  calculateRoute(
    origin: Coordinate,
    destination: Coordinate,
    departureTime?: Date
  ): Promise<RawRouteResult>;

  calculateAlternativeRoute(
    origin: Coordinate,
    destination: Coordinate,
    avoidPoints: Coordinate[],
    strategy: 'ROB_DETOUR' | 'ALTERNATE_CROSSING'
  ): Promise<RawRouteResult>;
}
