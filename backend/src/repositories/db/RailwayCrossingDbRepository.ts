import { Pool } from 'pg';
import { BoundingBox, CrossingGateType, DataProvenanceType, RailwayCrossingRecord } from '@railway-gate/shared';
import { getDatabasePool } from '../../db/pool';

export class RailwayCrossingDbRepository {
  constructor(private pool: Pool = getDatabasePool()) {}

  public async getAll(options?: { limit?: number; offset?: number }): Promise<RailwayCrossingRecord[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const query = `
      SELECT rc.id, rc.crossing_code as "crossingCode", rc.name, rc.latitude, rc.longitude,
             rc.railway_line as "railwayLine", rc.road_name as "roadName", rc.gate_type as "gateType",
             rc.is_grade_separated as "isGradeSeparated", rc.tracks_count as "tracksCount",
             rc.pre_closure_buffer_seconds as "preClosureBufferSeconds",
             rc.post_clearance_buffer_seconds as "postClearanceBufferSeconds",
             rc.average_closure_duration_seconds as "averageClosureDurationSeconds",
             rc.confidence_score as "confidenceScore", rc.source_external_id as "sourceId",
             rc.last_updated as "lastUpdated",
             ds.name as "sourceName", ds.attribution as "sourceAttribution", ds.license as "sourceLicense"
      FROM railway_crossings rc
      LEFT JOIN data_sources ds ON rc.data_source_id = ds.id
      ORDER BY rc.crossing_code ASC
      LIMIT $1 OFFSET $2;
    `;
    const { rows } = await this.pool.query(query, [limit, offset]);
    return rows.map(this.mapRowToRecord);
  }

  public async findById(id: string): Promise<RailwayCrossingRecord | null> {
    const query = `
      SELECT rc.id, rc.crossing_code as "crossingCode", rc.name, rc.latitude, rc.longitude,
             rc.railway_line as "railwayLine", rc.road_name as "roadName", rc.gate_type as "gateType",
             rc.is_grade_separated as "isGradeSeparated", rc.tracks_count as "tracksCount",
             rc.pre_closure_buffer_seconds as "preClosureBufferSeconds",
             rc.post_clearance_buffer_seconds as "postClearanceBufferSeconds",
             rc.average_closure_duration_seconds as "averageClosureDurationSeconds",
             rc.confidence_score as "confidenceScore", rc.source_external_id as "sourceId",
             rc.last_updated as "lastUpdated",
             ds.name as "sourceName", ds.attribution as "sourceAttribution", ds.license as "sourceLicense"
      FROM railway_crossings rc
      LEFT JOIN data_sources ds ON rc.data_source_id = ds.id
      WHERE rc.id = $1;
    `;
    const { rows } = await this.pool.query(query, [id]);
    return rows[0] ? this.mapRowToRecord(rows[0]) : null;
  }

  public async findByBoundingBox(bbox: BoundingBox, limit = 200): Promise<RailwayCrossingRecord[]> {
    const query = `
      SELECT rc.id, rc.crossing_code as "crossingCode", rc.name, rc.latitude, rc.longitude,
             rc.railway_line as "railwayLine", rc.road_name as "roadName", rc.gate_type as "gateType",
             rc.is_grade_separated as "isGradeSeparated", rc.tracks_count as "tracksCount",
             rc.pre_closure_buffer_seconds as "preClosureBufferSeconds",
             rc.post_clearance_buffer_seconds as "postClearanceBufferSeconds",
             rc.average_closure_duration_seconds as "averageClosureDurationSeconds",
             rc.confidence_score as "confidenceScore", rc.source_external_id as "sourceId",
             rc.last_updated as "lastUpdated",
             ds.name as "sourceName", ds.attribution as "sourceAttribution", ds.license as "sourceLicense"
      FROM railway_crossings rc
      LEFT JOIN data_sources ds ON rc.data_source_id = ds.id
      WHERE rc.latitude BETWEEN $1 AND $2
        AND rc.longitude BETWEEN $3 AND $4
      ORDER BY rc.crossing_code ASC
      LIMIT $5;
    `;
    const { rows } = await this.pool.query(query, [
      bbox.minLat,
      bbox.maxLat,
      bbox.minLng,
      bbox.maxLng,
      limit
    ]);
    return rows.map(this.mapRowToRecord);
  }

  public async upsert(crossing: RailwayCrossingRecord, dataSourceId = 'src-osm-overpass'): Promise<void> {
    const query = `
      INSERT INTO railway_crossings (
        id, crossing_code, name, latitude, longitude, railway_line, road_name,
        gate_type, is_grade_separated, tracks_count, pre_closure_buffer_seconds,
        post_clearance_buffer_seconds, average_closure_duration_seconds,
        confidence_score, data_source_id, source_external_id, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        crossing_code = EXCLUDED.crossing_code,
        name = EXCLUDED.name,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        railway_line = EXCLUDED.railway_line,
        road_name = EXCLUDED.road_name,
        gate_type = EXCLUDED.gate_type,
        is_grade_separated = EXCLUDED.is_grade_separated,
        tracks_count = EXCLUDED.tracks_count,
        confidence_score = EXCLUDED.confidence_score,
        last_updated = EXCLUDED.last_updated,
        updated_at = NOW();
    `;
    const values = [
      crossing.id,
      crossing.crossingCode,
      crossing.name,
      crossing.latitude,
      crossing.longitude,
      crossing.railwayLine,
      crossing.roadName,
      crossing.gateType,
      crossing.isGradeSeparated,
      crossing.tracksCount || 2,
      crossing.preClosureBufferSeconds || 360,
      crossing.postClearanceBufferSeconds || 120,
      crossing.averageClosureDurationSeconds || 480,
      crossing.confidenceScore || 0.9,
      dataSourceId,
      crossing.sourceId || crossing.id,
      crossing.lastUpdated || new Date().toISOString()
    ];
    await this.pool.query(query, values);
  }

  private mapRowToRecord(row: any): RailwayCrossingRecord {
    return {
      id: row.id,
      crossingCode: row.crossingCode,
      name: row.name,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      railwayLine: row.railwayLine,
      roadName: row.roadName,
      source: row.sourceName || 'OpenStreetMap Overpass API',
      sourceId: row.sourceId || row.id,
      lastUpdated: new Date(row.lastUpdated).toISOString(),
      gateType: (row.gateType as CrossingGateType) || CrossingGateType.UNKNOWN,
      preClosureBufferSeconds: row.preClosureBufferSeconds || 360,
      postClearanceBufferSeconds: row.postClearanceBufferSeconds || 120,
      averageClosureDurationSeconds: row.averageClosureDurationSeconds || 480,
      isGradeSeparated: Boolean(row.isGradeSeparated),
      tracksCount: row.tracksCount ? Number(row.tracksCount) : 2,
      confidenceScore: row.confidenceScore ? Number(row.confidenceScore) : 0.9,
      provenance: {
        sourceType: DataProvenanceType.THIRD_PARTY_VERIFIED,
        providerName: row.sourceName || 'Railway Crossings Database',
        confidenceScore: row.confidenceScore ? Number(row.confidenceScore) : 0.9,
        isRealtime: false,
        lastSyncedAt: new Date(row.lastUpdated).toISOString(),
        license: row.sourceLicense || 'ODbL'
      }
    };
  }
}
