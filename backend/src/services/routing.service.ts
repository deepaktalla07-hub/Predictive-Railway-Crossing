import {
  PrimaryRouteResult,
  RiskLevel,
  RouteAnalysisRequest,
  RouteAnalysisResponse,
  RouteRiskSummary
} from '@railway-gate/shared';
import { IRoutingProvider } from '../providers/routing/IRoutingProvider';
import { CrossingsService } from './crossings.service';
import { ReroutingService } from './rerouting.service';
import { toIsoStringSafe } from '../utils/time.utils';

interface CachedRouteEntry {
  response: RouteAnalysisResponse;
  cachedAt: number;
}

export class RoutingOrchestrationService {
  private routeCache = new Map<string, CachedRouteEntry>();
  private cacheTtlMs = 20000; // 20 seconds cache TTL to prevent external API spamming

  constructor(
    private routingProvider: IRoutingProvider,
    private crossingsService: CrossingsService,
    private reroutingService: ReroutingService
  ) {}

  public async analyzeJourney(
    request: RouteAnalysisRequest,
    options?: { forceFresh?: boolean }
  ): Promise<RouteAnalysisResponse> {
    const cacheKey = this.generateCacheKey(request);
    const now = Date.now();

    // Check Cache
    if (!options?.forceFresh) {
      const cached = this.routeCache.get(cacheKey);
      if (cached && now - cached.cachedAt < this.cacheTtlMs) {
        const ageSec = Math.round((now - cached.cachedAt) / 1000);
        return {
          ...cached.response,
          dataAgeSeconds: ageSec,
          cached: true,
          isStale: ageSec > 60,
          staleWarning: ageSec > 60 ? 'Data may be outdated.' : undefined
        };
      }
    }

    const departureDate = request.departureTime ? new Date(request.departureTime) : new Date();

    // 1. Calculate Primary Driving Route
    const rawRoute = await this.routingProvider.calculateRoute(
      request.origin,
      request.destination,
      departureDate
    );

    // 2. Identify Intersecting Railway Level Crossings & User Arrival Predictions
    const { crossingDetails, userPredictions } = await this.crossingsService.analyzeRouteCrossings({
      routePolyline: rawRoute.polylineGeoJSON,
      totalDurationSeconds: rawRoute.durationSeconds,
      totalDistanceMeters: rawRoute.distanceMeters,
      departureTime: departureDate,
      currentUserLocation: request.currentUserLocation,
      isTrafficAware: rawRoute.provenance.isRealtime,
      routingProviderName: rawRoute.provenance.providerName,
      bufferMeters: request.crossingBufferMeters || 75
    });

    // 3. Evaluate Overall Route Risk Summary
    let maxRiskScore = 0;
    let conflictingCount = 0;
    let maxDelaySeconds = 0;

    for (const c of crossingDetails) {
      if (c.riskEvaluation.riskScore > maxRiskScore) {
        maxRiskScore = c.riskEvaluation.riskScore;
      }
      if (
        c.riskEvaluation.riskLevel === RiskLevel.MODERATE ||
        c.riskEvaluation.riskLevel === RiskLevel.HIGH
      ) {
        conflictingCount++;
      }
      if (c.riskEvaluation.delaySeveritySeconds > maxDelaySeconds) {
        maxDelaySeconds = c.riskEvaluation.delaySeveritySeconds;
      }
    }

    let overallRiskLevel = RiskLevel.LOW;
    let summaryRecommendation = 'Route is clear with minimal railway gate closure risk.';

    if (maxRiskScore > 70) {
      overallRiskLevel = RiskLevel.HIGH;
      summaryRecommendation = 'High probability of railway gate delay. Alternative route recommended.';
    } else if (maxRiskScore > 45) {
      overallRiskLevel = RiskLevel.MODERATE;
      summaryRecommendation = 'Potential railway gate delay during arrival window.';
    } else if (maxRiskScore > 20) {
      overallRiskLevel = RiskLevel.LOW;
      summaryRecommendation = 'Low risk of gate delay. Proceed with routine monitoring.';
    }

    const routeRiskSummary: RouteRiskSummary = {
      overallRiskLevel,
      maxRiskScore,
      totalCrossingsCount: crossingDetails.length,
      conflictingCrossingsCount: conflictingCount,
      maxPotentialDelaySeconds: maxDelaySeconds,
      summaryRecommendation
    };

    const primaryRoute: PrimaryRouteResult = {
      id: 'primary-route',
      summary: rawRoute.summary,
      distanceMeters: rawRoute.distanceMeters,
      durationSeconds: rawRoute.durationSeconds,
      polylineGeoJSON: rawRoute.polylineGeoJSON,
      riskSummary: routeRiskSummary,
      crossings: crossingDetails,
      userArrivalPredictions: userPredictions,
      provenance: rawRoute.provenance
    };

    // 4. Generate Alternative Routes if High or Moderate Risk Crossings are encountered
    const conflictingCrossings = crossingDetails.filter(
      (c) =>
        c.riskEvaluation.riskLevel === RiskLevel.HIGH ||
        c.riskEvaluation.riskLevel === RiskLevel.MODERATE
    );

    const alternativeRoutes = await this.reroutingService.generateAlternatives({
      origin: request.origin,
      destination: request.destination,
      conflictingCrossings,
      primaryDurationSeconds: rawRoute.durationSeconds,
      primaryDistanceMeters: rawRoute.distanceMeters,
      departureTime: departureDate,
      overallPrimaryRisk: overallRiskLevel
    });

    const response: RouteAnalysisResponse = {
      status: 'SUCCESS',
      requestId: `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      analyzedAt: new Date().toISOString(),
      dataAgeSeconds: 0,
      cached: false,
      isStale: false,
      requestParams: {
        origin: request.origin,
        destination: request.destination,
        departureTime: toIsoStringSafe(departureDate)
      },
      primaryRoute,
      alternativeRoutes
    };

    // Save to Cache
    this.routeCache.set(cacheKey, {
      response,
      cachedAt: now
    });

    return response;
  }

  private generateCacheKey(req: RouteAnalysisRequest): string {
    const orig = `${req.origin.lat.toFixed(4)},${req.origin.lng.toFixed(4)}`;
    const dest = `${req.destination.lat.toFixed(4)},${req.destination.lng.toFixed(4)}`;
    const depTime = req.departureTime ? Math.floor(new Date(req.departureTime).getTime() / 60000) : 'now';
    return `${orig}_${dest}_${depTime}`;
  }
}
