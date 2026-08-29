import { Coordinate, CrossingRiskDetail, RouteAnalysisRequest, RouteAnalysisResponse } from '@railway-gate/shared';

export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText?: string;
  description: string;
  coordinate?: Coordinate;
}

export interface PlaceDetails {
  placeId: string;
  coordinate: Coordinate;
  formattedAddress: string;
}

export interface MapInitOptions {
  center: Coordinate;
  zoom: number;
  onMapClick?: (coord: Coordinate) => void;
  onCrossingClick?: (crossing: CrossingRiskDetail) => void;
}

export interface IMapAdapter {
  readonly providerName: string;
  initialize(container: HTMLElement, options: MapInitOptions): Promise<void>;
  setCenter(coord: Coordinate, zoom?: number): void;
  fitBounds(coords: Coordinate[], padding?: number): void;
  drawRoutes(primaryCoords: [number, number][], alternativeCoords?: [number, number][]): void;
  setMarkers(
    origin: Coordinate,
    destination: Coordinate,
    crossings: CrossingRiskDetail[],
    onSelectCrossing?: (crossing: CrossingRiskDetail) => void
  ): void;
  destroy(): void;
}

export interface IPlacesProvider {
  readonly providerName: string;
  search(query: string, locationBias?: Coordinate): Promise<PlaceSuggestion[]>;
  getDetails(placeId: string): Promise<PlaceDetails | null>;
}

export interface IRoutingProvider {
  readonly providerName: string;
  analyzeJourney(request: RouteAnalysisRequest): Promise<RouteAnalysisResponse>;
}
