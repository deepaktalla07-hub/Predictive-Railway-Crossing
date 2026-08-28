import { Coordinate, DataProvenanceType, GeoJsonLineString } from '@railway-gate/shared';
import { IRoutingProvider, RawRouteResult } from './IRoutingProvider';
import { calculateHaversineDistanceMeters } from '../../utils/geo.utils';

export class DevStubRoutingProvider implements IRoutingProvider {
  public readonly providerName = 'Development Stub Routing Engine';

  public async calculateRoute(
    origin: Coordinate,
    destination: Coordinate
  ): Promise<RawRouteResult> {
    const distanceMeters = Math.round(calculateHaversineDistanceMeters(origin, destination) * 1.25);
    const averageSpeedKmh = 45;
    const durationSeconds = Math.round((distanceMeters / (averageSpeedKmh * 1000 / 3600)));

    // Generate intermediate path points with slight curve simulating real road networks
    const coords: [number, number][] = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const arcOffset = Math.sin(t * Math.PI) * 0.001; // Realistic road network curvature
      const lat = origin.lat + (destination.lat - origin.lat) * t + arcOffset;
      const lng = origin.lng + (destination.lng - origin.lng) * t + arcOffset * 0.5;
      coords.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
    }

    return {
      summary: 'Main Arterial Road (Dev Stub Route)',
      distanceMeters,
      durationSeconds,
      polylineGeoJSON: {
        type: 'LineString',
        coordinates: coords
      },
      provenance: {
        sourceType: DataProvenanceType.UNVERIFIED_DEV_STUB,
        providerName: this.providerName,
        confidenceScore: 0.9,
        isRealtime: false,
        notes: 'Simulated road corridor for local offline testing and UI validation'
      }
    };
  }

  public async calculateAlternativeRoute(
    origin: Coordinate,
    destination: Coordinate,
    avoidPoints: Coordinate[],
    strategy: 'ROB_DETOUR' | 'ALTERNATE_CROSSING'
  ): Promise<RawRouteResult> {
    const baseDistance = calculateHaversineDistanceMeters(origin, destination);
    const detourFactor = strategy === 'ROB_DETOUR' ? 1.15 : 1.28;
    const distanceMeters = Math.round(baseDistance * 1.25 * detourFactor);
    const durationSeconds = Math.round((distanceMeters / (42 * 1000 / 3600)));

    const coords: [number, number][] = [];
    const steps = 18;
    const curveSign = strategy === 'ROB_DETOUR' ? -1 : 1;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const detourArc = Math.sin(t * Math.PI) * 0.025 * curveSign;
      const lat = origin.lat + (destination.lat - origin.lat) * t + detourArc;
      const lng = origin.lng + (destination.lng - origin.lng) * t + detourArc * 1.2;
      coords.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
    }

    return {
      summary: strategy === 'ROB_DETOUR' ? 'via Ring Road ROB Flyover Detour' : 'via West Bypass Crossing',
      distanceMeters,
      durationSeconds,
      polylineGeoJSON: {
        type: 'LineString',
        coordinates: coords
      },
      provenance: {
        sourceType: DataProvenanceType.UNVERIFIED_DEV_STUB,
        providerName: this.providerName,
        confidenceScore: 0.88,
        isRealtime: false,
        notes: 'Deterministic detour geometry for testing alternative routing'
      }
    };
  }
}
