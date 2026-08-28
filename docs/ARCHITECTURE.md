# System Architecture & Technical Design

The **Railway Gate Route Assistant** is an independently engineered, high-integrity route planning and level-crossing delay avoidance system. It calculates road navigation paths, detects upcoming railway crossings along the driving geometry, performs kinematic predictions of train arrival and gate closure windows, evaluates closure collision risks, and computes verified grade-separated or alternative detour routes.

---

## 1. High-Level Architectural Paradigm

The system follows a **Hexagonal / Clean Architecture (Ports & Adapters)** pattern across a TypeScript monorepo, strictly isolating external third-party data providers from domain prediction and risk calculation engines.

```
+----------------------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER (Frontend)                                  |
|  - React 18 + Vite + TypeScript Cockpit                                                            |
|  - Interactive Map Engine (Leaflet / Google Maps Adapter Interface)                                |
|  - Real-Time Periodic Telemetry Hook (useRealtimeSync) with Dynamic Staleness Counter               |
|  - Split Cockpit Deck: Route Controls, Crossing Cards, Closure Timelines, Alternative Selector     |
|  - Safety & Transparency Modals, Provenance Verification Modals, Community Spot Reporting Modal    |
+----------------------------------------------------------------------------------------------------+
                                                 |
                                     (REST HTTP JSON + Zod)
                                                 v
+----------------------------------------------------------------------------------------------------+
|                                     API & ORCHESTRATION LAYER (Backend)                            |
|  - Express Application with Hardened Security (Helmet, Whitelisted CORS, Error Sanitizer)          |
|  - Rate Limiting Middleware: Global (120 req/min) & Community Report Submissions (5 req/min)       |
|  - Controllers: Routing, Crossings, Trains, Prediction, Community Reports, System Health            |
|  - Multi-Tier In-Memory & Database TTL Caching Subsystem                                           |
+----------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+----------------------------------------------------------------------------------------------------+
|                                  CORE DOMAIN & DECISION ENGINES                                     |
|  - RailwayCrossingDetectionService: Geometric Point-to-Polyline Route Projection                    |
|  - TrainCrossingPredictionEngine: Kinematic Distance/Speed Inter-Station Arrival Interpolation      |
|  - UserArrivalPredictionService: Traffic-Aware Duration + Bounded Uncertainty Windows              |
|  - RailwayCrossingRiskEngine: Temporal Overlap Classification & Qualified Language Generator        |
|  - AlternativeRouteEngine: Orthogonal Clearance (>75m) Verification & Multi-Criteria Ranking        |
|  - CommunityService: Proximity Geofencing (<=800m), Anti-Spam Debouncing & 4-Factor Consensus      |
|  - CrossingIntelligenceEngine: 9-Factor Unified Provenance Synthesis Ledger                         |
+----------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+----------------------------------------------------------------------------------------------------+
|                                      PERSISTENCE & PROVIDER ADAPTERS                               |
|  - PostgreSQL / Supabase Compatible DDL Schema (6 Core Tables, Zero-PII Compliance)                |
|  - Repositories: Crossings, Trains, GateReports, PredictionResults, RouteAnalysis, DataSources     |
|  - Routing Adapters: OSRM Provider / Google Maps Directions / Dev Stub Adapter                      |
|  - GIS Crossing Adapters: OpenStreetMap Overpass Rail GIS / PostGIS / Dev Stub Adapter             |
|  - Train Telemetry Adapters: RapidAPI IRCTC Live Proxy / Static Timetable GTFS / Dev Stub          |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Distinction Between Third-Party Technologies and Original Logic

To maintain strict IP originality and transparent attribution, the following table delineates external technologies from our application's proprietary logic:

| Component / Functionality | Existing Third-Party Technology | Our Application's Integration Layer | Our Application's Proprietary Decision Logic |
| :--- | :--- | :--- | :--- |
| **Road Routing** | OSRM / Google Directions API (computes raw turn-by-turn road polyline coordinates and duration) | `IRoutingProvider` interface with automatic failover, bounding-box caching, and payload normalization | **None** (We delegate road network pathfinding to routing engines) |
| **Railway GIS Data** | OpenStreetMap Overpass API (stores geographic nodes tagged `railway=level_crossing`) | `IRailwayCrossingProvider` with coordinate caching and grade-separation parser | **Spatial corridor buffer filtering** & orthogonal point-to-segment geometric projection |
| **Train Telemetry** | NTES / IRCTC / RapidAPI (provides train schedule timestamps and last station passed) | `ITrainDataProvider` with rate-limit circuit breakers, TTL caching, and credential isolation | **None** (Raw timestamps are strictly attributed to external feeds) |
| **Train-to-Crossing Prediction** | None (Third parties only supply station timetables or raw GPS) | Integration adapter passing schedule and track mileage data | **Inter-station fractional kinematic interpolation** ($d = v \cdot t$), gate pre-closure buffer, closure duration window, and kinematic uncertainty buffer |
| **User Arrival Prediction** | None (Third-party routers only provide total trip duration) | Integration adapter mapping trip start time and cumulative road segments | **Orthogonal projection onto polyline**, proportional speed modeling, and bounded uncertainty window ($\pm \Delta t$) |
| **Closure Risk Evaluation** | None | Unified time delta input pipeline | **Temporal difference overlap calculation** ($\Delta t = \|T_{\text{train}} - T_{\text{user}}\|$), risk threshold classification (`LOW`, `MODERATE`, `HIGH`, `UNKNOWN`), and qualified non-guaranteed prediction language |
| **Alternative Detour Avoidance** | None | Road routing engine querying detour polyline | **Geometric avoidance verification** (confirming orthogonal point-to-polyline distance $> 75\text{m}$), comparative delta metrics ($\Delta D$, $\Delta T$), net time saved vs gate wait, and ranking |
| **Community Gate Consensus** | None | Client GPS submission API | **Proximity geofencing** ($\le 800\text{m}$), 30s duplicate debouncing, and **4-factor consensus confidence algorithm** (recency decay, sample size, proximity weight, agreement ratio) |
| **Unified Intelligence Synthesis** | None | Multi-source aggregator | **9-Factor Unified Provenance Ledger** categorizing data as `OFFICIAL`, `REAL-TIME PROVIDER`, `OPEN DATA`, `COMMUNITY`, `CALCULATED`, `ESTIMATED`, or `UNKNOWN` |

---

## 3. Monorepo Workspace Structure

- [`shared/`](file:///Users/deepaktalla/Documents/Railway%20Gate%20Route%20Assistant/shared): Pure TypeScript interfaces, DTO schemas, domain constants, and safety notices shared across backend and frontend. Zero external runtime dependencies.
- [`backend/`](file:///Users/deepaktalla/Documents/Railway%20Gate%20Route%20Assistant/backend): Express TypeScript REST server, PostgreSQL repository layer, and domain prediction engines.
- [`frontend/`](file:///Users/deepaktalla/Documents/Railway%20Gate%20Route%20Assistant/frontend): React 18, Vite, Tailwind CSS, Leaflet/Google Maps dual-adapter mapping, and responsive split-cockpit layout.
- [`docs/`](file:///Users/deepaktalla/Documents/Railway%20Gate%20Route%20Assistant/docs): Full architectural, algorithmic, security, API, data source, and testing documentation.
