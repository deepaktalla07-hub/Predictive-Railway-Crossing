# External Data Sources, Licenses & Attribution Registry

This document defines the complete data provenance, licensing compliance, attribution requirements, and operational limitations for all external data sources integrated into or evaluated for the **Railway Gate Route Assistant**.

---

## 1. Data Provenance & Category Matrix

Every piece of data ingested into the system is tagged with an explicit provenance category. **The application strictly enforces that unreliable or calculated estimates are never merged with or represented as authoritative official data.**

| Category | Definition | Allowed Sources |
| :--- | :--- | :--- |
| **`OFFICIAL`** | Authoritative schedule or announcement published directly by government railway authorities | Indian Railways Timetable, data.gov.in (GODL) |
| **`REAL-TIME PROVIDER`** | Verified third-party real-time telemetry stream or GPS proxy | RapidAPI IRCTC / NTES Telemetry Gateway |
| **`OPEN DATA`** | Community-maintained open geospatial datasets | OpenStreetMap Overpass API (ODbL 1.0) |
| **`COMMUNITY`** | Geofenced crowdsourced observations submitted by nearby road users | Community Gate Reports Subsystem ($\le 800\text{m}$) |
| **`CALCULATED`** | Derived mathematically by our kinematic interpolation engines | Kinematic Prediction Engine ($d = v \cdot t$) |
| **`ESTIMATED`** | Derived from traffic-aware routing models and speed profiles | Driving Route Providers + Uncertainty Buffers |
| **`UNKNOWN`** | Telemetry missing, unverified, or expired | Missing schedule / telemetry fallback |

---

## 2. External Data Source Registry

### 1. OpenStreetMap Overpass API (Railway GIS Infrastructure)
- **Source**: OpenStreetMap Foundation / Overpass API
- **Endpoint**: `https://overpass.kumi.systems/api/interpreter`
- **Data Provided**: Railway level crossing nodes (`railway=level_crossing`), road intersection coordinates, crossing codes, gate types, tracks count, and grade-separated bridges (`bridge=yes`, `layer=1`).
- **License**: **Open Database License (ODbL) 1.0**
- **Attribution Requirement**: *"© OpenStreetMap contributors. Data available under the Open Database License."* Displayed in application footer and map attribution corner.
- **Rate Limits & Caching**: Max 2 requests/second. Queries are cached in-memory and in PostgreSQL for 24 hours per bounding box corridor.
- **Limitations**: Community-edited open data. Crossing codes or physical gate types may occasionally be incomplete in rural areas; fallback is mapped to `CrossingGateType.UNKNOWN` with reduced confidence ($0.35$).

---

### 2. Open Source Routing Machine (OSRM) / Driving Routing Engine
- **Source**: Project-OSRM (hosted instance / self-hosted)
- **Endpoint**: `https://router.project-osrm.org`
- **Data Provided**: Driving turn-by-turn routes, polyline GeoJSON geometry, total distance in meters, and estimated duration in seconds.
- **License**: **BSD 2-Clause License** (OSRM software) / **ODbL** (underlying road network map data).
- **Attribution Requirement**: *"Routing powered by Project-OSRM using OpenStreetMap data."*
- **Rate Limits & Caching**: Public demo server allows reasonable non-commercial usage. Backend implements $20\text{s}$ TTL memory caching to prevent redundant requests.
- **Limitations**: Public demo server does not reflect live traffic congestion in real-time. The system attaches an uncertainty window buffer ($\pm 15\%$) when live traffic is unavailable.

---

### 3. RapidAPI IRCTC / NTES Train Telemetry Proxy
- **Source**: RapidAPI Marketplace (IRCTC Live Train API / NTES Proxy)
- **Endpoint**: `https://irctc1.p.rapidapi.com`
- **Data Provided**: Real-time train running status, current delay in minutes, last passed station code, next expected station, and estimated station arrival timestamps.
- **License / Terms**: **RapidAPI Developer Terms of Service & Third-Party Commercial Subscription**
- **Attribution Requirement**: *"Train running data provided via RapidAPI IRCTC Telemetry Proxy."*
- **Rate Limits & Caching**: Tier-based quota (e.g. 500 requests/day). Caching enforced with 60-second TTL in `TrainDataCache.ts`.
- **Security & Privacy**: RapidAPI key is stored strictly on the backend in environment variables. Keys are never transmitted to frontend clients or logged.
- **Limitations**: Third-party wrapper around NTES/IRCTC. Subject to upstream availability and network latency ($200\text{ms} \dots 800\text{ms}$). If upstream times out, the system gracefully falls back to static timetable estimates labeled as `CALCULATED`.

---

### 4. Indian Railways Static Timetables & Open Government Data
- **Source**: data.gov.in / CRIS / Indian Railways Timetables
- **Data Provided**: Baseline schedule stop sequences, arrival/departure times, station distances, and operating days.
- **License**: **Government Open Data License - India (GODL)**
- **Attribution Requirement**: *"Data Source: data.gov.in / Indian Railways Timetables (GODL)."*
- **Freshness**: Static seasonal schedule releases.
- **Limitations**: Does not include unscheduled delays, emergency stops, or freight train movements. Kinematic engine uses static schedules as the baseline prior to live telemetry adjustments.

---

### 5. Community Crowdsourced Level-Crossing Reports
- **Source**: Road users within the application network.
- **Data Provided**: Spot operational status (`OPEN`, `CLOSING`, `CLOSED`, `OPENED`), report timestamp, approximate location.
- **License / Terms**: **User Generated Content (Internal Application Agreement)**
- **Attribution Requirement**: Clearly and prominently labeled as **`COMMUNITY REPORTED`**.
- **Abuse Protections**:
  - Proximity Geofencing ($\le 800\text{m}$ from target crossing).
  - Anti-Spam Duplicate Debouncing ($30\text{s}$ per client).
  - 4-factor confidence algorithm ($e^{-\Delta t / 900}$ time decay).
- **Limitations**: Spot reports reflect human observation and may have a latency of several seconds to minutes. Always subordinate to physical signals and official railway instructions.

---

## 3. Strict Integrity Policy: No Fake or Fabricated Data

1. **No Fake GPS Coordinates**: When live train coordinates are unavailable, the system reports last known station coordinates or declares `UNKNOWN`. It **never** fabricates intermediate GPS points.
2. **Explicit Uncertainty Disclaimers**: Timings derived from kinematic calculation are explicitly flagged as `CALCULATED` or `ESTIMATED`, never as `OFFICIAL`.
3. **Graceful Degradation**: If an external provider experiences an outage, the system degrades gracefully with clear state views (`InsufficientDataStateView`), rather than masking errors with simulated data.
