import {
  CrossingRiskComparisonResult,
  CrossingRiskThresholds,
  DataProvenanceType,
  DEFAULT_RISK_THRESHOLDS,
  ProvenanceMetadata
} from '@railway-gate/shared';

export interface EvaluateCrossingRiskParams {
  trainCrossingTime: Date | string | null;
  userArrivalTime: Date | string | null;
  isGradeSeparated?: boolean;
  confidenceScore?: number;
  thresholds?: Partial<CrossingRiskThresholds>;
}

export class RailwayCrossingRiskEngine {
  private defaultThresholds: CrossingRiskThresholds;

  constructor(customDefaultThresholds?: Partial<CrossingRiskThresholds>) {
    this.defaultThresholds = {
      ...DEFAULT_RISK_THRESHOLDS,
      ...(customDefaultThresholds || {})
    };
  }

  /**
   * Compares train predicted crossing time with user predicted arrival time
   * and calculates the resulting risk level using configurable thresholds.
   *
   * @param params Crossing times, grade separation flag, and optional threshold overrides.
   * @returns Bounded risk prediction result.
   */
  public evaluateRisk(params: EvaluateCrossingRiskParams): CrossingRiskComparisonResult {
    const {
      trainCrossingTime,
      userArrivalTime,
      isGradeSeparated = false,
      confidenceScore = 0.85,
      thresholds: overrideThresholds
    } = params;

    const thresholds: CrossingRiskThresholds = {
      ...this.defaultThresholds,
      ...(overrideThresholds || {})
    };

    const trainDate = trainCrossingTime ? new Date(trainCrossingTime) : null;
    const userDate = userArrivalTime ? new Date(userArrivalTime) : null;

    // 1. Grade-Separated Infrastructure (Flyovers, ROBs, RUBs)
    if (isGradeSeparated) {
      return {
        riskLevel: 'LOW',
        timeDifferenceSeconds: null,
        formattedTimeDifference: 'N/A (Grade-Separated)',
        confidence: 'HIGH',
        confidenceScore: 1.0,
        reason: 'Grade-separated overpass/underpass. Safe traversal without railway gate interaction.',
        trainCrossingTime: trainDate ? trainDate.toISOString() : null,
        userArrivalTime: userDate ? userDate.toISOString() : null,
        isGradeSeparated: true,
        lastUpdated: new Date().toISOString(),
        provenance: {
          sourceType: DataProvenanceType.THIRD_PARTY_VERIFIED,
          providerName: 'Railway Crossing Risk Engine',
          confidenceScore: 1.0,
          isRealtime: false,
          notes: 'Grade-separated railway crossing structure'
        }
      };
    }

    // 2. Insufficient Data / Missing Timestamps / Low Confidence
    if (
      !trainDate ||
      !userDate ||
      isNaN(trainDate.getTime()) ||
      isNaN(userDate.getTime()) ||
      confidenceScore < thresholds.minConfidenceThreshold
    ) {
      return {
        riskLevel: 'UNKNOWN',
        timeDifferenceSeconds: null,
        formattedTimeDifference: 'Unknown',
        confidence: 'UNKNOWN',
        confidenceScore: Math.min(0.3, confidenceScore),
        reason: 'Risk is unverified due to insufficient real-time train telemetry or unmapped timetable data.',
        trainCrossingTime: trainDate && !isNaN(trainDate.getTime()) ? trainDate.toISOString() : null,
        userArrivalTime: userDate && !isNaN(userDate.getTime()) ? userDate.toISOString() : null,
        isGradeSeparated: false,
        lastUpdated: new Date().toISOString(),
        provenance: {
          sourceType: DataProvenanceType.UNKNOWN,
          providerName: 'Railway Crossing Risk Engine',
          confidenceScore: 0.2,
          isRealtime: false,
          notes: 'Insufficient train or user arrival data'
        }
      };
    }

    // 3. Calculate Time Difference (in seconds)
    const diffMs = Math.abs(trainDate.getTime() - userDate.getTime());
    const timeDifferenceSeconds = Math.round(diffMs / 1000);
    const formattedTimeDifference = this.formatDuration(timeDifferenceSeconds);

    // 4. Compare against Configurable Thresholds
    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    let reason: string;

    if (timeDifferenceSeconds <= thresholds.highRiskTimeDifferenceSeconds) {
      riskLevel = 'HIGH';
      confidence = confidenceScore >= 0.8 ? 'HIGH' : 'MEDIUM';
      reason = `High risk of encountering a closed railway crossing. Train is predicted to cross within ${formattedTimeDifference} of your arrival.`;
    } else if (timeDifferenceSeconds <= thresholds.moderateRiskTimeDifferenceSeconds) {
      riskLevel = 'MODERATE';
      confidence = 'MEDIUM';
      reason = `Moderate risk of encountering a closed railway crossing or gate queue (${formattedTimeDifference} separation).`;
    } else {
      riskLevel = 'LOW';
      confidence = confidenceScore >= 0.7 ? 'HIGH' : 'MEDIUM';
      reason = `Low risk of encountering a closed railway crossing (${formattedTimeDifference} clear separation).`;
    }

    const provenance: ProvenanceMetadata = {
      sourceType: DataProvenanceType.CALCULATED_ESTIMATE,
      providerName: 'Railway Crossing Risk Engine',
      confidenceScore,
      isRealtime: confidenceScore > 0.85,
      lastSyncedAt: new Date().toISOString(),
      notes: reason
    };

    return {
      riskLevel,
      timeDifferenceSeconds,
      formattedTimeDifference,
      confidence,
      confidenceScore,
      reason,
      trainCrossingTime: trainDate.toISOString(),
      userArrivalTime: userDate.toISOString(),
      isGradeSeparated: false,
      lastUpdated: new Date().toISOString(),
      provenance
    };
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
    const mins = Math.floor(seconds / 60);
    const remSec = seconds % 60;
    if (remSec === 0) return `${mins} minute${mins === 1 ? '' : 's'}`;
    return `${mins} min ${remSec} sec`;
  }
}

export const defaultRiskEngine = new RailwayCrossingRiskEngine();
