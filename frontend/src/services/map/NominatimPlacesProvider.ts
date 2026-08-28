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
        return {
          placeId: `osm_${item.place_id}`,
          mainText: name,
          secondaryText: secondary,
          description: item.display_name
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
      const osmId = placeId.replace('osm_', '');
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
}
