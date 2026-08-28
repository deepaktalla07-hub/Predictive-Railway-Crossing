# Production Deployment & Operations Guide

This guide provides step-by-step instructions for deploying, configuring, and verifying the **Railway Gate Route Assistant** in a production environment.

---

## Table of Contents
1. [Database Setup (PostgreSQL / Supabase)](#1-database-setup-postgresql--supabase)
2. [Environment Variables Reference](#2-environment-variables-reference)
3. [Google Maps Platform Setup](#3-google-maps-platform-setup)
4. [Railway Data Provider Setup (OpenStreetMap Overpass)](#4-railway-data-provider-setup-openstreetmap-overpass)
5. [Train Data Provider Setup (RapidAPI / NTES)](#5-train-data-provider-setup-rapidapi--ntes)
6. [Backend Deployment (Node.js / Docker / PM2)](#6-backend-deployment-nodejs--docker--pm2)
7. [Frontend Deployment (Static SPA / CDN)](#7-frontend-deployment-static-spa--cdn)
8. [Domain & SSL/TLS Configuration](#8-domain--ssltls-configuration)
9. [CORS & Security Configuration](#9-cors--security-configuration)
10. [Production Health Checks & Smoke Testing](#10-production-health-checks--smoke-testing)

---

## 1. Database Setup (PostgreSQL / Supabase)

### Prerequisites
- **PostgreSQL 14+** or **Supabase** instance.
- Required Extensions: `uuid-ossp` and optional `postgis`.

### Running Migrations
Connect to your production PostgreSQL database and execute the migrations in order:

```bash
# Set your production database connection string
export DATABASE_URL="postgresql://db_user:db_password@your-db-host:5432/railroute_prod"

# Execute PostGIS schema migration (001)
psql $DATABASE_URL -f database/migrations/001_init_postgis_schema.sql

# Execute Production Repositories & Data Sources schema (002)
psql $DATABASE_URL -f database/migrations/002_create_production_repositories_schema.sql
```

### Verified Schema Tables
1. `data_sources`: Provenance registry, licenses, attributions, rate limits.
2. `railway_crossings`: Physical level-crossing coordinates, codes, gate types, tracks count.
3. `train_snapshots`: Live train telemetry, status, delays, and last station passed.
4. `gate_reports`: Crowdsourced user spot reports (geofenced $\le 800\text{m}$, zero-PII).
5. `route_analysis`: Analyzed route query cache with TTL expiration.
6. `prediction_results`: Kinematic arrival prediction records.

---

## 2. Environment Variables Reference

### Backend (`.env` on server)
```bash
# Server Environment
NODE_ENV=production
PORT=5001
CORS_ORIGIN=https://railroute.example.com
LOG_LEVEL=info

# Active Data Providers
ROUTING_PROVIDER=OSRM
RAILWAY_CROSSING_PROVIDER=OSM_OVERPASS
TRAIN_SCHEDULE_PROVIDER=RAPIDAPI_LIVE

# External Provider Endpoints
OSRM_BASE_URL=https://router.project-osrm.org
OSM_OVERPASS_URL=https://overpass.kumi.systems/api/interpreter

# Third-Party API Credentials (Backend ONLY)
RAPIDAPI_KEY=your_production_rapidapi_key
RAPIDAPI_TRAIN_HOST=irctc1.p.rapidapi.com
GOOGLE_MAPS_API_KEY=your_server_side_google_key # Optional

# Persistence
DATABASE_URL=postgresql://db_user:db_password@your-db-host:5432/railroute_prod
REDIS_URL=redis://your-redis-host:6379 # Optional
```

### Frontend (`frontend/.env.production` at build time)
```bash
# API Base Endpoint
VITE_API_BASE_URL=https://api.railroute.example.com/api/v1
VITE_ENABLE_COMMUNITY_REPORTING=true

# Google Maps Platform (Optional)
# Leave empty to use OpenStreetMap + Leaflet
VITE_GOOGLE_MAPS_API_KEY=your_restricted_frontend_browser_key
```

---

## 3. Google Maps Platform Setup

If enabling Google Maps for the frontend interactive map and Places Autocomplete:

1. **Create Google Cloud Project**: Navigate to [Google Cloud Console](https://console.cloud.google.com).
2. **Enable APIs**:
   - **Maps JavaScript API**
   - **Places API (New)**
   - **Directions API**
3. **Create API Credentials**:
   - Under **Credentials**, create an API key.
4. **Set Application Restrictions**:
   - Select **Website restrictions (HTTP referrers)**.
   - Add your production domain: `https://railroute.example.com/*` and `https://*.railroute.example.com/*`.
5. **Set API Restrictions**:
   - Restrict key to only Maps JavaScript API and Places API.
6. **Graceful Fallback**: If `VITE_GOOGLE_MAPS_API_KEY` is not provided, the application seamlessly defaults to **OpenStreetMap** with Leaflet tiles.

---

## 4. Railway Data Provider Setup (OpenStreetMap Overpass)

1. **Provider**: `OverpassCrossingProvider` connects to OpenStreetMap Overpass API nodes tagged `railway=level_crossing`.
2. **Configuration**: Set `OSM_OVERPASS_URL=https://overpass.kumi.systems/api/interpreter` (or your private Overpass instance).
3. **Rate Limits & Caching**:
   - In-memory bounding box queries cache results for 24 hours.
   - Database repository stores verified crossings locally to minimize external queries.

---

## 5. Train Data Provider Setup (RapidAPI / NTES)

1. **Provider Subscription**:
   - Subscribe to the IRCTC Live Train Status API on [RapidAPI](https://rapidapi.com).
2. **Configuration**:
   - Set `TRAIN_SCHEDULE_PROVIDER=RAPIDAPI_LIVE`.
   - Set `RAPIDAPI_KEY=your_key` in the server environment.
3. **Telemetry Caching & Outage Fallback**:
   - Real-time telemetry is cached for 60 seconds in `TrainDataCache.ts`.
   - If RapidAPI times out or fails, the engine automatically falls back to `LocalBaselineTrainDataProvider` and labels the prediction as `CALCULATED_ESTIMATE`.

---

## 6. Backend Deployment (Node.js / Docker / PM2)

### Option A: Direct Node.js / PM2 Process Manager
```bash
# 1. Clone repository
git clone https://github.com/your-org/railway-gate-route-assistant.git
cd railway-gate-route-assistant

# 2. Install production dependencies & build
npm ci
npm run build

# 3. Start with PM2
cd backend
pm2 start dist/index.js --name "railway-api" -i max --env production
pm2 save
pm2 startup
```

### Option B: Docker Container
```dockerfile
# Build Backend Image
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY backend ./backend
RUN npm ci
RUN npm --prefix shared run build && npm --prefix backend run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./
ENV NODE_ENV=production
EXPOSE 5001
CMD ["node", "dist/index.js"]
```

---

## 7. Frontend Deployment (Static SPA / CDN)

The frontend is a static Single Page Application (SPA).

```bash
# Build production bundle
npm --prefix shared run build
npm --prefix frontend run build

# Production assets generated in: frontend/dist/
```

### NGINX Static Host Configuration (`/etc/nginx/sites-available/railroute.conf`)
```nginx
server {
    listen 80;
    server_name railroute.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name railroute.example.com;

    ssl_certificate /etc/letsencrypt/live/railroute.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/railroute.example.com/privkey.pem;

    root /var/www/railroute/frontend/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy to Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8. Domain & SSL/TLS Configuration

1. **DNS Records**:
   - `A` record: `railroute.example.com` $\to$ Server Public IP.
   - `CNAME` record: `api.railroute.example.com` $\to$ Backend Host IP.
2. **Certbot SSL/TLS**:
   ```bash
   sudo certbot --nginx -d railroute.example.com -d api.railroute.example.com
   ```

---

## 9. CORS & Security Configuration

1. **CORS Whitelisting**:
   Set `CORS_ORIGIN=https://railroute.example.com` in backend `.env`. Multiple origins can be comma-separated.
2. **Security Headers Enforced via Helmet**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `X-Powered-By`: Disabled
3. **Rate Limiting**:
   - Global API: 120 req/min.
   - Community Gate Reports: 5 req/min per client IP.

---

## 10. Production Health Checks & Smoke Testing

After deploying, run the following automated smoke tests:

### 1. System Health & Safety Endpoint Verification
```bash
curl -i https://api.railroute.example.com/api/v1/system/health
```
**Expected Response**: `200 OK` with `status: "HEALTHY"` and `safetyMandate` payload.

### 2. Route Analysis Smoke Test
```bash
curl -i -X POST https://api.railroute.example.com/api/v1/routes/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "origin": { "lat": 12.9177, "lng": 77.6238 },
    "destination": { "lat": 12.7409, "lng": 77.8253 },
    "avoidHighRiskGates": true
  }'
```
**Expected Response**: `200 OK` returning `primaryRoute`, `crossings`, and `alternativeRoutes`.

### 3. Safety Mandate Endpoint
```bash
curl -i https://api.railroute.example.com/api/v1/system/safety
```
**Expected Response**: `200 OK` returning non-authoritative disclaimers and driver safety checklists.
