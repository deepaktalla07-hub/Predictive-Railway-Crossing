import {
  AlternativeRouteResult,
  Coordinate,
  CrossingRiskDetail,
  NormalRouteComparison,
  RiskLevel,
  RouteRiskSummary
} from '@railway-gate/shared';
import { IRoutingProvider } from '../providers/routing/IRoutingProvider';
import { distanceToPolylineMeters } from '../utils/geo.utils';
import { addSeconds, toIsoStringSafe } from '../utils/time.utils';

export interface GenerateAlternativesParams {
  origin: Coordinate;
  destination: Coordinate;
  conflictingCrossings: CrossingRiskDetail[];
  primaryDurationSeconds: number;
  primaryDistanceMeters: number;
  departureTime: Date;
  overallPrimaryRisk?: RiskLevel;
}

export class AlternativeRouteEngine {
  constructor(private routingProvider: IRoutingProvider) {}

  /**
   * Generates, compares, verifies avoidance, and ranks alternative routes when
   * one or more railway crossings have HIGH or MODERATE risk.
   */
  public async generateAlternatives(
    params: GenerateAlternativesParams
  ): Promise<AlternativeRouteResult[]> {
    const {
      origin,
      destination,
      conflictingCrossings,
      primaryDurationSeconds,
      primaryDistanceMeters,
      departureTime,
      overallPrimaryRisk = RiskLevel.HIGH
    } = params;

    // Filter crossings that strictly have HIGH or MODERATE risk
    const affectedCrossings = conflictingCrossings.filter(
      (c) =>
        c.riskEvaluation.riskLevel === RiskLevel.HIGH ||
        c.riskEvaluation.riskLevel === RiskLevel.MODERATE
    );

    if (affectedCrossings.length === 0) {
      return [];
    }

    const primaryCrossing = affectedCrossings[0];
    const avoidLocation: Coordinate = {
      lat: primaryCrossing.location.lat,
      lng: primaryCrossing.location.lng
    };

    const estimatedGateDelaySec = primaryCrossing.riskEvaluation.delaySeveritySeconds || 480; // 8 mins default wait

    const normalRouteComparison: NormalRouteComparison = {
      normalDistanceMeters: primaryDistanceMeters,
      normalDurationSeconds: primaryDurationSeconds,
      formattedNormalDistance: this.formatDistance(primaryDistanceMeters),
      formattedNormalDuration: this.formatDuration(primaryDurationSeconds),
      normalRiskLevel: overallPrimaryRisk
    };

    const candidateAlternatives: AlternativeRouteResult[] = [];

    // -------------------------------------------------------------
    // Strategy 1: Grade-Separated ROB Flyover Detour
    // -------------------------------------------------------------
    try {
      const robRoute = await this.routingProvider.calculateAlternativeRoute(
        origin,
        destination,
        [avoidLocation],
        'ROB_DETOUR'
      );

      // Verify spatial avoidance
      const { minDistanceMeters } = distanceToPolylineMeters(avoidLocation, robRoute.polylineGeoJSON);
      const avoidsAffectedCrossing = minDistanceMeters > 75; // More than 75m away from level crossing

      const additionalDist = robRoute.distanceMeters - primaryDistanceMeters;
      const additionalDuration = robRoute.durationSeconds - primaryDurationSeconds;
      const netTimeSaved = estimatedGateDelaySec - Math.max(0, additionalDuration);

      const safetyReason = avoidsAffectedCrossing
        ? `Confirmed: Bypasses ${primaryCrossing.name} (${primaryCrossing.crossingCode}) via elevated Railway Over Bridge (ROB flyover).`
        : `Unverified: Route passes within ${Math.round(minDistanceMeters)}m of the affected crossing.`;

      const robRiskSummary: RouteRiskSummary = {
        overallRiskLevel: RiskLevel.LOW,
        maxRiskScore: 0,
        totalCrossingsCount: 0,
        conflictingCrossingsCount: 0,
        maxPotentialDelaySeconds: 0,
        summaryRecommendation: 'Grade-separated overpass with zero railway gate intersection risk.'
      };

      candidateAlternatives.push({
        id: 'alt-rob-detour',
        title: 'ROB Flyover Detour (Grade-Separated)',
        summary: `Avoids ${primaryCrossing.crossingCode} (${primaryCrossing.name}) via elevated Railway Over Bridge`,
        strategyType: 'GRADE_SEPARATED_ROB_RUB',
        distanceMeters: robRoute.distanceMeters,
        durationSeconds: robRoute.durationSeconds,
        formattedDistance: this.formatDistance(robRoute.distanceMeters),
        formattedDuration: this.formatDuration(robRoute.durationSeconds),
        additionalDistanceMeters: additionalDist,
        formattedAdditionalDistance: this.formatDifferenceDistance(additionalDist),
        additionalDurationSeconds: additionalDuration,
        formattedAdditionalDuration: this.formatDifferenceDuration(additionalDuration),
        netTimeDifferenceSeconds: additionalDuration,
        timeSavedVsGateWaitSeconds: netTimeSaved,
        avoidsAffectedCrossing,
        safetyConfirmationReason: safetyReason,
        avoidedCrossings: avoidsAffectedCrossing ? [primaryCrossing.crossingCode] : [],
        isRecommended: false, // Calculated during ranking
        rankingScore: 0,
        normalRouteComparison,
        polylineGeoJSON: robRoute.polylineGeoJSON,
        riskSummary: robRiskSummary
      });
    } catch (err: any) {
      console.warn('[AlternativeRouteEngine] Failed to calculate ROB detour:', err.message);
    }

    // -------------------------------------------------------------
    // Strategy 2: Alternate Road Crossing Bypass
    // -------------------------------------------------------------
    try {
      const altCrossingRoute = await this.routingProvider.calculateAlternativeRoute(
        origin,
        destination,
        [avoidLocation],
        'ALTERNATE_CROSSING'
      );

      const { minDistanceMeters } = distanceToPolylineMeters(
        avoidLocation,
        altCrossingRoute.polylineGeoJSON
      );
      const avoidsAffectedCrossing = minDistanceMeters > 75;

      const additionalDist = altCrossingRoute.distanceMeters - primaryDistanceMeters;
      const additionalDuration = altCrossingRoute.durationSeconds - primaryDurationSeconds;
      const netTimeSaved = estimatedGateDelaySec - Math.max(0, additionalDuration);

      const safetyReason = avoidsAffectedCrossing
        ? `Confirmed: Reroutes around ${primaryCrossing.crossingCode} onto an alternate corridor.`
        : `Unverified: Route passes near the affected crossing.`;

      const altRiskSummary: RouteRiskSummary = {
        overallRiskLevel: RiskLevel.LOW,
        maxRiskScore: 20,
        totalCrossingsCount: 1,
        conflictingCrossingsCount: 0,
        maxPotentialDelaySeconds: 60,
        summaryRecommendation: 'Alternate road crossing with no predicted train conflict during arrival.'
      };

      candidateAlternatives.push({
        id: 'alt-bypass-crossing',
        title: 'Alternate Road Crossing Bypass',
        summary: `Reroutes via lower-risk corridor avoiding ${primaryCrossing.crossingCode}`,
        strategyType: 'ALTERNATE_CROSSING',
        distanceMeters: altCrossingRoute.distanceMeters,
        durationSeconds: altCrossingRoute.durationSeconds,
        formattedDistance: this.formatDistance(altCrossingRoute.distanceMeters),
        formattedDuration: this.formatDuration(altCrossingRoute.durationSeconds),
        additionalDistanceMeters: additionalDist,
        formattedAdditionalDistance: this.formatDifferenceDistance(additionalDist),
        additionalDurationSeconds: additionalDuration,
        formattedAdditionalDuration: this.formatDifferenceDuration(additionalDuration),
        netTimeDifferenceSeconds: additionalDuration,
        timeSavedVsGateWaitSeconds: netTimeSaved,
        avoidsAffectedCrossing,
        safetyConfirmationReason: safetyReason,
        avoidedCrossings: avoidsAffectedCrossing ? [primaryCrossing.crossingCode] : [],
        isRecommended: false,
        rankingScore: 0,
        normalRouteComparison,
        polylineGeoJSON: altCrossingRoute.polylineGeoJSON,
        riskSummary: altRiskSummary
      });
    } catch (err: any) {
      console.warn('[AlternativeRouteEngine] Failed to calculate alternate crossing route:', err.message);
    }

    // -------------------------------------------------------------
    // Strategy 3: Temporal Departure Time Shift
    // -------------------------------------------------------------
    if (primaryCrossing.predictedTrainEvents.length > 0) {
      const firstEvent = primaryCrossing.predictedTrainEvents[0];
      const gateOpenTime = new Date(firstEvent.gateClosureWindow.reopenTime);
      const shiftSeconds = Math.max(
        300,
        Math.floor((gateOpenTime.getTime() - departureTime.getTime()) / 1000) + 120
      );
      const suggestedDeparture = addSeconds(departureTime, shiftSeconds);

      candidateAlternatives.push({
        id: 'alt-time-shift',
        title: `Depart in ${Math.ceil(shiftSeconds / 60)} mins (Temporal Shift)`,
        summary: `Same driving route, but departs after train passes and gate reopens`,
        strategyType: 'DEPARTURE_TIME_SHIFT',
        distanceMeters: primaryDistanceMeters,
        durationSeconds: primaryDurationSeconds,
        formattedDistance: this.formatDistance(primaryDistanceMeters),
        formattedDuration: this.formatDuration(primaryDurationSeconds),
        additionalDistanceMeters: 0,
        formattedAdditionalDistance: '+0.0 km',
        additionalDurationSeconds: 0,
        formattedAdditionalDuration: '+0 min',
        netTimeDifferenceSeconds: 0,
        timeSavedVsGateWaitSeconds: estimatedGateDelaySec,
        avoidsAffectedCrossing: true,
        safetyConfirmationReason: 'Confirmed: Same driving route, avoids gate closure by timing arrival after the train clears the crossing.',
        avoidedCrossings: [primaryCrossing.crossingCode],
        isRecommended: false,
        rankingScore: 0,
        normalRouteComparison,
        polylineGeoJSON: {
          type: 'LineString',
          coordinates: []
        },
        riskSummary: {
          overallRiskLevel: RiskLevel.LOW,
          maxRiskScore: 10,
          totalCrossingsCount: 1,
          conflictingCrossingsCount: 0,
          maxPotentialDelaySeconds: 0,
          summaryRecommendation: 'Gate will be open when you arrive.'
        },
        suggestedDepartureTime: toIsoStringSafe(suggestedDeparture)
      });
    }

    // -------------------------------------------------------------
    // 6. Rank Alternatives and Select Best Recommendation
    // -------------------------------------------------------------
    // Ranking Criteria:
    // 1. MUST avoid the affected crossing (avoidsAffectedCrossing === true)
    // 2. Maximize net time saved vs gate wait
    // 3. Favor grade-separated overpasses (ROB)
    // 4. Minimize detour driving penalty
    let bestScore = -Infinity;
    let bestIndex = -1;

    candidateAlternatives.forEach((alt, idx) => {
      if (!alt.avoidsAffectedCrossing) {
        alt.rankingScore = -100;
        alt.isRecommended = false;
        return;
      }

      let score = alt.timeSavedVsGateWaitSeconds;
      if (alt.strategyType === 'GRADE_SEPARATED_ROB_RUB') score += 50; // Bonus for 0 level crossings
      if (alt.additionalDurationSeconds <= 300) score += 30; // Small detour bonus

      alt.rankingScore = Math.round(score);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = idx;
      }
    });

    if (bestIndex >= 0 && candidateAlternatives[bestIndex].avoidsAffectedCrossing) {
      candidateAlternatives[bestIndex].isRecommended = true;
    }

    // Sort ranked alternatives (highest score first)
    candidateAlternatives.sort((a, b) => b.rankingScore - a.rankingScore);

    return candidateAlternatives;
  }

  private formatDistance(meters: number): string {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  private formatDuration(seconds: number): string {
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  }

  private formatDifferenceDistance(meters: number): string {
    const km = meters / 1000;
    const sign = km >= 0 ? '+' : '';
    return `${sign}${km.toFixed(1)} km`;
  }

  private formatDifferenceDuration(seconds: number): string {
    const mins = Math.round(seconds / 60);
    const sign = mins >= 0 ? '+' : '';
    return `${sign}${mins} min`;
  }
}
