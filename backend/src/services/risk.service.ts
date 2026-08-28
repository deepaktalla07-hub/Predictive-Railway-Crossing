import {
  CrossingGateType,
  PredictedTrainEvent,
  RiskEvaluation,
  RiskLevel
} from '@railway-gate/shared';
import { calculateTimeOverlapSeconds } from '../utils/time.utils';

export interface UserArrivalWindow {
  estimatedArrival: Date;
  minArrival: Date;
  maxArrival: Date;
}

export class RiskCalculationService {
  /**
   * Evaluates risk of gate closure during road user's expected arrival window.
   */
  public evaluateCrossingRisk(params: {
    userArrival: UserArrivalWindow;
    predictedEvents: PredictedTrainEvent[];
    isGradeSeparated: boolean;
    gateType: CrossingGateType;
    tracksCount: number;
    baseConfidence: number;
  }): { evaluation: RiskEvaluation; updatedEvents: PredictedTrainEvent[] } {
    const {
      userArrival,
      predictedEvents,
      isGradeSeparated,
      gateType,
      tracksCount,
      baseConfidence
    } = params;

    // If grade-separated (ROB flyover or RUB underpass), risk is permanently zero/clear
    if (isGradeSeparated || gateType === CrossingGateType.SPECIAL_GRADE) {
      return {
        evaluation: {
          riskScore: 0,
          riskLevel: RiskLevel.CLEAR,
          recommendation: 'PROCEED',
          summary: 'Grade-separated overpass/underpass (No rail gate intersection)',
          delaySeveritySeconds: 0,
          confidenceScore: 1.0
        },
        updatedEvents: predictedEvents
      };
    }

    // If data confidence is too low or gate status is UNKNOWN
    if (baseConfidence < 0.5 || gateType === CrossingGateType.UNKNOWN) {
      return {
        evaluation: {
          riskScore: 50,
          riskLevel: RiskLevel.UNKNOWN,
          recommendation: 'MANUAL_VERIFICATION',
          summary: 'Insufficient real-time timetable/telemetry data for this crossing. Proceed with manual caution.',
          delaySeveritySeconds: 0,
          confidenceScore: baseConfidence
        },
        updatedEvents: predictedEvents
      };
    }

    if (predictedEvents.length === 0) {
      return {
        evaluation: {
          riskScore: 5,
          riskLevel: RiskLevel.CLEAR,
          recommendation: 'PROCEED',
          summary: 'No trains scheduled near arrival window',
          delaySeveritySeconds: 0,
          confidenceScore: baseConfidence
        },
        updatedEvents: []
      };
    }

    let maxOverlapSeconds = 0;
    let maxPotentialDelaySeconds = 0;

    const updatedEvents = predictedEvents.map((evt) => {
      const gateStart = new Date(evt.gateClosureWindow.closeStartTime);
      const gateEnd = new Date(evt.gateClosureWindow.reopenTime);

      const overlapSeconds = calculateTimeOverlapSeconds(
        { start: userArrival.minArrival, end: userArrival.maxArrival },
        { start: gateStart, end: gateEnd }
      );

      if (overlapSeconds > maxOverlapSeconds) {
        maxOverlapSeconds = overlapSeconds;
      }

      // Potential wait time if arriving during closed window
      if (userArrival.estimatedArrival >= gateStart && userArrival.estimatedArrival <= gateEnd) {
        const remainingGateWait = Math.floor((gateEnd.getTime() - userArrival.estimatedArrival.getTime()) / 1000);
        if (remainingGateWait > maxPotentialDelaySeconds) {
          maxPotentialDelaySeconds = remainingGateWait;
        }
      }

      return {
        ...evt,
        temporalOverlapSeconds: overlapSeconds
      };
    });

    // Risk Formulation
    const userWindowDurationSec = Math.max(
      60,
      Math.floor((userArrival.maxArrival.getTime() - userArrival.minArrival.getTime()) / 1000)
    );

    // Probability of closure overlap: overlap / windowDuration
    const pClosure = Math.min(1.0, maxOverlapSeconds / userWindowDurationSec);

    // Delay severity score (normalized up to 10 mins = 600s)
    const maxAcceptableDelay = 600;
    const sDelay = Math.min(1.0, (maxPotentialDelaySeconds || (pClosure > 0 ? 300 : 0)) / maxAcceptableDelay);

    // Multi-track multiplier (1.0 for single track, 1.15 for 2 tracks, 1.25 for >2 tracks)
    const trackMultiplier = tracksCount > 2 ? 1.25 : tracksCount === 2 ? 1.15 : 1.0;

    // Raw score (0 to 100)
    const rawScore = (pClosure * 60 + sDelay * 40) * trackMultiplier;
    const boundedScore = Math.min(100, Math.round(rawScore * baseConfidence));

    // Determine Risk Level & Recommendation
    let riskLevel: RiskLevel;
    let recommendation: RiskEvaluation['recommendation'];
    let summary: string;

    if (boundedScore <= 20) {
      riskLevel = RiskLevel.CLEAR;
      recommendation = 'PROCEED';
      summary = 'Clear traversal window. Safe to proceed on current route.';
    } else if (boundedScore <= 45) {
      riskLevel = RiskLevel.LOW_RISK;
      recommendation = 'MONITOR';
      summary = 'Train scheduled near arrival window. Minor chance of gate closure.';
    } else if (boundedScore <= 70) {
      riskLevel = RiskLevel.MODERATE_WARNING;
      recommendation = 'CONSIDER_DEPARTURE_SHIFT';
      summary = `Gate closure likely upon arrival (Est. delay ~${Math.round(sDelay * 10)} mins). Consider shifting departure or taking detour.`;
    } else {
      riskLevel = RiskLevel.HIGH_RISK_BLOCK;
      recommendation = 'AVOID_CROSSING';
      summary = `High probability of gate closure upon arrival. Alternate route (ROB/RUB detour) strongly recommended.`;
    }

    return {
      evaluation: {
        riskScore: boundedScore,
        riskLevel,
        recommendation,
        summary,
        delaySeveritySeconds: maxPotentialDelaySeconds,
        confidenceScore: baseConfidence
      },
      updatedEvents
    };
  }
}

export const defaultRiskCalculator = new RiskCalculationService();
