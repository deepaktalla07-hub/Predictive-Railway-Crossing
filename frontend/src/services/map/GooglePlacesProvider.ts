import { Loader } from '@googlemaps/js-api-loader';
import { Coordinate } from '@railway-gate/shared';
import { IPlacesProvider, PlaceDetails, PlaceSuggestion } from './interfaces';

export class GooglePlacesProvider implements IPlacesProvider {
  public readonly providerName = 'Google Places API';
  private autocompleteService: google.maps.places.AutocompleteService | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private dummyElement: HTMLDivElement;

  constructor(private apiKey: string) {
    this.dummyElement = document.createElement('div');
  }

  private async ensureInitialized(): Promise<void> {
    if (this.autocompleteService && this.placesService) return;

    const loader = new Loader({
      apiKey: this.apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    await loader.load();
    this.autocompleteService = new google.maps.places.AutocompleteService();
    this.placesService = new google.maps.places.PlacesService(this.dummyElement);
  }

  public async search(query: string, locationBias?: Coordinate): Promise<PlaceSuggestion[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      await this.ensureInitialized();
      if (!this.autocompleteService) return [];

      const request: google.maps.places.AutocompletionRequest = {
        input: query
      };

      if (locationBias) {
        request.locationBias = new google.maps.Circle({
          center: { lat: locationBias.lat, lng: locationBias.lng },
          radius: 50000 // 50km
        });
      }

      return new Promise((resolve) => {
        this.autocompleteService?.getPlacePredictions(request, (predictions, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions &&
            predictions.length > 0
          ) {
            resolve(
              predictions.map((p) => ({
                placeId: p.place_id,
                mainText: p.structured_formatting.main_text,
                secondaryText: p.structured_formatting.secondary_text,
                description: p.description
              }))
            );
          } else {
            resolve([]);
          }
        });
      });
    } catch (err) {
      console.warn('[GooglePlacesProvider] search error:', err);
      return [];
    }
  }

  public async getDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      await this.ensureInitialized();
      if (!this.placesService) return null;

      return new Promise((resolve) => {
        this.placesService?.getDetails(
          {
            placeId,
            fields: ['geometry', 'formatted_address', 'name']
          },
          (place, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              place &&
              place.geometry?.location
            ) {
              resolve({
                placeId,
                coordinate: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng()
                },
                formattedAddress: place.formatted_address || place.name || ''
              });
            } else {
              resolve(null);
            }
          }
        );
      });
    } catch (err) {
      console.warn('[GooglePlacesProvider] getDetails error:', err);
      return null;
    }
  }
}
