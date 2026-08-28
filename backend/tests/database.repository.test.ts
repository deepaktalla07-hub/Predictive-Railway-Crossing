import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  CrossingGateType,
  DataProvenanceType,
  GateOperationalStatus,
  RailwayCrossingRecord,
  RiskLevel
} from '@railway-gate/shared';

describe('Production Database Layer & Repositories Suite', () => {
  const migrationSqlPath = path.join(
    __dirname,
    '../src/db/migrations/001_create_railway_schema.sql'
  );

  it('1. should contain all 6 required production tables in migration SQL', () => {
    expect(fs.existsSync(migrationSqlPath)).toBe(true);
    const sql = fs.readFileSync(migrationSqlPath, 'utf8');

    // Verify all 6 required tables
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS data_sources');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS railway_crossings');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS train_snapshots');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS gate_reports');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS route_analysis');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS prediction_results');
  });

  it('2. should include primary keys, foreign keys, timestamps, and indexes in migration SQL', () => {
    const sql = fs.readFileSync(migrationSqlPath, 'utf8');

    // Primary Keys
    expect(sql).toContain('id VARCHAR(128) PRIMARY KEY');
    // Foreign Keys
    expect(sql).toContain('REFERENCES data_sources(id)');
    expect(sql).toContain('REFERENCES railway_crossings(id)');
    expect(sql).toContain('REFERENCES route_analysis(id)');
    // Timestamps
    expect(sql).toContain('created_at TIMESTAMPTZ');
    expect(sql).toContain('updated_at TIMESTAMPTZ');
    expect(sql).toContain('last_synced_at TIMESTAMPTZ');
    // Indexes
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_railway_crossings_coords');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_train_snapshots_number_date');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_prediction_results_crossing');
  });

  it('3. should seed default authentic data sources in migration SQL', () => {
    const sql = fs.readFileSync(migrationSqlPath, 'utf8');

    expect(sql).toContain('OSM_OVERPASS');
    expect(sql).toContain('DATA_GOV_IN');
    expect(sql).toContain('RAPIDAPI_IRCTC');
    expect(sql).toContain('COMMUNITY');
    expect(sql).toContain('ODbL 1.0');
    expect(sql).toContain('GODL');
  });

  it('4. should enforce privacy protection by storing zero personal GPS identity traces', () => {
    const sql = fs.readFileSync(migrationSqlPath, 'utf8');

    // Verify no user tracking or identity columns in route_analysis or gate_reports
    expect(sql).not.toContain('user_phone');
    expect(sql).not.toContain('user_email');
    expect(sql).not.toContain('device_imei');
    expect(sql).not.toContain('live_gps_trace');
  });
});
