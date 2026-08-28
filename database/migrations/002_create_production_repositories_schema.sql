-- ==============================================================================
-- RAILWAY GATE ROUTE ASSISTANT - PRODUCTION REPOSITORIES SCHEMA
-- PostgreSQL 14+ / Supabase Compatible DDL Migration
-- Zero-PII Compliance & Complete Data Provenance Ledger
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Data Sources Table (Provenance, Licenses, Attributions & Limits)
CREATE TABLE IF NOT EXISTS data_sources (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g. 'OFFICIAL_RAIL', 'OPEN_GEO_OSM', 'THIRD_PARTY_VERIFIED', 'COMMUNITY'
    license VARCHAR(255) NOT NULL, -- e.g. 'ODbL 1.0', 'BSD 2-Clause', 'GODL'
    attribution TEXT NOT NULL,
    homepage_url VARCHAR(500),
    is_realtime BOOLEAN DEFAULT FALSE,
    refresh_interval_seconds INT DEFAULT 86400,
    rate_limit_per_minute INT DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Known Data Sources
INSERT INTO data_sources (id, name, type, license, attribution, homepage_url, is_realtime, refresh_interval_seconds, rate_limit_per_minute)
VALUES
('osm-overpass', 'OpenStreetMap Overpass API', 'OPEN_GEO_OSM', 'ODbL 1.0', '© OpenStreetMap contributors. Data available under the Open Database License.', 'https://overpass-api.de', FALSE, 86400, 120),
('project-osrm', 'Project OSRM Driving Router', 'OPEN_GEO_OSM', 'BSD 2-Clause', 'Routing powered by Project-OSRM using OpenStreetMap data.', 'https://project-osrm.org', FALSE, 3600, 300),
('rapidapi-irctc', 'RapidAPI IRCTC Live Proxy', 'THIRD_PARTY_VERIFIED', 'RapidAPI Commercial Terms', 'Train running data provided via RapidAPI IRCTC Telemetry Proxy.', 'https://rapidapi.com', TRUE, 60, 60),
('indian-railways-godl', 'Indian Railways Open Timetables', 'OFFICIAL_RAIL', 'GODL India', 'Data Source: data.gov.in / Indian Railways Timetables (GODL).', 'https://data.gov.in', FALSE, 604800, 60),
('community-reports', 'Community Crowdsourced Reports', 'COMMUNITY', 'User Generated Content', 'COMMUNITY REPORTED status based on verified nearby user observations.', 'https://github.com/railway-gate/assistant', TRUE, 15, 60)
ON CONFLICT (id) DO UPDATE SET
    attribution = EXCLUDED.attribution,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Railway Crossings Table
CREATE TABLE IF NOT EXISTS railway_crossings (
    id VARCHAR(100) PRIMARY KEY,
    crossing_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    railway_line VARCHAR(255) NOT NULL,
    road_name VARCHAR(255),
    gate_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL_INTERLOCKED',
    pre_closure_buffer_seconds INT DEFAULT 360,
    post_clearance_buffer_seconds INT DEFAULT 120,
    average_closure_duration_seconds INT DEFAULT 480,
    is_grade_separated BOOLEAN DEFAULT FALSE,
    tracks_count INT DEFAULT 2,
    confidence_score DOUBLE PRECISION DEFAULT 0.95,
    source_external_id VARCHAR(255),
    data_source_id VARCHAR(100) REFERENCES data_sources(id) ON DELETE SET NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_railway_crossings_lat_lng ON railway_crossings (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_railway_crossings_code ON railway_crossings (crossing_code);

-- 3. Live Train Snapshots Table
CREATE TABLE IF NOT EXISTS train_snapshots (
    id VARCHAR(100) PRIMARY KEY,
    train_number VARCHAR(50) NOT NULL,
    train_name VARCHAR(255) NOT NULL,
    current_status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
    delay_minutes INT DEFAULT 0,
    last_station_passed VARCHAR(100),
    next_station_expected VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed_kmh DOUBLE PRECISION,
    is_live BOOLEAN DEFAULT FALSE,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_source_id VARCHAR(100) REFERENCES data_sources(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_train_snapshots_number ON train_snapshots (train_number);
CREATE INDEX IF NOT EXISTS idx_train_snapshots_captured ON train_snapshots (captured_at DESC);

-- 4. Gate Operational Status Reports (Community Crowdsourced, Zero-PII)
CREATE TABLE IF NOT EXISTS gate_reports (
    id VARCHAR(100) PRIMARY KEY,
    crossing_id VARCHAR(100) NOT NULL REFERENCES railway_crossings(id) ON DELETE CASCADE,
    reported_status VARCHAR(50) NOT NULL, -- 'OPEN', 'CLOSING', 'CLOSED', 'OPENED'
    approximate_lat DOUBLE PRECISION NOT NULL,
    approximate_lng DOUBLE PRECISION NOT NULL,
    distance_to_crossing_meters DOUBLE PRECISION NOT NULL,
    confidence_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_hash VARCHAR(64) -- Salted SHA-256 hash for anti-spam debouncing only, NO raw IP stored
);
CREATE INDEX IF NOT EXISTS idx_gate_reports_crossing_expires ON gate_reports (crossing_id, expires_at);

-- 5. Route Analysis Results Cache Table
CREATE TABLE IF NOT EXISTS route_analysis (
    id VARCHAR(100) PRIMARY KEY,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    primary_distance_meters INT NOT NULL,
    primary_duration_seconds INT NOT NULL,
    overall_risk_level VARCHAR(50) NOT NULL,
    conflicting_crossings_count INT DEFAULT 0,
    has_recommended_alternative BOOLEAN DEFAULT FALSE,
    response_payload JSONB NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_route_analysis_lookup ON route_analysis (origin_lat, origin_lng, destination_lat, destination_lng);
CREATE INDEX IF NOT EXISTS idx_route_analysis_expires ON route_analysis (expires_at);

-- 6. Prediction Results Record Table
CREATE TABLE IF NOT EXISTS prediction_results (
    id VARCHAR(100) PRIMARY KEY,
    crossing_id VARCHAR(100) NOT NULL REFERENCES railway_crossings(id) ON DELETE CASCADE,
    train_number VARCHAR(50) NOT NULL,
    predicted_crossing_time TIMESTAMP WITH TIME ZONE,
    close_start_time TIMESTAMP WITH TIME ZONE,
    reopen_time TIMESTAMP WITH TIME ZONE,
    confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    method VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prediction_crossing_time ON prediction_results (crossing_id, predicted_crossing_time);
