/**
 * Geospatial coordinates and geometric types.
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export type GeoPointTuple = [number, number]; // [longitude, latitude] as per GeoJSON specification

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: GeoPointTuple;
}

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: GeoPointTuple[];
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: GeoPointTuple[][];
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface SpatialDistanceResult {
  distanceMeters: number;
  nearestCoordinate: Coordinate;
  fractionAlongPath: number;
}
