import { Loader } from '@googlemaps/js-api-loader';
import { Coordinate, CrossingRiskDetail, RiskLevel } from '@railway-gate/shared';
import { IMapAdapter, MapInitOptions } from './interfaces';
import { formatClockTime } from '../../utils/formatters';

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#334155' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }]
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#3b82f6' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#020617' }]
  }
];

export class GoogleMapsAdapter implements IMapAdapter {
  public readonly providerName = 'Google Maps Platform';
  private map: google.maps.Map | null = null;
  private primaryPolyline: google.maps.Polyline | null = null;
  private alternativePolyline: google.maps.Polyline | null = null;
  private markers: google.maps.Marker[] = [];
  private infoWindow: google.maps.InfoWindow | null = null;

  constructor(private apiKey: string) {}

  public async initialize(container: HTMLElement, options: MapInitOptions): Promise<void> {
    const loader = new Loader({
      apiKey: this.apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });

    await loader.load();

    this.map = new google.maps.Map(container, {
      center: { lat: options.center.lat, lng: options.center.lng },
      zoom: options.zoom,
      styles: DARK_MAP_STYLE,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    this.infoWindow = new google.maps.InfoWindow();

    if (options.onMapClick) {
      this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          options.onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
      });
    }
  }

  public setCenter(coord: Coordinate, zoom?: number): void {
    if (!this.map) return;
    this.map.setCenter({ lat: coord.lat, lng: coord.lng });
    if (zoom) this.map.setZoom(zoom);
  }

  public fitBounds(coords: Coordinate[], padding = 60): void {
    if (!this.map || coords.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    coords.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));
    this.map.fitBounds(bounds, padding);
  }

  public zoomIn(): void {
    if (this.map) {
      const z = this.map.getZoom() || 12;
      this.map.setZoom(z + 1);
    }
  }

  public zoomOut(): void {
    if (this.map) {
      const z = this.map.getZoom() || 12;
      this.map.setZoom(z - 1);
    }
  }

  public setBaseLayer(layerType: 'streets' | 'satellite' | 'dark'): void {
    if (!this.map) return;
    if (layerType === 'satellite') {
      this.map.setMapTypeId(google.maps.MapTypeId.HYBRID);
    } else {
      this.map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
    }
  }

  public toggleRailwayOverlay(_enabled: boolean): void {
    // Google Maps transit layer
  }

  public drawRoutes(
    primaryCoords: [number, number][],
    alternativeCoords?: [number, number][]
  ): void {
    if (!this.map) return;

    if (this.primaryPolyline) {
      this.primaryPolyline.setMap(null);
    }
    if (this.alternativePolyline) {
      this.alternativePolyline.setMap(null);
    }

    // Draw Primary Polyline (coords are [lat, lng])
    const primaryPath = primaryCoords.map(([lat, lng]) => ({ lat, lng }));
    this.primaryPolyline = new google.maps.Polyline({
      path: primaryPath,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.9,
      strokeWeight: 6,
      map: this.map
    });

    // Draw Alternative Detour Polyline (if present)
    if (alternativeCoords && alternativeCoords.length > 0) {
      const altPath = alternativeCoords.map(([lat, lng]) => ({ lat, lng }));
      this.alternativePolyline = new google.maps.Polyline({
        path: altPath,
        geodesic: true,
        strokeColor: '#8b5cf6',
        strokeOpacity: 0.9,
        strokeWeight: 6,
        map: this.map
      });
    }
  }

  public setMarkers(
    origin: Coordinate,
    destination: Coordinate,
    crossings: CrossingRiskDetail[],
    onSelectCrossing?: (crossing: CrossingRiskDetail) => void
  ): void {
    if (!this.map) return;

    // Clear previous markers
    this.markers.forEach((m) => m.setMap(null));
    this.markers = [];

    // 1. Origin Marker
    const originMarker = new google.maps.Marker({
      position: { lat: origin.lat, lng: origin.lng },
      map: this.map,
      title: 'Origin (A)',
      label: { text: 'A', color: '#ffffff', fontWeight: 'bold', fontSize: '12px' },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 14,
        fillColor: '#2563eb',
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#ffffff'
      }
    });
    this.markers.push(originMarker);

    // 2. Destination Marker
    const destMarker = new google.maps.Marker({
      position: { lat: destination.lat, lng: destination.lng },
      map: this.map,
      title: 'Destination (B)',
      label: { text: 'B', color: '#ffffff', fontWeight: 'bold', fontSize: '12px' },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 14,
        fillColor: '#059669',
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#ffffff'
      }
    });
    this.markers.push(destMarker);

    // 3. Level Crossing Markers
    crossings.forEach((c) => {
      let fillColor = '#64748b';
      if (c.isGradeSeparated) fillColor = '#10b981';
      else if (c.riskEvaluation.riskLevel === RiskLevel.HIGH) fillColor = '#f43f5e';
      else if (c.riskEvaluation.riskLevel === RiskLevel.MODERATE) fillColor = '#f59e0b';
      else if (c.riskEvaluation.riskLevel === RiskLevel.LOW) fillColor = '#10b981';
      else fillColor = '#94a3b8';

      const crossingMarker = new google.maps.Marker({
        position: { lat: c.location.lat, lng: c.location.lng },
        map: this.map,
        title: `${c.name} (${c.crossingCode})`,
        icon: {
          path: 'M -12,-12 L 12,-12 L 12,12 L -12,12 Z',
          fillColor,
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#ffffff',
          scale: 1
        }
      });

      crossingMarker.addListener('click', () => {
        if (onSelectCrossing) {
          onSelectCrossing(c);
        }
        if (this.infoWindow && this.map) {
          const content = `
            <div style="color: #0f172a; font-family: sans-serif; font-size: 12px; padding: 4px;">
              <b style="font-size: 13px;">${c.name}</b> (${c.crossingCode})<br/>
              <span>Arrival ETA: <b>${formatClockTime(c.userEtaAtCrossing.arrivalTime)}</b></span><br/>
              <span>Risk: <b>${c.riskEvaluation.riskLevel} (${c.riskEvaluation.riskScore}/100)</b></span>
            </div>
          `;
          this.infoWindow.setContent(content);
          this.infoWindow.open(this.map, crossingMarker);
        }
      });

      this.markers.push(crossingMarker);
    });
  }

  public destroy(): void {
    this.markers.forEach((m) => m.setMap(null));
    this.markers = [];
    if (this.primaryPolyline) this.primaryPolyline.setMap(null);
    if (this.alternativePolyline) this.alternativePolyline.setMap(null);
    this.map = null;
  }
}
