# REST API Specification (Version 1.0.0)

The **Railway Gate Route Assistant API** provides programmatic access to route risk analysis, railway crossing GIS data, train telemetry predictions, community reporting, and data provenance verification.

**Base URL**: `http://localhost:5001/api/v1`

---

## 1. Route Analysis Endpoints

### `POST /routes/analyze`
Analyzes a driving journey between origin and destination, identifies intersecting railway crossings, computes kinematic closure predictions, and evaluates alternative detours.

#### Request Body
```json
{
  "origin": { "lat": 12.9177, "lng": 77.6238 },
  "destination": { "lat": 12.7409, "lng": 77.8253 },
  "departureTime": "2026-08-19T08:30:00.000Z",
  "avoidHighRiskGates": true,
  "crossingBufferMeters": 80
}
```

#### Success Response (`200 OK`)
```json
{
  "status": "SUCCESS",
  "requestId": "req_m89_a7x9",
  "analyzedAt": "2026-08-19T08:30:00.000Z",
  "dataAgeSeconds": 0,
  "cached": false,
  "isStale": false,
  "primaryRoute": {
    "id": "primary-route",
    "summary": "Hosur Main Road via Electronic City",
    "distanceMeters": 28400,
    "durationSeconds": 2450,
    "riskSummary": {
      "overallRiskLevel": "HIGH",
      "maxRiskScore": 85,
      "totalCrossingsCount": 1,
      "conflictingCrossingsCount": 1,
      "maxPotentialDelaySeconds": 600,
      "summaryRecommendation": "High probability of railway gate delay. Alternative route recommended."
    },
    "crossings": [
      {
        "crossingId": "dev-lc-88a",
        "crossingCode": "LC-88A",
        "name": "Hosur Road Level Crossing LC-88A",
        "location": { "lat": 12.8523, "lng": 77.6612 },
        "gateType": "MANUAL_INTERLOCKED",
        "riskEvaluation": {
          "riskLevel": "HIGH",
          "riskScore": 85,
          "recommendation": "AVOID_CROSSING",
          "summary": "High risk of encountering a closed railway crossing."
        }
      }
    ]
  },
  "alternativeRoutes": [
    {
      "id": "alt-rob-detour",
      "name": "Electronic City Elevated Highway (ROB)",
      "strategyType": "GRADE_SEPARATED_ROB_RUB",
      "distanceMeters": 30100,
      "durationSeconds": 2690,
      "formattedDistance": "30.1 km",
      "formattedDuration": "45 min",
      "formattedAdditionalDistance": "+1.7 km",
      "formattedAdditionalDuration": "+4 min",
      "avoidsAffectedCrossing": true,
      "isRecommended": true
    }
  ]
}
```

---

## 2. Railway Level Crossing Endpoints

### `GET /crossings`
Queries railway crossings within a bounding box or with pagination.
- Query Parameters: `minLat`, `maxLat`, `minLng`, `maxLng`, `limit`, `offset`.

### `GET /crossings/:id`
Returns physical metadata, tracks count, gate type, and grade-separation status for a specific crossing.

### `GET /crossings/:id/status`
Returns real-time operational status, community consensus, and active train closure windows.

---

## 3. Community Gate Reports Endpoints

### `POST /community/reports`
Submits a crowdsourced spot status report for a railway crossing.

#### Rate Limit
Strictly enforced at **5 requests / minute per client IP**.

#### Request Body
```json
{
  "crossingId": "dev-lc-88a",
  "status": "CLOSED",
  "userLocation": { "lat": 12.8525, "lng": 77.6614 },
  "notes": "Gate lowered for approaching freight train",
  "waitTimeMinutes": 10
}
```

#### Success Response (`200 OK`)
```json
{
  "status": "SUCCESS",
  "reportId": "rep_1755581290_x7b2",
  "appliedStatus": "CLOSED",
  "label": "COMMUNITY REPORTED",
  "disclaimer": "COMMUNITY REPORTED status based on nearby user observations. Always follow physical signals."
}
```

---

## 4. Train Telemetry & Prediction Endpoints

### `GET /trains/:trainNumber/status`
Returns real-time running status, delay minutes, and last passed station.

### `GET /trains/:trainNumber/position`
Returns GPS coordinates or last confirmed station coordinates.

### `GET /trains/:trainNumber/predict-crossing/:crossingId`
Estimates train arrival timestamp and gate closure window at the crossing.

---

## 5. System Health, Safety & Sources Endpoints

### `GET /system/health`
Returns system status, active provider names, uptime, and the official safety disclaimer payload.

### `GET /system/safety`
Returns the complete **Safety and Transparency Mandate** rules and non-authoritative declarations.

### `GET /system/sources`
Returns the data provenance ledger, licensing information, and provider statuses.
