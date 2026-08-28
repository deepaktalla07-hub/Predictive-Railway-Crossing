import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { getDatabasePool } from './pool';

export class DatabaseMigrator {
  constructor(private pool: Pool = getDatabasePool()) {}

  /**
   * Executes all pending SQL migration files in order.
   */
  public async runMigrations(): Promise<{ appliedCount: number; appliedFiles: string[] }> {
    const client = await this.pool.connect();
    const appliedFiles: string[] = [];

    try {
      // 1. Ensure migrations tracking table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(128) PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // 2. Read already applied migrations
      const { rows } = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
      const appliedSet = new Set(rows.map((r) => r.version));

      // 3. Read migration files from migrations directory
      const migrationsDir = path.join(__dirname, 'migrations');
      if (!fs.existsSync(migrationsDir)) {
        console.warn(`[DatabaseMigrator] Migrations directory not found at ${migrationsDir}`);
        return { appliedCount: 0, appliedFiles: [] };
      }

      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        if (!appliedSet.has(file)) {
          console.log(`[DatabaseMigrator] Applying migration: ${file}...`);
          const sqlPath = path.join(migrationsDir, file);
          const sql = fs.readFileSync(sqlPath, 'utf8');

          await client.query('BEGIN');
          try {
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
            await client.query('COMMIT');
            appliedFiles.push(file);
            console.log(`[DatabaseMigrator] Successfully applied: ${file}`);
          } catch (err: any) {
            await client.query('ROLLBACK');
            console.error(`[DatabaseMigrator] Failed to apply ${file}:`, err.message);
            throw err;
          }
        }
      }

      return {
        appliedCount: appliedFiles.length,
        appliedFiles
      };
    } finally {
      client.release();
    }
  }
}
