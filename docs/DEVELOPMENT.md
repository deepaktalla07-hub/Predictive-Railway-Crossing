# Development Guide - Railway Gate Route Assistant

## 1. Prerequisites

- **Node.js**: >= 18.0.0 (Node 20+ recommended)
- **npm**: >= 9.0.0
- **Git**

---

## 2. Quickstart

### Step 1: Install Monorepo Dependencies
```bash
# From repository root
npm install
```

### Step 2: Configure Environment Variables
```bash
cp .env.example .env
```

### Step 3: Run Full Development Environment
```bash
# Starts both Backend (Port 5001) and Frontend (Port 5174/5173) concurrently
npm run dev
```

Or run packages individually:
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

---

## 3. Mapping Provider Abstraction Layer

The application utilizes a modular mapping architecture decoupled via three core provider interfaces in `frontend/src/services/map/`:

1. **`MapProvider` (`IMapAdapter`)**:
   - Manages map rendering, center coordinates, zoom levels, bounds fitting, polyline drawing, and custom railway gate marker rendering.
   - Implementations: `GoogleMapsAdapter` (Google Maps JS API) and `LeafletMapAdapter` (OpenStreetMap / Carto Dark vector tiles).
   - Selected automatically via `createMapAdapter()`.

2. **`PlacesProvider` (`IPlacesProvider`)**:
   - Manages place search and autocomplete suggestions.
   - Implementations: `GooglePlacesProvider` (Google Places API) and `NominatimPlacesProvider` (OSM Nominatim Geocoder).
   - Selected automatically via `CompositePlacesProvider`.

3. **`RoutingProvider` (`IRoutingProvider`)**:
   - Manages driving route calculation, corridor buffers, intersecting gate identification, and kinematic prediction pipeline.
   - Implementation: `ClientRoutingProvider` (orchestrates backend `/api/v1/routes/analyze`).

---

## 4. Google Maps Platform Integration & Security

To enable Google Maps Platform features (Maps JavaScript API & Places API):

1. Obtain an API key from Google Cloud Console.
2. In the Google Cloud Console, **restrict your API key**:
   - **Application restriction**: Set to **HTTP referrers (web sites)** and add your authorized domains:
     - `http://localhost:5173/*`
     - `http://localhost:5174/*`
     - Production domain (e.g. `https://your-production-app.com/*`)
   - **API restrictions**: Select only **Maps JavaScript API** and **Places API**.
3. Set the key in your `.env`:
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy...your_restricted_key
   ```
4. Never commit your `.env` to source control.

If `VITE_GOOGLE_MAPS_API_KEY` is not provided or fails to load, the system seamlessly falls back to OpenStreetMap vector tiles and Nominatim geocoding with zero degradation.

---

## 5. Testing & Typechecking

```bash
# Run unit & integration tests
npm test

# Run full monorepo typecheck & production builds
npm run typecheck
```
