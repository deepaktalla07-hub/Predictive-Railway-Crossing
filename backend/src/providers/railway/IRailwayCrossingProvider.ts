import { BoundingBox, GeoJsonLineString, RailwayCrossingRecord } from '@railway-gate/shared';

export interface GetCrossingsOptions {
  limit?: number;
  offset?: number;
  bbox?: BoundingBox;
}

export interface IRailwayCrossingProvider {
  readonly providerName: string;
  readonly dataSourceAttribution: string;

  /**
   * Retrieves railway level crossings matching optional spatial bounding box or pagination.
   */
  getCrossings(options?: GetCrossingsOptions): Promise<RailwayCrossingRecord[]>;

  /**
   * Retrieves a single railway crossing by its ID (e.g. 'osm-node-293711133').
   */
  getCrossingById(id: string): Promise<RailwayCrossingRecord | null>;

  /**
   * Finds all railway level crossings intersecting or within bufferMeters of a GeoJSON driving route.
   */
  findCrossingsNearRoute(
    route: GeoJsonLineString,
    bufferMeters?: number
  ): Promise<RailwayCrossingRecord[]>;

  // Backward-compatible alias for existing corridor callers
  getCrossingsInCorridor?(
    bbox: BoundingBox,
    routePolyline?: GeoJsonLineString
  ): Promise<RailwayCrossingRecord[]>;
}
