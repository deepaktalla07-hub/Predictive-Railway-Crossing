import { Pool } from 'pg';
import { getDatabasePool } from '../../db/pool';

export interface DataSourceEntity {
  id: string;
  sourceCode: string;
  name: string;
  sourceType: string;
  attribution: string;
  license: string;
  apiEndpoint: string | null;
  freshnessType: string;
  lastSyncedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DataSourceDbRepository {
  constructor(private pool: Pool = getDatabasePool()) {}

  public async getAll(): Promise<DataSourceEntity[]> {
    const query = `
      SELECT id, source_code as "sourceCode", name, source_type as "sourceType",
             attribution, license, api_endpoint as "apiEndpoint",
             freshness_type as "freshnessType", last_synced_at as "lastSyncedAt",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM data_sources
      WHERE is_active = TRUE
      ORDER BY name ASC;
    `;
    const { rows } = await this.pool.query(query);
    return rows;
  }

  public async findByCode(sourceCode: string): Promise<DataSourceEntity | null> {
    const query = `
      SELECT id, source_code as "sourceCode", name, source_type as "sourceType",
             attribution, license, api_endpoint as "apiEndpoint",
             freshness_type as "freshnessType", last_synced_at as "lastSyncedAt",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM data_sources
      WHERE source_code = $1;
    `;
    const { rows } = await this.pool.query(query, [sourceCode]);
    return rows[0] || null;
  }

  public async upsert(source: Partial<DataSourceEntity>): Promise<DataSourceEntity> {
    const query = `
      INSERT INTO data_sources (
        id, source_code, name, source_type, attribution, license, api_endpoint, freshness_type, last_synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (source_code) DO UPDATE SET
        name = EXCLUDED.name,
        attribution = EXCLUDED.attribution,
        license = EXCLUDED.license,
        api_endpoint = EXCLUDED.api_endpoint,
        freshness_type = EXCLUDED.freshness_type,
        last_synced_at = EXCLUDED.last_synced_at,
        updated_at = NOW()
      RETURNING id, source_code as "sourceCode", name, source_type as "sourceType",
                attribution, license, api_endpoint as "apiEndpoint",
                freshness_type as "freshnessType", last_synced_at as "lastSyncedAt",
                is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt";
    `;
    const values = [
      source.id || `src-${Date.now()}`,
      source.sourceCode,
      source.name,
      source.sourceType || 'OPEN_DATA',
      source.attribution || '',
      source.license || 'Open License',
      source.apiEndpoint || null,
      source.freshnessType || 'STATIC_SCHEDULE',
      source.lastSyncedAt || new Date()
    ];
    const { rows } = await this.pool.query(query, values);
    return rows[0];
  }

  public async updateSyncTimestamp(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE data_sources SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1',
      [id]
    );
  }
}
