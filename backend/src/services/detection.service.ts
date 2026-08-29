import {
  Coordinate,
  DetectedCrossing,
  GeoJsonLineString,
  RailwayCrossingRecord
} from '@railway-gate/shared';
import { CrossingRepository } from '../repositories/crossing.repository';
import {
  computeBoundingBox,
  isValidCoordinate,
  isValidLineString,
  projectPointOnPolyline,
  calculatePolylineLengthMeters
} from '../utils/geo.utils';
import { addSeconds, toIsoStringSafe } from '../utils/time.utils';

export interface RouteDetectionOptions {
  route: GeoJsonLineString | Coordinate[];
  departureTime?: Date | string;
  totalDurationSeconds?: number;
  totalDistanceMeters?: number;
  proximityThresholdMeters?: number; // Configurable threshold (default 75m)
  includeGradeSeparated?: boolean;   // Default true
}

export class RailwayCrossingDetectionService {
  constructor(private crossingRepo: CrossingRepository) {}

  /**
   * Detects and orders all railway crossings intersected by an actual road route geometry.
   *
   * @param options Route geometry, departure time, and configurable detection threshold.
   * @returns Ordered array of detected crossings in direction of travel.
   */
  public async detectCrossingsAlongRoute(
    options: RouteDetectionOptions
  ): Promise<DetectedCrossing[]> {
    // 1. Normalize and Validate Input Route Geometry
    const lineString = this.normalizeRouteGeometry(options.route);
    if (!lineString || !isValidLineString(lineString)) {
      console.warn('[RailwayCrossingDetectionService] Invalid or insufficient route coordinates provided');
      return [];
    }

    const proximityThresholdMeters =
      typeof options.proximityThresholdMeters === 'number' && options.proximityThresholdMeters > 0
        ? options.proximityThresholdMeters
        : 75; // Default 75 meters threshold

    const departureDate = options.departureTime
      ? options.departureTime instanceof Date
        ? options.departureTime
        : new Date(options.departureTime)
      : new Date();

    // If departureDate is invalid, default to now
    const validDepartureDate = isNaN(departureDate.getTime()) ? new Date() : departureDate;

    // Calculate total geometric distance if not provided
    const totalDistanceMeters =
      typeof options.totalDistanceMeters === 'number' && options.totalDistanceMeters > 0
        ? options.totalDistanceMeters
        : calculatePolylineLengthMeters(lineString);

    // Estimate duration assuming average speed of 40 km/h (11.11 m/s) if not provided
    const totalDurationSeconds =
      typeof options.totalDurationSeconds === 'number' && options.totalDurationSeconds > 0
        ? options.totalDurationSeconds
        : Math.round(totalDistanceMeters / 11.11);

    // 2. Broad-Phase Spatial Query: Obtain candidate crossings within bounding box corridor
    const bbox = computeBoundingBox(lineString.coordinates, 0.04);
    const candidateCrossings = await this.crossingRepo.findCrossingsInCorridor(bbox, lineString);

    if (!candidateCrossings || candidateCrossings.length === 0) {
      return [];
    }

    // 3. Narrow-Phase Geometric Projection: Point-to-segment comparison on actual road polyline
    const matchedCrossings: DetectedCrossing[] = [];

    for (const crossing of candidateCrossings) {
      // Validate crossing coordinates
      const crossingCoord: Coordinate = {
        lat: crossing.latitude,
        lng: crossing.longitude
      };

      if (!isValidCoordinate(crossingCoord)) {
        continue;
      }

      // Filter grade-separated if excluded
      if (options.includeGradeSeparated === false && crossing.isGradeSeparated) {
        continue;
      }

      const projection = projectPointOnPolyline(crossingCoord, lineString);

      // 4. Determine whether the user is likely to pass through that crossing
      if (projection.minDistanceMeters <= proximityThresholdMeters) {
        // 6. Calculate approximate distance along route
        const distanceAlongRoute = Math.round(projection.cumulativeDistanceAlongRouteMeters);

        // 7. Calculate estimated user arrival time based on distance fraction
        const distanceFraction = totalDistanceMeters > 0 ? distanceAlongRoute / totalDistanceMeters : 0;
        const travelSeconds = Math.round(totalDurationSeconds * distanceFraction);
        const etaDate = addSeconds(validDepartureDate, travelSeconds);

        matchedCrossings.push({
          crossingId: crossing.id,
          crossingName: crossing.name || (crossing.crossingCode ? `Crossing ${crossing.crossingCode}` : null),
          routePosition: {
            segmentIndex: projection.segmentIndex,
            fractionAlongSegment: Number(projection.fractionAlongSegment.toFixed(4)),
            normalizedPosition: Number(projection.normalizedPosition.toFixed(4)),
            coordinates: projection.projectedCoordinate
          },
          distance: distanceAlongRoute,
          estimatedArrivalTime: toIsoStringSafe(etaDate),
          source: crossing.source || crossing.provenance?.providerName || 'OpenStreetMap Overpass API',
          crossingCode: crossing.crossingCode,
          railwayLine: crossing.railwayLine,
          roadName: crossing.roadName,
          gateType: crossing.gateType,
          isGradeSeparated: crossing.isGradeSeparated,
          distanceFromRouteCenterlineMeters: Number(projection.minDistanceMeters.toFixed(1)),
          lastUpdated: crossing.lastUpdated,
          rawCrossing: crossing
        });
      }
    }

    // 5. Order detected crossings strictly according to the user's direction of travel
    matchedCrossings.sort((a, b) => a.distance - b.distance);

    // 6. Intelligent Spatial & Attribute Deduplication:
    // Multi-track and dual-carriageway railway crossings frequently produce multiple OSM nodes
    // within 5–120 meters of each other representing the same physical gate.
    // Merge proximate nodes (<120m apart or sharing the same crossing code/name) into a single consolidated crossing.
    const deduplicated: DetectedCrossing[] = [];
    for (const current of matchedCrossings) {
      if (deduplicated.length === 0) {
        deduplicated.push(current);
        continue;
      }

      const prev = deduplicated[deduplicated.length - 1];
      const distanceApart = Math.abs(current.distance - prev.distance);

      const isSameCrossing =
        distanceApart <= 120 || // Within 120m along the road corridor
        (Boolean(current.crossingCode) && Boolean(prev.crossingCode) && current.crossingCode === prev.crossingCode) ||
        (Boolean(current.crossingName) && Boolean(prev.crossingName) && current.crossingName === prev.crossingName);

      if (isSameCrossing) {
        // Merge into the existing crossing: pick the richer name, valid crossing code, and maximum tracks
        if (!prev.crossingName && current.crossingName) {
          prev.crossingName = current.crossingName;
        }
        if (!prev.crossingCode && current.crossingCode) {
          prev.crossingCode = current.crossingCode;
        }
        if (current.rawCrossing?.tracksCount && (!prev.rawCrossing?.tracksCount || current.rawCrossing.tracksCount > prev.rawCrossing.tracksCount)) {
          if (prev.rawCrossing) {
            prev.rawCrossing.tracksCount = current.rawCrossing.tracksCount;
          }
        }
        if (current.rawCrossing?.confidenceScore && prev.rawCrossing?.confidenceScore) {
          prev.rawCrossing.confidenceScore = Math.max(prev.rawCrossing.confidenceScore, current.rawCrossing.confidenceScore);
        }
      } else {
        deduplicated.push(current);
      }
    }

    return deduplicated;
  }

  /**
   * Converts Coordinate[] array or GeoJsonLineString into a uniform GeoJsonLineString.
   */
  private normalizeRouteGeometry(
    route: GeoJsonLineString | Coordinate[]
  ): GeoJsonLineString | null {
    if (!route) return null;

    if (Array.isArray(route)) {
      if (route.length < 2) return null;
      return {
        type: 'LineString',
        coordinates: route.map((c) => [c.lng, c.lat])
      };
    }

    if (route.type === 'LineString' && Array.isArray(route.coordinates)) {
      return route;
    }

    return null;
  }
}
