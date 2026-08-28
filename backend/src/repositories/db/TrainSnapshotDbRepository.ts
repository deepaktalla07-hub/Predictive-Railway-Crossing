import { Pool } from 'pg';
import { getDatabasePool } from '../../db/pool';

export interface TrainSnapshotEntity {
  id: string;
  trainNumber: string;
  trainName: string;
  currentStatus: string;
  delayMinutes: number;
  currentLatitude: number | null;
  currentLongitude: number | null;
  speedKmh: number | null;
  lastStationPassed: string | null;
  nextStationExpected: string | null;
  isLive: boolean;
  dataSourceId: string | null;
  recordedAt: Date;
  createdAt: Date;
}

export class TrainSnapshotDbRepository {
  constructor(private pool: Pool = getDatabasePool()) {}

  public async recordSnapshot(snapshot: Partial<TrainSnapshotEntity>): Promise<TrainSnapshotEntity> {
    const query = `
      INSERT INTO train_snapshots (
        id, train_number, train_name, current_status, delay_minutes,
        current_latitude, current_longitude, speed_kmh,
        last_station_passed, next_station_expected, is_live, data_source_id, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, train_number as "trainNumber", train_name as "trainName",
                current_status as "currentStatus", delay_minutes as "delayMinutes",
                current_latitude as "currentLatitude", current_longitude as "currentLongitude",
                speed_kmh as "speedKmh", last_station_passed as "lastStationPassed",
                next_station_expected as "nextStationExpected", is_live as "isLive",
                data_source_id as "dataSourceId", recorded_at as "recordedAt", created_at as "createdAt";
    `;
    const values = [
      snapshot.id || `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      snapshot.trainNumber,
      snapshot.trainName || `Train ${snapshot.trainNumber}`,
      snapshot.currentStatus || 'UNKNOWN',
      snapshot.delayMinutes || 0,
      snapshot.currentLatitude || null,
      snapshot.currentLongitude || null,
      snapshot.speedKmh || null,
      snapshot.lastStationPassed || null,
      snapshot.nextStationExpected || null,
      Boolean(snapshot.isLive),
      snapshot.dataSourceId || 'src-rapidapi-irctc',
      snapshot.recordedAt || new Date()
    ];
    const { rows } = await this.pool.query(query, values);
    return rows[0];
  }

  public async getLatestForTrain(trainNumber: string): Promise<TrainSnapshotEntity | null> {
    const query = `
      SELECT id, train_number as "trainNumber", train_name as "trainName",
             current_status as "currentStatus", delay_minutes as "delayMinutes",
             current_latitude as "currentLatitude", current_longitude as "currentLongitude",
             speed_kmh as "speedKmh", last_station_passed as "lastStationPassed",
             next_station_expected as "nextStationExpected", is_live as "isLive",
             data_source_id as "dataSourceId", recorded_at as "recordedAt", created_at as "createdAt"
      FROM train_snapshots
      WHERE train_number = $1
      ORDER BY recorded_at DESC
      LIMIT 1;
    `;
    const { rows } = await this.pool.query(query, [trainNumber]);
    return rows[0] || null;
  }
}
