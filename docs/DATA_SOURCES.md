# Railway Level Crossing Geographic Data Sources Evaluation

This document provides a thorough audit and technical evaluation of legitimate geographic data sources for railway level crossings in India.

---

## 1. Primary Source: OpenStreetMap (Overpass API)

### 1.1 Source Identification
- **Provider**: OpenStreetMap Foundation & OpenStreetMap India Community.
- **Access Protocol**: Overpass API (`https://overpass-api.de/api/interpreter`, `https://overpass.kumi.systems/api/interpreter`).
- **Endpoint Types**: REST over HTTP POST / GET with Overpass QL querying.

### 1.2 Information Provided
| OSM Attribute / Tag | Extracted Entity Field | Description / Format |
| :--- | :--- | :--- |
| `id` (Node ID) | `sourceId` / `id` | Unique OSM node integer identifier (e.g. `node/293711133`). |
| `lat`, `lon` | `latitude`, `longitude` | WGS84 decimal degrees (EPSG:4326). |
| `ref` / `crossing:ref` | `crossingCode` / `name` | Official Indian Railways LC Number (e.g. `LC-134`, `LC-88A`). |
| `name` / `description` | `name` | Descriptive name if mapped, or `null` if unmapped. |
| `operator` / `railway:name` | `railwayLine` | Rail zone or corridor (e.g. `South Western Railway`, `SBC-HSRA Line`). `null` if unmapped. |
| `crossing:road_name` / `street` | `roadName` | Intersecting highway or road name. `null` if unmapped. |
| `crossing:barrier` | `gateType` | `full`, `half`, `double_half`, `no` mapped to `AUTOMATIC_BARRIER`, `MANUAL_INTERLOCKED`, or `UNMANNED_OPEN`. |
| `bridge` / `tunnel` / `layer` | `isGradeSeparated` | Boolean flag detecting overpasses (ROB) / underpasses (RUB). |
| `timestamp` | `lastUpdated` | ISO-8601 sync timestamp. |

### 1.3 Licensing & Usage Requirements
- **License**: **Open Database License (ODbL) 1.0**.
- **Attribution Requirement**: Mandatory attribution: *"© OpenStreetMap contributors"* with link to `https://www.openstreetmap.org/copyright`.
- **Fair Use & Rate Limiting**:
  - Overpass public servers require fair-use rate limiting.
  - Repeated queries must be prevented via local caching (TTL $\ge 24\text{ hours}$).
  - Queries must use strict spatial bounding boxes (`bbox`) to minimize server load.

### 1.4 Classification
- **Type**: **Community Open Geospatial Data** (Crowd-verified with GPS surveys and high-resolution satellite imagery).

### 1.5 Documented Limitations
1. **Attribute Completeness**: While coordinates are highly accurate, optional tags like `ref` (LC number) or `crossing:barrier` are occasionally missing on rural nodes (handled by mapping missing fields to `null` or `UNKNOWN`).
2. **Operational Gate State**: OSM contains static infrastructure only. Real-time open/closed barrier states are not present in OSM and are computed via our kinematic timetable engine or crowdsourced telemetry.
3. **Public Server Availability**: Public Overpass instances can experience transient rate-limiting (resolved by multi-mirror fallback and persistent local caching).

---

## 2. Secondary Source: Ministry of Railways / Open Government Data (data.gov.in)

### 2.1 Source Identification
- **Provider**: Ministry of Railways (Government of India) / National Data & Analytics Platform (NDAP).
- **Access Protocol**: Open Government Data Portal (data.gov.in).

### 2.2 Information Provided
- National register of manned and unmanned level crossings by railway division and zone.
- Track chainage markers (Kilometer / Meter point along track).
- Traffic Volume Units (TVU) and interlocking classification (Special, A, B, C, D Class).

### 2.3 Licensing & Usage Requirements
- **License**: **Government Open Data License - India (GODL)**.
- **Attribution**: *"Source: Ministry of Railways, Government of India (data.gov.in)"*.

### 2.4 Classification
- **Type**: **Official Government Data**.

### 2.5 Documented Limitations
- Published tabular registers frequently lack direct WGS84 geographic coordinate points ($lat, lon$), referencing track kilometer markers instead. Coordinates must be geocoded against spatial track polylines.

---

## 3. Strict Data Integrity Principles Applied

1. **No Coordinate Fabrication**: Every coordinate point returned by the provider originates from real surveyed OpenStreetMap GIS nodes.
2. **No Invented Attributes**: If `roadName`, `railwayLine`, or `name` tags are absent from the source node, they are explicitly returned as `null` or `UNKNOWN`.
3. **Multi-Tier Caching**: All spatial bounding-box queries and crossing records are cached in-memory and persistently with timestamped invalidation, completely eliminating redundant external API queries.
