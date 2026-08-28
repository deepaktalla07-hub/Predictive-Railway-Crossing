import {
  Coordinate,
  CrossingRiskDetail,
  GeoJsonLineString,
  RailwayCrossingRecord,
  UserCrossingArrivalPrediction
} from '@railway-gate/shared';
import { CrossingRepository } from '../repositories/crossing.repository';
import { RailwayCrossingDetectionService } from './detection.service';
import { UserArrivalPredictionService } from './user-arrival.service';
import { RailwayCrossingRiskEngine } from './risk-engine.service';
import { addSeconds, toIsoStringSafe } from '../utils/time.utils';
import { KinematicEngineService } from './kinematic.service';
import { RiskCalculationService } from './risk.service';
import { TrainRepository } from '../repositories/train.repository';

export class CrossingsService {
  private detectionService: RailwayCrossingDetectionService;
  private userArrivalService: UserArrivalPredictionService;
  private riskEngine: RailwayCrossingRiskEngine;

  constructor(
    private crossingRepo: CrossingRepository,
    private trainRepo: TrainRepository,
    private kinematicEngine: KinematicEngineService,
    private riskCalculator: RiskCalculationService
  ) {
    this.detectionService = new RailwayCrossingDetectionService(crossingRepo);
    this.userArrivalService = new UserArrivalPredictionService();
    this.riskEngine = new RailwayCrossingRiskEngine();
  }

  /**
   * Finds all level crossings intersecting the actual road route geometry
   * and computes arrival/risk evaluations with bounded uncertainty.
   */
  public async analyzeRouteCrossings(params: {
    routePolyline: GeoJsonLineString;
    totalDurationSeconds: number;
    totalDistanceMeters: number;
    departureTime: Date;
    currentUserLocation?: Coordinate;
    isTrafficAware?: boolean;
    routingProviderName?: string;
    bufferMeters?: number;
  }): Promise<{ crossingDetails: CrossingRiskDetail[]; userPredictions: UserCrossingArrivalPrediction[] }> {
    const {
      routePolyline,
      totalDurationSeconds,
      totalDistanceMeters,
      departureTime,
      currentUserLocation,
      isTrafficAware = false,
      routingProviderName = 'Routing Provider',
      bufferMeters = 75 // Configurable proximity threshold (75m)
    } = params;

    // Use RailwayCrossingDetectionService for robust point-to-segment geometric detection
    const detectedMatches = await this.detectionService.detectCrossingsAlongRoute({
      route: routePolyline,
      departureTime,
      totalDurationSeconds,
      totalDistanceMeters,
      proximityThresholdMeters: bufferMeters,
      includeGradeSeparated: true
    });

    const crossingDetails: CrossingRiskDetail[] = [];
    const userPredictions: UserCrossingArrivalPrediction[] = [];

    for (const match of detectedMatches) {
      const crossing = match.rawCrossing;

      // 1. Calculate User-to-Crossing Arrival & Uncertainty Window
      const userPrediction = this.userArrivalService.predictUserArrivalAtCrossing(crossing, {
        routePolyline,
        totalDistanceMeters,
        totalDurationSeconds,
        departureTime,
        currentUserLocation,
        isTrafficAware,
        routingProviderName
      });
      userPredictions.push(userPrediction);

      const etaAtCrossing = new Date(userPrediction.userArrivalTime);
      const minArrival = new Date(userPrediction.uncertaintyWindow.minArrival);
      const maxArrival = new Date(userPrediction.uncertaintyWindow.maxArrival);

      // 2. Query scheduled trains around bounded user arrival window
      const windowStart = addSeconds(minArrival, -600); // 10 mins before earliest arrival
      const windowEnd = addSeconds(maxArrival, 600);    // 10 mins after latest arrival

      const scheduledRuns = await this.trainRepo.getScheduledTrainsNearCrossing(
        crossing.id,
        windowStart,
        windowEnd
      );

      // 3. Compute kinematic predicted closure events
      const predictedEvents = (scheduledRuns || []).map((run: any) =>
        this.kinematicEngine.computePredictedEvent({
          crossing,
          trainSchedule: run.schedule,
          estimatedArrivalAtCrossing: run.estimatedArrivalAtCrossing,
          trainSpeedKmh: run.speedKmh
        })
      );

      // 4. Evaluate temporal overlap & risk score
      const { evaluation, updatedEvents } = this.riskCalculator.evaluateCrossingRisk({
        userArrival: {
          estimatedArrival: etaAtCrossing,
          minArrival,
          maxArrival
        },
        predictedEvents,
        isGradeSeparated: crossing.isGradeSeparated,
        gateType: crossing.gateType,
        tracksCount: crossing.tracksCount || 2,
        baseConfidence: crossing.provenance.confidenceScore
      });

      // 5. Evaluate Precise Time Difference with RailwayCrossingRiskEngine
      const primaryTrainCrossingTime = predictedEvents[0]?.estimatedCrossingTime || null;
      const riskComparison = this.riskEngine.evaluateRisk({
        trainCrossingTime: primaryTrainCrossingTime,
        userArrivalTime: userPrediction.userArrivalTime,
        isGradeSeparated: crossing.isGradeSeparated,
        confidenceScore: crossing.provenance.confidenceScore
      });

      crossingDetails.push({
        crossingId: crossing.id,
        crossingCode: crossing.crossingCode,
        name: crossing.name || `Level Crossing (${crossing.crossingCode})`,
        location: { lat: crossing.latitude, lng: crossing.longitude },
        gateType: crossing.gateType,
        isGradeSeparated: crossing.isGradeSeparated,
        distanceFromRouteStartMeters: userPrediction.distanceToCrossing,
        userEtaAtCrossing: {
          arrivalTime: userPrediction.userArrivalTime,
          timeFromDepartureSeconds: userPrediction.estimatedTravelTime,
          arrivalWindow: {
            minArrival: userPrediction.uncertaintyWindow.minArrival,
            maxArrival: userPrediction.uncertaintyWindow.maxArrival
          }
        },
        predictedTrainEvents: updatedEvents,
        riskEvaluation: evaluation,
        riskComparison,
        provenance: crossing.provenance
      });
    }

    return { crossingDetails, userPredictions };
  }
}
