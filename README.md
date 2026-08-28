# Railway Gate Route Assistant 🚂🛣️

> **Intelligent Navigation & Delay-Prevention System for Railway Level Crossing Closures**

The **Railway Gate Route Assistant** is an independently engineered route planning and level-crossing delay avoidance system. It detects upcoming railway level crossings along a driving path, calculates kinematic train arrival predictions and gate closure intervals, assesses delay collision risks, and recommends verified grade-separated (ROB/RUB) or alternative detours.

---

## 🌟 Key Features

- 🗺️ **Road Geometry Railway Crossing Detection**: Uses orthogonal polyline projection rather than straight-line distance to detect intersecting crossings along driving paths.
- 🚆 **Kinematic Train-to-Crossing Prediction**: Calculates train arrival times, gate pre-closure buffers ($360\text{s}$), track occupancy windows ($120\text{s}$), and bounded uncertainty intervals.
- 🚗 **Traffic-Aware User Arrival ETA**: Computes driving arrival times with traffic awareness and bounded uncertainty windows ($\pm \sigma$).
- ⚠️ **Configurable Temporal Risk Engine**: Classifies closure risk (`LOW`, `MODERATE`, `HIGH`, `UNKNOWN`) using qualified non-guaranteed wording.
- 🌉 **Alternative Avoidance Detour Engine**: Verifies geometric clearance ($>75\text{m}$), calculates $\Delta D$ and $\Delta T$, and ranks detours by net time saved vs gate wait.
- 👥 **Crowdsourced Community Gate Telemetry**: Real-time spot reports (`OPEN`, `CLOSING`, `CLOSED`, `OPENED`) with $\le 800\text{m}$ geofencing, duplicate debouncing, and 4-factor consensus scoring.
- 🛡️ **Zero-PII & Defense-in-Depth Security**: Parameterized SQL queries (zero SQL injection), server-side secret isolation, rate limiting (120 req/min global, 5 req/min reports), and zero personal GPS logging.
- 📊 **9-Factor Unified Data Provenance Ledger**: Tracks source integrity across `OFFICIAL`, `REAL-TIME PROVIDER`, `OPEN DATA`, `COMMUNITY`, `CALCULATED`, `ESTIMATED`, and `UNKNOWN`.

---

## 🏗️ Monorepo Architecture

```
/
├── backend/          # Node.js + Express + TypeScript API Server & Prediction Engines
│   ├── src/
│   │   ├── config/       # Environment parsing & Zod bounds validation
│   │   ├── controllers/  # REST controllers (Route, Crossing, Train, Community, System)
│   │   ├── db/           # PostgreSQL connection pool
│   │   ├── middleware/   # Rate limiting, validation, error sanitizer
│   │   ├── models/       # Domain entity models
│   │   ├── providers/    # Extensible routing, rail GIS, & timetable providers
│   │   ├── repositories/ # Abstract & PostgreSQL database repositories
│   │   ├── routes/       # Express v1 router hierarchy
│   │   ├── services/     # Kinematic, risk, rerouting, & crossings services
│   │   └── utils/        # Geospatial & temporal math algorithms
│   └── tests/            # Automated Vitest unit & integration test suites
│
├── frontend/         # React 18 + Vite + TypeScript + Tailwind CSS Cockpit
│   ├── src/
│   │   ├── components/   # Layout headers, sync bars, modals, mobile bottom sheet
│   │   ├── features/     # Instant risk card, map, routes, railway, & prediction modules
│   │   ├── hooks/        # Real-time sync, geolocation, & route analysis hooks
│   │   ├── pages/        # Main dashboard cockpit
│   │   ├── services/     # Typed Axios API client
│   │   ├── store/        # Zustand global state store
│   │   ├── types/        # UI contracts
│   │   └── utils/        # Formatting & custom Leaflet marker renderers
│   └── public/           # Static assets
│
├── shared/           # Shared TypeScript library (@railway-gate/shared)
│   └── src/          # Geo, Provenance, Crossing, Train, Prediction, Risk, Route, System types
│
├── database/         # Database migrations
│   └── migrations/   # 001_init_postgis_schema.sql, 002_create_production_repositories_schema.sql
│
└── docs/             # Comprehensive technical documentation
    ├── ARCHITECTURE.md       # System architecture & hexagonal design
    ├── DATA-SOURCES.md       # Data provenance, licenses, & attribution registry
    ├── ALGORITHM.md          # Kinematic formulas & decision logic derivations
    ├── API.md                # REST API specification & schemas
    ├── SECURITY.md           # Security & Zero-PII privacy architecture
    ├── TESTING.md            # Testing strategy & automated verification report
    ├── DEPLOYMENT.md         # Production deployment & operations guide
    └── FINAL_PROJECT_REPORT.md # Complete final project & audit report
```

---

## 🚀 Quick Start & Reproduction Guide

### Prerequisites
- **Node.js**: v18.0.0 or v20.0.0+
- **npm**: v9.0.0+
- **PostgreSQL**: v14+ (Optional for local dev, required for DB repository mode)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd "Railway Gate Route Assistant"

# Install dependencies across all monorepo workspaces
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
*(All defaults are pre-configured to work out-of-the-box using the built-in development stubs and OpenStreetMap feeds without requiring external API keys).*

### 3. Start Development Servers
```bash
# Starts both Backend (Port 5001) and Frontend (Port 5173) concurrently
npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)** to access the dashboard.

---

## 🧪 Testing & Verification

```bash
# Run all 16 backend unit & integration test suites (83 tests)
npm test

# Run full monorepo typecheck & production build verification
npm run build
```

---

## 📖 Technical Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Data Sources & Provenance](docs/DATA-SOURCES.md)
- [Kinematic & Risk Algorithms](docs/ALGORITHM.md)
- [REST API Specification](docs/API.md)
- [Security & Privacy](docs/SECURITY.md)
- [Testing Strategy](docs/TESTING.md)
- [Production Deployment Guide](docs/DEPLOYMENT.md)
- [Final Project Report](docs/FINAL_PROJECT_REPORT.md)

---

## 📄 License & Attribution

- Application Code: **MIT License**.
- Map & Railway Data: **© OpenStreetMap contributors** available under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).
- Routing Engine: **Project-OSRM** under the BSD 2-Clause License.
- Timetable Data: **data.gov.in / Indian Railways** under Government Open Data License (GODL India).
