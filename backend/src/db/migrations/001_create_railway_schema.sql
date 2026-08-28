-- =========================================================================
-- Railway Gate Route Assistant - PostgreSQL / Supabase Production Schema
-- Migration: 001_create_railway_schema.sql
-- =========================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. Table: data_sources
-- Stores metadata, licensing, and freshness status of all data providers.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_sources (
    id VARCHAR(128) PRIMARY KEY,
    source_code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(64) NOT NULL, -- 'OPEN_DATA', 'GOVERNMENT_OFFICIAL', 'THIRD_PARTY_AGGREGATOR', 'COMMUNITY_CROWDSOURCED'
    attribution TEXT NOT NULL,
    license VARCHAR(128) NOT NULL,
    api_endpoint TEXT,
    freshness_type VARCHAR(64) NOT NULL, -- 'REAL_TIME', 'NEAR_REAL_TIME', 'STATIC_SCHEDULE'
    last_synced_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_sources_code ON data_sources(source_code);
CREATE INDEX IF NOT EXISTS idx_data_sources_active ON data_sources(is_active);

-- -------------------------------------------------------------------------
-- 2. Table: railway_crossings
-- Stores verified geographic coordinates, infrastructure and operational data.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS railway_crossings (
    id VARCHAR(128) PRIMARY KEY,
    crossing_code VARCHAR(64) NOT NULL,
    name VARCHAR(255),
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    railway_line VARCHAR(128),
    road_name VARCHAR(255),
    gate_type VARCHAR(64) NOT NULL DEFAULT 'UNKNOWN',
    is_grade_separated BOOLEAN NOT NULL DEFAULT FALSE,
    tracks_count INTEGER NOT NULL DEFAULT 2,
    pre_closure_buffer_seconds INTEGER NOT NULL DEFAULT 360,
    post_clearance_buffer_seconds INTEGER NOT NULL DEFAULT 120,
    average_closure_duration_seconds INTEGER NOT NULL DEFAULT 480,
    confidence_score DECIMAL(3, 2) NOT NULL DEFAULT 0.90,
    data_source_id VARCHAR(128) REFERENCES data_sources(id) ON DELETE SET NULL,
    source_external_id VARCHAR(128),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_railway_crossings_coords ON railway_crossings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_railway_crossings_code ON railway_crossings(crossing_code);
CREATE INDEX IF NOT EXISTS idx_railway_crossings_line ON railway_crossings(railway_line);
CREATE INDEX IF NOT EXISTS idx_railway_crossings_source ON railway_crossings(data_source_id);

-- -------------------------------------------------------------------------
-- 3. Table: train_snapshots
-- Captures train movement telemetry, delay states, and station progress.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS train_snapshots (
    id VARCHAR(128) PRIMARY KEY,
    train_number VARCHAR(32) NOT NULL,
    train_name VARCHAR(255) NOT NULL,
    current_status VARCHAR(64) NOT NULL, -- 'RUNNING', 'DELAYED', 'ON_TIME', 'STOPPED', 'CANCELLED', 'UNKNOWN'
    delay_minutes INTEGER DEFAULT 0,
    current_latitude DECIMAL(10, 7),
    current_longitude DECIMAL(10, 7),
    speed_kmh DECIMAL(5, 2),
    last_station_passed VARCHAR(128),
    next_station_expected VARCHAR(128),
    is_live BOOLEAN NOT NULL DEFAULT FALSE,
    data_source_id VARCHAR(128) REFERENCES data_sources(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_train_snapshots_number_date ON train_snapshots(train_number, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_train_snapshots_status ON train_snapshots(current_status);

-- -------------------------------------------------------------------------
-- 4. Table: gate_reports
-- Minimal crowdsourced and verified sensor reports (Privacy-preserving, NO PII).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gate_reports (
    id VARCHAR(128) PRIMARY KEY,
    crossing_id VARCHAR(128) NOT NULL REFERENCES railway_crossings(id) ON DELETE CASCADE,
    reported_status VARCHAR(64) NOT NULL, -- 'OPEN', 'CLOSING', 'CLOSED', 'OPENING', 'UNKNOWN'
    source_type VARCHAR(64) NOT NULL DEFAULT 'COMMUNITY_USER',
    confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.80,
    verification_status VARCHAR(64) NOT NULL DEFAULT 'VERIFIED',
    wait_time_minutes INTEGER,
    notes TEXT,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gate_reports_crossing_date ON gate_reports(crossing_id, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_gate_reports_status ON gate_reports(reported_status);

-- -------------------------------------------------------------------------
-- 5. Table: route_analysis
-- Anonymized journey queries with risk summaries (NO personal GPS identity stored).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS route_analysis (
    id VARCHAR(128) PRIMARY KEY,
    origin_lat DECIMAL(10, 7) NOT NULL,
    origin_lng DECIMAL(10, 7) NOT NULL,
    destination_lat DECIMAL(10, 7) NOT NULL,
    destination_lng DECIMAL(10, 7) NOT NULL,
    departure_time TIMESTAMPTZ NOT NULL,
    distance_meters INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    overall_risk_level VARCHAR(64) NOT NULL, -- 'LOW', 'MODERATE', 'HIGH', 'UNKNOWN'
    max_risk_score INTEGER NOT NULL,
    total_crossings_count INTEGER NOT NULL DEFAULT 0,
    conflicting_crossings_count INTEGER NOT NULL DEFAULT 0,
    max_potential_delay_seconds INTEGER NOT NULL DEFAULT 0,
    routing_provider VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_analysis_risk ON route_analysis(overall_risk_level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_analysis_departure ON route_analysis(departure_time);

-- -------------------------------------------------------------------------
-- 6. Table: prediction_results
-- Detailed train-to-user temporal overlap predictions for audit and accuracy tracking.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prediction_results (
    id VARCHAR(128) PRIMARY KEY,
    route_analysis_id VARCHAR(128) REFERENCES route_analysis(id) ON DELETE CASCADE,
    crossing_id VARCHAR(128) NOT NULL REFERENCES railway_crossings(id) ON DELETE CASCADE,
    train_number VARCHAR(32),
    train_predicted_crossing_time TIMESTAMPTZ,
    user_predicted_arrival_time TIMESTAMPTZ NOT NULL,
    time_difference_seconds INTEGER,
    risk_level VARCHAR(64) NOT NULL, -- 'LOW', 'MODERATE', 'HIGH', 'UNKNOWN'
    confidence_score DECIMAL(3, 2) NOT NULL,
    prediction_method VARCHAR(64) NOT NULL,
    uncertainty_plus_minus_seconds INTEGER,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prediction_results_route ON prediction_results(route_analysis_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_crossing ON prediction_results(crossing_id, train_predicted_crossing_time);
CREATE INDEX IF NOT EXISTS idx_prediction_results_risk ON prediction_results(risk_level);

-- -------------------------------------------------------------------------
-- Default Seed Data for data_sources
-- -------------------------------------------------------------------------
INSERT INTO data_sources (id, source_code, name, source_type, attribution, license, api_endpoint, freshness_type, last_synced_at)
VALUES
    ('src-osm-overpass', 'OSM_OVERPASS', 'OpenStreetMap Overpass API', 'OPEN_DATA', 'OpenStreetMap contributors (ODbL 1.0)', 'ODbL 1.0', 'https://overpass-api.de/api/interpreter', 'STATIC_SCHEDULE', NOW()),
    ('src-data-gov-in', 'DATA_GOV_IN', 'Open Government Data Platform India', 'GOVERNMENT_OFFICIAL', 'Ministry of Railways / data.gov.in (GODL)', 'GODL', 'https://data.gov.in', 'STATIC_SCHEDULE', NOW()),
    ('src-rapidapi-irctc', 'RAPIDAPI_IRCTC', 'Indian Railways Live Telemetry Proxy', 'THIRD_PARTY_AGGREGATOR', 'NTES/IRCTC via RapidAPI', 'RapidAPI Developer Terms', 'https://irctc1.p.rapidapi.com', 'NEAR_REAL_TIME', NOW()),
    ('src-community', 'COMMUNITY', 'Crowdsourced Live Gate Reports', 'COMMUNITY_CROWDSOURCED', 'Verified Road User Community Reports', 'Community Contributor Terms', NULL, 'REAL_TIME', NOW())
ON CONFLICT (source_code) DO UPDATE
SET last_synced_at = NOW(), updated_at = NOW();
