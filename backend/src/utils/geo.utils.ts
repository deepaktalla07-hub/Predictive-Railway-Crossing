import { Coordinate, GeoJsonLineString, GeoPointTuple, BoundingBox } from '@railway-gate/shared';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates Haversine distance between two lat/lng coordinates in meters.
 */
export function calculateHaversineDistanceMeters(coord1: Coordinate, coord2: Coordinate): number {
  const dLat = degreesToRadians(coord2.lat - coord1.lat);
  const dLng = degreesToRadians(coord2.lng - coord1.lng);
  const lat1 = degreesToRadians(coord1.lat);
  const lat2 = degreesToRadians(coord2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Validates a coordinate point.
 */
export function isValidCoordinate(coord: any): coord is Coordinate {
  return (
    coord &&
    typeof coord.lat === 'number' &&
    typeof coord.lng === 'number' &&
    isFinite(coord.lat) &&
    isFinite(coord.lng) &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180
  );
}

/**
 * Validates a GeoJsonLineString geometry.
 */
export function isValidLineString(lineString: any): lineString is GeoJsonLineString {
  if (!lineString || lineString.type !== 'LineString' || !Array.isArray(lineString.coordinates)) {
    return false;
  }
  if (lineString.coordinates.length < 2) {
    return false;
  }
  return lineString.coordinates.every(
    ([lng, lat]: any) =>
      typeof lng === 'number' &&
      typeof lat === 'number' &&
      isFinite(lng) &&
      isFinite(lat) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
  );
}

/**
 * Computes the minimum distance from a point to a line segment in meters.
 */
export function distanceToSegmentMeters(
  point: Coordinate,
  segStart: Coordinate,
  segEnd: Coordinate
): { distanceMeters: number; projectionFraction: number; projectedCoordinate: Coordinate } {
  const l2 = calculateHaversineDistanceMeters(segStart, segEnd);
  if (l2 === 0) {
    return {
      distanceMeters: calculateHaversineDistanceMeters(point, segStart),
      projectionFraction: 0,
      projectedCoordinate: { lat: segStart.lat, lng: segStart.lng }
    };
  }

  // Linear projection on equirectangular approximation for local short segments
  const meanLat = degreesToRadians((segStart.lat + segEnd.lat) / 2);
  const x = (segEnd.lng - segStart.lng) * Math.cos(meanLat);
  const y = segEnd.lat - segStart.lat;
  const px = (point.lng - segStart.lng) * Math.cos(meanLat);
  const py = point.lat - segStart.lat;

  const t = Math.max(0, Math.min(1, (px * x + py * y) / (x * x + y * y || 1)));

  const projectedCoordinate: Coordinate = {
    lat: segStart.lat + t * (segEnd.lat - segStart.lat),
    lng: segStart.lng + t * (segEnd.lng - segStart.lng)
  };

  return {
    distanceMeters: calculateHaversineDistanceMeters(point, projectedCoordinate),
    projectionFraction: t,
    projectedCoordinate
  };
}

export interface PolylineProjectionResult {
  minDistanceMeters: number;
  cumulativeDistanceAlongRouteMeters: number;
  segmentIndex: number;
  fractionAlongSegment: number;
  projectedCoordinate: Coordinate;
  totalRouteDistanceMeters: number;
  normalizedPosition: number;
}

/**
 * Projects a point onto a road route geometry and computes exact segment-level projection data.
 */
export function projectPointOnPolyline(
  point: Coordinate,
  polyline: GeoJsonLineString
): PolylineProjectionResult {
  let minDistance = Infinity;
  let distanceAlongAtMin = 0;
  let bestSegmentIndex = 0;
  let bestFraction = 0;
  let bestProjectedCoord: Coordinate = { lat: point.lat, lng: point.lng };
  let cumulativeDistance = 0;

  const coords = polyline.coordinates;
  const segmentLengths: number[] = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const p1: Coordinate = { lng: coords[i][0], lat: coords[i][1] };
    const p2: Coordinate = { lng: coords[i + 1][0], lat: coords[i + 1][1] };
    const segmentLength = calculateHaversineDistanceMeters(p1, p2);
    segmentLengths.push(segmentLength);

    const { distanceMeters, projectionFraction, projectedCoordinate } = distanceToSegmentMeters(
      point,
      p1,
      p2
    );

    if (distanceMeters < minDistance) {
      minDistance = distanceMeters;
      distanceAlongAtMin = cumulativeDistance + segmentLength * projectionFraction;
      bestSegmentIndex = i;
      bestFraction = projectionFraction;
      bestProjectedCoord = projectedCoordinate;
    }

    cumulativeDistance += segmentLength;
  }

  const totalRouteDistance = cumulativeDistance;
  const normalizedPosition = totalRouteDistance > 0 ? distanceAlongAtMin / totalRouteDistance : 0;

  return {
    minDistanceMeters: minDistance === Infinity ? 0 : minDistance,
    cumulativeDistanceAlongRouteMeters: distanceAlongAtMin,
    segmentIndex: bestSegmentIndex,
    fractionAlongSegment: bestFraction,
    projectedCoordinate: bestProjectedCoord,
    totalRouteDistanceMeters: totalRouteDistance,
    normalizedPosition: Math.max(0, Math.min(1, normalizedPosition))
  };
}

/**
 * Finds the minimum distance from a point to a GeoJSON LineString path in meters
 * and returns the cumulative distance along the path.
 */
export function distanceToPolylineMeters(
  point: Coordinate,
  polyline: GeoJsonLineString
): { minDistanceMeters: number; cumulativeDistanceAlongRouteMeters: number } {
  const result = projectPointOnPolyline(point, polyline);
  return {
    minDistanceMeters: result.minDistanceMeters,
    cumulativeDistanceAlongRouteMeters: result.cumulativeDistanceAlongRouteMeters
  };
}

/**
 * Computes bounding box for a set of coordinates with padding in degrees.
 */
export function computeBoundingBox(coordinates: GeoPointTuple[], paddingDeg = 0.05): BoundingBox {
  if (!coordinates || coordinates.length === 0) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lng, lat] of coordinates) {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) {
      continue;
    }
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  if (minLat === Infinity) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }

  return {
    minLat: minLat - paddingDeg,
    maxLat: maxLat + paddingDeg,
    minLng: minLng - paddingDeg,
    maxLng: maxLng + paddingDeg
  };
}

/**
 * Calculates total route length from a GeoJsonLineString in meters.
 */
export function calculatePolylineLengthMeters(polyline: GeoJsonLineString): number {
  let totalDistance = 0;
  const coords = polyline.coordinates;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = { lng: coords[i][0], lat: coords[i][1] };
    const p2 = { lng: coords[i + 1][0], lat: coords[i + 1][1] };
    totalDistance += calculateHaversineDistanceMeters(p1, p2);
  }
  return totalDistance;
}
