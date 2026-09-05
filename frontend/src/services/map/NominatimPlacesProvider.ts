import axios from 'axios';
import { Coordinate } from '@railway-gate/shared';
import { IPlacesProvider, PlaceDetails, PlaceSuggestion } from './interfaces';

const cache = new Map<string, PlaceSuggestion[]>();

export class NominatimPlacesProvider implements IPlacesProvider {
  public readonly providerName = 'OpenStreetMap Nominatim Places';
  private baseUrl = 'https://nominatim.openstreetmap.org';

  public async search(query: string, locationBias?: Coordinate): Promise<PlaceSuggestion[]> {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = `search_${query.toLowerCase()}_${locationBias?.lat || ''}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    try {
      const url = `${this.baseUrl}/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=6&addressdetails=1`;

      const response = await axios.get(url, {
        headers: {
          'Accept-Language': 'en'
        },
        timeout: 6000
      });

      const results = (response.data || []).map((item: any) => {
        const name = item.name || item.display_name.split(',')[0];
        const secondary = item.display_name.replace(name, '').replace(/^,\s*/, '');
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        return {
          placeId: `osm_${item.place_id}_${lat}_${lng}`,
          mainText: name,
          secondaryText: secondary,
          description: item.display_name,
          coordinate: isNaN(lat) || isNaN(lng) ? undefined : { lat, lng }
        };
      });

      cache.set(cacheKey, results);
      return results;
    } catch (err) {
      console.warn('[NominatimPlacesProvider] Search fallback to empty:', err);
      return [];
    }
  }

  public async getDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      // 1. First check if coordinates are embedded in placeId (osm_id_lat_lng)
      const parts = placeId.split('_');
      if (parts.length >= 4) {
        const lat = parseFloat(parts[2]);
        const lng = parseFloat(parts[3]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return {
            placeId,
            coordinate: { lat, lng },
            formattedAddress: ''
          };
        }
      }

      // 2. Check cache for matching suggestion
      for (const suggestions of cache.values()) {
        const match = suggestions.find((s) => s.placeId === placeId);
        if (match?.coordinate) {
          return {
            placeId,
            coordinate: match.coordinate,
            formattedAddress: match.description
          };
        }
      }

      const osmId = parts[1] || placeId.replace('osm_', '');
      const url = `${this.baseUrl}/details?place_id=${osmId}&format=json`;
      const response = await axios.get(url, { timeout: 6000 });

      if (response.data && response.data.geometry) {
        const [lng, lat] = response.data.geometry.coordinates;
        return {
          placeId,
          coordinate: { lat, lng },
          formattedAddress: response.data.localname || response.data.calculated_postcode || ''
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  public async reverseGeocode(coord: Coordinate): Promise<string> {
    try {
      const url = `${this.baseUrl}/reverse?format=json&lat=${coord.lat}&lon=${coord.lng}&zoom=18&addressdetails=1`;
      const response = await axios.get(url, {
        headers: {
          'Accept-Language': 'en'
        },
        timeout: 4500
      });

      if (response.data) {
        if (response.data.name && response.data.address) {
          const suburb = response.data.address.suburb || response.data.address.neighbourhood || response.data.address.city || response.data.address.town || '';
          if (suburb && !response.data.name.includes(suburb)) {
            return `${response.data.name}, ${suburb}`;
          }
          return response.data.name;
        }
        if (response.data.display_name) {
          const parts = response.data.display_name.split(',').map((s: string) => s.trim());
          if (parts.length >= 2) {
            return `${parts[0]}, ${parts[1]}`;
          }
          return response.data.display_name;
        }
      }
      return `Selected Point (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`;
    } catch {
      return `Selected Point (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`;
    }
  }
}

