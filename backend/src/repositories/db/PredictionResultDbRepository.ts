import { Pool } from 'pg';
import { TrainCrossingPredictionResult } from '@railway-gate/shared';
import { getDatabasePool } from '../../db/pool';

export interface PredictionResultEntity {
  id: string;
  routeAnalysisId: string | null;
  crossingId: string;
  trainNumber: string | null;
  trainPredictedCrossingTime: Date | null;
  userPredictedArrivalTime: Date;
  timeDifferenceSeconds: number | null;
  riskLevel: string;
  confidenceScore: number;
  predictionMethod: string;
  uncertaintyPlusMinusSeconds: number | null;
  reason: string;
  createdAt: Date;
}

export class PredictionResultDbRepository {
  constructor(private pool: Pool = getDatabasePool()) {}

  public async recordPrediction(
    prediction: TrainCrossingPredictionResult,
    userArrivalTime: Date,
    routeAnalysisId?: string
  ): Promise<PredictionResultEntity> {
    const query = `
      INSERT INTO prediction_results (
        id, route_analysis_id, crossing_id, train_number,
        train_predicted_crossing_time, user_predicted_arrival_time,
        time_difference_seconds, risk_level, confidence_score,
        prediction_method, uncertainty_plus_minus_seconds, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, route_analysis_id as "routeAnalysisId", crossing_id as "crossingId",
                train_number as "trainNumber",
                train_predicted_crossing_time as "trainPredictedCrossingTime",
                user_predicted_arrival_time as "userPredictedArrivalTime",
                time_difference_seconds as "timeDifferenceSeconds",
                risk_level as "riskLevel", confidence_score as "confidenceScore",
                prediction_method as "predictionMethod",
                uncertainty_plus_minus_seconds as "uncertaintyPlusMinusSeconds",
                reason, created_at as "createdAt";
    `;

    const trainDate = prediction.predictedCrossingTime ? new Date(prediction.predictedCrossingTime) : null;
    const diffSec = trainDate ? Math.round(Math.abs(trainDate.getTime() - userArrivalTime.getTime()) / 1000) : null;

    const values = [
      `pred_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      routeAnalysisId || null,
      prediction.crossingId,
      prediction.trainNumber || null,
      trainDate,
      userArrivalTime,
      diffSec,
      prediction.confidence === 'UNKNOWN' ? 'UNKNOWN' : prediction.confidence,
      prediction.confidenceScore,
      prediction.method,
      prediction.uncertaintyWindow?.plusMinusSeconds || null,
      prediction.reason
    ];

    const { rows } = await this.pool.query(query, values);
    return rows[0];
  }

  public async getByRouteAnalysisId(routeAnalysisId: string): Promise<PredictionResultEntity[]> {
    const query = `
      SELECT id, route_analysis_id as "routeAnalysisId", crossing_id as "crossingId",
             train_number as "trainNumber",
             train_predicted_crossing_time as "trainPredictedCrossingTime",
             user_predicted_arrival_time as "userPredictedArrivalTime",
             time_difference_seconds as "timeDifferenceSeconds",
             risk_level as "riskLevel", confidence_score as "confidenceScore",
             prediction_method as "predictionMethod",
             uncertainty_plus_minus_seconds as "uncertaintyPlusMinusSeconds",
             reason, created_at as "createdAt"
      FROM prediction_results
      WHERE route_analysis_id = $1
      ORDER BY user_predicted_arrival_time ASC;
    `;
    const { rows } = await this.pool.query(query, [routeAnalysisId]);
    return rows;
  }
}
