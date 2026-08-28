import {
  Coordinate,
  DataProvenanceType,
  GeoJsonLineString,
  ProvenanceMetadata,
  RailwayCrossingRecord,
  UserCrossingArrivalPrediction
} from '@railway-gate/shared';
import {
  calculatePolylineLengthMeters,
  projectPointOnPolyline
} from '../utils/geo.utils';
import { addSeconds, toIsoStringSafe } from '../utils/time.utils';

export interface UserArrivalPredictionOptions {
  routePolyline: GeoJsonLineString;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  departureTime?: Date | string;
  currentUserLocation?: Coordinate;
  isTrafficAware?: boolean;
  routingProviderName?: string;
}

export class UserArrivalPredictionService {
  /**
   * Calculates the user's estimated travel time, distance, and bounded arrival uncertainty
   * for every railway crossing along the road route.
   */
  public predictUserArrivalAtCrossing(
    crossing: RailwayCrossingRecord,
    options: UserArrivalPredictionOptions
  ): UserCrossingArrivalPrediction {
    const {
      routePolyline,
      totalDistanceMeters,
      totalDurationSeconds,
      departureTime,
      currentUserLocation,
      isTrafficAware = false,
      routingProviderName = 'Routing Engine'
    } = options;

    const departureDate = departureTime
      ? departureTime instanceof Date
        ? departureTime
        : new Date(departureTime)
      : new Date();

    const validDepartureDate = isNaN(departureDate.getTime()) ? new Date() : departureDate;

    // 1. Determine User's Position along the Route Polyline
    let userDistanceAlongRouteMeters = 0;
    let userCurrentCoord: Coordinate = {
      lat: routePolyline.coordinates[0][1],
      lng: routePolyline.coordinates[0][0]
    };

    if (currentUserLocation) {
      const userProj = projectPointOnPolyline(currentUserLocation, routePolyline);
      userDistanceAlongRouteMeters = userProj.cumulativeDistanceAlongRouteMeters;
      userCurrentCoord = currentUserLocation;
    }

    // 2. Project Railway Crossing onto Route Polyline
    const crossingCoord: Coordinate = {
      lat: crossing.latitude,
      lng: crossing.longitude
    };
    const crossingProj = projectPointOnPolyline(crossingCoord, routePolyline);
    const crossingDistanceAlongRouteMeters = crossingProj.cumulativeDistanceAlongRouteMeters;

    // 3. Compute Net Route Distance from User's Current Position to Crossing
    const netDistanceMeters = Math.max(
      0,
      Math.round(crossingDistanceAlongRouteMeters - userDistanceAlongRouteMeters)
    );

    // 4. Calculate Traffic-Aware Estimated Travel Time
    const effectiveTotalDistance =
      totalDistanceMeters > 0 ? totalDistanceMeters : calculatePolylineLengthMeters(routePolyline);

    const distanceFraction =
      effectiveTotalDistance > 0 ? netDistanceMeters / effectiveTotalDistance : 0;

    // Base travel duration based on routing provider profile
    let estimatedTravelTimeSeconds = Math.round(totalDurationSeconds * distanceFraction);

    // Apply heuristic traffic congestion factor if live traffic is not natively supplied by provider
    const hour = validDepartureDate.getHours();
    const isPeakHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
    let trafficCondition: 'FREE_FLOW' | 'MODERATE' | 'HEAVY' | 'UNVERIFIED' = 'FREE_FLOW';

    if (isTrafficAware) {
      trafficCondition = isPeakHour ? 'HEAVY' : 'MODERATE';
    } else if (isPeakHour) {
      trafficCondition = 'MODERATE';
      estimatedTravelTimeSeconds = Math.round(estimatedTravelTimeSeconds * 1.15); // +15% peak congestion
    } else {
      trafficCondition = 'UNVERIFIED';
    }

    // 5. Calculate Estimated Arrival Time (T_arrival)
    const userArrivalDate = addSeconds(validDepartureDate, estimatedTravelTimeSeconds);
    const formattedArrivalTime = this.formatTimeHHMMSS(userArrivalDate);

    // 6. Calculate Expected Arrival Uncertainty Window
    // Uncertainty is proportional to remaining travel duration (widens with distance and unverified traffic)
    const uncertaintyPercentage = isTrafficAware ? 0.12 : 0.22; // ±12% if traffic-aware, ±22% if unverified
    const rawUncertaintySeconds = Math.round(estimatedTravelTimeSeconds * uncertaintyPercentage);
    const minUncertaintySec = isTrafficAware ? 45 : 75; // minimum floor
    const maxUncertaintySec = isTrafficAware ? 240 : 420; // maximum ceiling
    const plusMinusSeconds = Math.max(minUncertaintySec, Math.min(maxUncertaintySec, rawUncertaintySeconds));

    const minArrivalDate = addSeconds(userArrivalDate, -plusMinusSeconds);
    const maxArrivalDate = addSeconds(userArrivalDate, plusMinusSeconds);

    const uncertaintyWindow = {
      plusMinusSeconds,
      formattedText: this.formatUncertaintyText(plusMinusSeconds),
      minArrival: toIsoStringSafe(minArrivalDate),
      maxArrival: toIsoStringSafe(maxArrivalDate)
    };

    // 7. Determine Confidence and Reason
    const confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' = isTrafficAware
      ? 'HIGH'
      : netDistanceMeters < 5000
      ? 'MEDIUM'
      : 'LOW';

    const reason = isTrafficAware
      ? `Estimated based on live traffic-aware routing from ${routingProviderName}.`
      : `Estimated from road route distance (${(netDistanceMeters / 1000).toFixed(1)} km). Traffic conditions unverified.`;

    const provenance: ProvenanceMetadata = {
      sourceType: isTrafficAware
        ? DataProvenanceType.THIRD_PARTY_VERIFIED
        : DataProvenanceType.CALCULATED_ESTIMATE,
      providerName: routingProviderName,
      confidenceScore: isTrafficAware ? 0.92 : 0.78,
      isRealtime: isTrafficAware,
      lastSyncedAt: new Date().toISOString(),
      notes: reason
    };

    return {
      crossingId: crossing.id,
      crossingCode: crossing.crossingCode,
      userPosition: userCurrentCoord,
      userArrivalTime: toIsoStringSafe(userArrivalDate),
      formattedArrivalTime,
      distanceToCrossing: netDistanceMeters,
      formattedDistance: this.formatDistance(netDistanceMeters),
      estimatedTravelTime: estimatedTravelTimeSeconds,
      formattedTravelTime: this.formatDuration(estimatedTravelTimeSeconds),
      lastUpdated: new Date().toISOString(),
      uncertaintyWindow,
      trafficAware: isTrafficAware,
      trafficCondition,
      confidence,
      reason,
      provenance
    };
  }

  private formatTimeHHMMSS(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) return `${meters} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const remSec = seconds % 60;
    if (remSec === 0) return `${mins} min${mins > 1 ? 's' : ''}`;
    return `${mins} min ${remSec} sec`;
  }

  private formatUncertaintyText(seconds: number): string {
    if (seconds < 60) return `± ${seconds} sec`;
    const mins = Math.floor(seconds / 60);
    const remSec = seconds % 60;
    if (remSec === 0) return `± ${mins} min`;
    return `± ${mins} min ${remSec} sec`;
  }
}
