import { IMapAdapter } from './interfaces';
import { GoogleMapsAdapter } from './GoogleMapsAdapter';
import { LeafletMapAdapter } from './LeafletMapAdapter';

export * from './interfaces';
export * from './GoogleMapsAdapter';
export * from './LeafletMapAdapter';
export * from './GooglePlacesProvider';
export * from './NominatimPlacesProvider';
export * from './CompositePlacesProvider';
export * from './RoutingProvider';

/**
 * Creates the appropriate Map Adapter (Google Maps if VITE_GOOGLE_MAPS_API_KEY is configured, else Leaflet/OSM).
 */
export function createMapAdapter(): IMapAdapter {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 10) {
    return new GoogleMapsAdapter(apiKey);
  }
  return new LeafletMapAdapter();
}
