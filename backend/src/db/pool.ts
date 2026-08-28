import { Pool, PoolConfig } from 'pg';
import { config } from '../config/env';

let dbPool: Pool | null = null;

export function getDatabasePool(): Pool {
  if (!dbPool) {
    const connectionString = process.env.DATABASE_URL;

    const poolConfig: PoolConfig = {
      connectionString: connectionString || undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000
    };

    // If using Supabase or cloud Postgres, allow SSL configuration
    if (connectionString && (connectionString.includes('supabase.co') || connectionString.includes('sslmode=require'))) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    dbPool = new Pool(poolConfig);

    dbPool.on('error', (err) => {
      console.error('[DatabasePool] Unexpected error on idle client:', err.message);
    });
  }

  return dbPool;
}

export async function checkDatabaseConnection(): Promise<{ isConnected: boolean; message: string }> {
  try {
    const pool = getDatabasePool();
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW() as current_time, current_database() as db_name');
      return {
        isConnected: true,
        message: `Connected to PostgreSQL database '${res.rows[0]?.db_name}' at ${res.rows[0]?.current_time}`
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      isConnected: false,
      message: `Database connection inactive: ${err.message}`
    };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (dbPool) {
    await dbPool.end();
    dbPool = null;
  }
}
