import { Pool } from 'pg';
import { RouteAnalysisResponse } from '@railway-gate/shared';
import { getDatabasePool } from '../../db/pool';

export interface RouteAnalysisEntity {
  id: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  departureTime: Date;
  distanceMeters: number;
  durationSeconds: number;
  overallRiskLevel: string;
  maxRiskScore: number;
  totalCrossingsCount: number;
  conflictingCrossingsCount: number;
  maxPotentialDelaySeconds: number;
  routingProvider: string;
  createdAt: Date;
}

export class RouteAnalysisDbRepository {
  constructor(private pool: Pool = getDatabasePool()) {}

  public async recordAnalysis(analysis: RouteAnalysisResponse): Promise<void> {
    const p = analysis.primaryRoute;
    const req = analysis.requestParams;

    const query = `
      INSERT INTO route_analysis (
        id, origin_lat, origin_lng, destination_lat, destination_lng,
        departure_time, distance_meters, duration_seconds,
        overall_risk_level, max_risk_score, total_crossings_count,
        conflicting_crossings_count, max_potential_delay_seconds, routing_provider
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO NOTHING;
    `;
    const values = [
      analysis.requestId,
      req.origin.lat,
      req.origin.lng,
      req.destination.lat,
      req.destination.lng,
      new Date(req.departureTime),
      p.distanceMeters,
      p.durationSeconds,
      p.riskSummary.overallRiskLevel,
      p.riskSummary.maxRiskScore,
      p.riskSummary.totalCrossingsCount,
      p.riskSummary.conflictingCrossingsCount,
      p.riskSummary.maxPotentialDelaySeconds,
      p.provenance.providerName
    ];
    await this.pool.query(query, values);
  }

  public async getAnalysisById(id: string): Promise<RouteAnalysisEntity | null> {
    const query = `
      SELECT id, origin_lat as "originLat", origin_lng as "originLng",
             destination_lat as "destinationLat", destination_lng as "destinationLng",
             departure_time as "departureTime", distance_meters as "distanceMeters",
             duration_seconds as "durationSeconds", overall_risk_level as "overallRiskLevel",
             max_risk_score as "maxRiskScore", total_crossings_count as "totalCrossingsCount",
             conflicting_crossings_count as "conflictingCrossingsCount",
             max_potential_delay_seconds as "maxPotentialDelaySeconds",
             routing_provider as "routingProvider", created_at as "createdAt"
      FROM route_analysis
      WHERE id = $1;
    `;
    const { rows } = await this.pool.query(query, [id]);
    return rows[0] || null;
  }
}
