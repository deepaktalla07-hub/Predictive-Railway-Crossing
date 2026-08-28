-- ==============================================================================
-- RAILWAY GATE ROUTE ASSISTANT - DATABASE SCHEMA (PostgreSQL 16 + PostGIS 3.4)
-- Compatible with Supabase and standard PostgreSQL with PostGIS extension.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Data Provenance Types
CREATE TYPE data_provenance_type AS ENUM (
    'OFFICIAL_RAIL',
    'OPEN_GEO_OSM',
    'THIRD_PARTY_VERIFIED',
    'CALCULATED_ESTIMATE',
    'COMMUNITY_REPORTED',
    'UNKNOWN'
);

CREATE TYPE crossing_gate_type AS ENUM (
    'MANUAL_INTERLOCKED',
    'AUTOMATIC_BARRIER',
    'UNMANNED_OPEN',
    'SPECIAL_GRADE',
    'UNKNOWN'
);

CREATE TYPE gate_operational_status AS ENUM (
    'OPEN',
    'CLOSING',
    'CLOSED',
    'OPENING',
    'UNKNOWN'
);

-- Rail Lines Table
CREATE TABLE IF NOT EXISTS rail_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    geometry GEOMETRY(LineString, 4326) NOT NULL,
    gauge_type VARCHAR(50) DEFAULT 'BROAD_GAUGE',
    electrified BOOLEAN DEFAULT TRUE,
    tracks_count INT DEFAULT 2,
    max_speed_kmh INT DEFAULT 110,
    source_type data_provenance_type NOT NULL DEFAULT 'OPEN_GEO_OSM',
    source_ref VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rail_lines_geom ON rail_lines USING GIST (geometry);

-- Rail Stations Table
CREATE TABLE IF NOT EXISTS rail_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    source_type data_provenance_type NOT NULL DEFAULT 'OFFICIAL_RAIL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rail_stations_loc ON rail_stations USING GIST (location);

-- Railway Crossings Table
CREATE TABLE IF NOT EXISTS railway_crossings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crossing_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255),
    rail_line_id UUID REFERENCES rail_lines(id) ON DELETE SET NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    road_name VARCHAR(255),
    gate_type crossing_gate_type DEFAULT 'MANUAL_INTERLOCKED',
    pre_closure_buffer_sec INT DEFAULT 360,
    post_clearance_buffer_sec INT DEFAULT 120,
    average_closure_duration_sec INT DEFAULT 600,
    is_grade_separated BOOLEAN DEFAULT FALSE,
    osm_id BIGINT,
    source_type data_provenance_type NOT NULL DEFAULT 'OPEN_GEO_OSM',
    confidence_score NUMERIC(3,2) DEFAULT 0.95,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_railway_crossings_loc ON railway_crossings USING GIST (location);

-- Train Schedules Table
CREATE TABLE IF NOT EXISTS train_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_number VARCHAR(50) NOT NULL,
    train_name VARCHAR(255) NOT NULL,
    train_type VARCHAR(50) DEFAULT 'Express',
    runs_on_days INT[] DEFAULT '{1,2,3,4,5,6,7}',
    source_type data_provenance_type NOT NULL DEFAULT 'OFFICIAL_RAIL',
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_train_number ON train_schedules(train_number);

-- Train Schedule Stops Table
CREATE TABLE IF NOT EXISTS train_schedule_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_schedule_id UUID NOT NULL REFERENCES train_schedules(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES rail_stations(id),
    stop_sequence INT NOT NULL,
    scheduled_arrival TIME,
    scheduled_departure TIME,
    distance_from_origin_km NUMERIC(6,2),
    UNIQUE(train_schedule_id, stop_sequence)
);

-- Community Gate Status Reports
CREATE TABLE IF NOT EXISTS community_gate_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crossing_id UUID NOT NULL REFERENCES railway_crossings(id) ON DELETE CASCADE,
    reported_status gate_operational_status NOT NULL,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_trust_score NUMERIC(3,2) DEFAULT 1.0,
    source_ip_hash VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_community_reports_active ON community_gate_reports(crossing_id, expires_at);
