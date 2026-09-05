import { Coordinate } from '@railway-gate/shared';
import { IPlacesProvider, PlaceDetails, PlaceSuggestion } from './interfaces';
import { GooglePlacesProvider } from './GooglePlacesProvider';
import { NominatimPlacesProvider } from './NominatimPlacesProvider';

export class CompositePlacesProvider implements IPlacesProvider {
  public readonly providerName: string;
  private activeProvider: IPlacesProvider;

  constructor() {
    const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 10) {
      this.activeProvider = new GooglePlacesProvider(apiKey);
      this.providerName = 'Google Places API';
    } else {
      this.activeProvider = new NominatimPlacesProvider();
      this.providerName = 'OpenStreetMap Places Provider';
    }
  }

  public async search(query: string, locationBias?: Coordinate): Promise<PlaceSuggestion[]> {
    return this.activeProvider.search(query, locationBias);
  }

  public async getDetails(placeId: string): Promise<PlaceDetails | null> {
    return this.activeProvider.getDetails(placeId);
  }

  public async reverseGeocode(coord: Coordinate): Promise<string> {
    if (this.activeProvider.reverseGeocode) {
      return this.activeProvider.reverseGeocode(coord);
    }
    return `Selected Point (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`;
  }
}

export const defaultPlacesProvider = new CompositePlacesProvider();

