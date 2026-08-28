import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinate, CrossingRiskDetail } from '@railway-gate/shared';
import { IMapAdapter, MapInitOptions } from './interfaces';
import {
  createOriginMarkerIcon,
  createDestinationMarkerIcon,
  createCrossingMarkerIcon
} from '../../utils/map.utils';
import { formatClockTime } from '../../utils/formatters';

export class LeafletMapAdapter implements IMapAdapter {
  public readonly providerName = 'Leaflet / Carto Dark Map Engine';
  private map: L.Map | null = null;
  private primaryLayer: L.Polyline | null = null;
  private altLayer: L.Polyline | null = null;
  private markerLayerGroup: L.LayerGroup | null = null;

  public async initialize(container: HTMLElement, options: MapInitOptions): Promise<void> {
    if (this.map) {
      this.map.remove();
    }

    this.map = L.map(container, {
      center: [options.center.lat, options.center.lng],
      zoom: options.zoom,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    }).addTo(this.map);

    this.markerLayerGroup = L.layerGroup().addTo(this.map);

    if (options.onMapClick) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        options.onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }
  }

  public setCenter(coord: Coordinate, zoom?: number): void {
    if (!this.map) return;
    if (zoom) {
      this.map.setView([coord.lat, coord.lng], zoom);
    } else {
      this.map.panTo([coord.lat, coord.lng]);
    }
  }

  public fitBounds(coords: Coordinate[], padding = 60): void {
    if (!this.map || coords.length === 0) return;
    const bounds = L.latLngBounds(coords.map((c) => [c.lat, c.lng] as [number, number]));
    this.map.fitBounds(bounds, { padding: [padding, padding] });
  }

  public drawRoutes(
    primaryCoords: [number, number][],
    alternativeCoords?: [number, number][]
  ): void {
    if (!this.map) return;

    if (this.primaryLayer) {
      this.primaryLayer.remove();
      this.primaryLayer = null;
    }
    if (this.altLayer) {
      this.altLayer.remove();
      this.altLayer = null;
    }

    // Draw Primary Polyline
    this.primaryLayer = L.polyline(primaryCoords, {
      color: '#2563eb',
      weight: 6,
      opacity: 0.9
    }).addTo(this.map);

    // Draw Alternative Polyline
    if (alternativeCoords && alternativeCoords.length > 0) {
      this.altLayer = L.polyline(alternativeCoords, {
        color: '#8b5cf6',
        weight: 6,
        opacity: 0.95
      }).addTo(this.map);
    }
  }

  public setMarkers(
    origin: Coordinate,
    destination: Coordinate,
    crossings: CrossingRiskDetail[],
    onSelectCrossing?: (crossing: CrossingRiskDetail) => void
  ): void {
    if (!this.map || !this.markerLayerGroup) return;

    this.markerLayerGroup.clearLayers();

    // 1. Origin Marker
    const originMarker = L.marker([origin.lat, origin.lng], {
      icon: createOriginMarkerIcon()
    });
    originMarker.bindPopup(`
      <div style="font-size: 11px; font-weight: bold; color: #0f172a;">
        <span style="color: #2563eb;">Origin (A)</span><br/>
        ${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}
      </div>
    `);
    this.markerLayerGroup.addLayer(originMarker);

    // 2. Destination Marker
    const destMarker = L.marker([destination.lat, destination.lng], {
      icon: createDestinationMarkerIcon()
    });
    destMarker.bindPopup(`
      <div style="font-size: 11px; font-weight: bold; color: #0f172a;">
        <span style="color: #059669;">Destination (B)</span><br/>
        ${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}
      </div>
    `);
    this.markerLayerGroup.addLayer(destMarker);

    // 3. Level Crossing Markers
    crossings.forEach((c) => {
      const marker = L.marker([c.location.lat, c.location.lng], {
        icon: createCrossingMarkerIcon(
          c.riskEvaluation.riskLevel,
          c.isGradeSeparated,
          c.crossingCode
        )
      });

      marker.on('click', () => {
        if (onSelectCrossing) {
          onSelectCrossing(c);
        }
      });

      marker.bindPopup(`
        <div style="font-size: 12px; color: #0f172a; font-family: sans-serif; min-width: 160px;">
          <b>${c.name}</b> (${c.crossingCode})<br/>
          <span>ETA: <b>${formatClockTime(c.userEtaAtCrossing.arrivalTime)}</b></span><br/>
          <span>Risk: <b>${c.riskEvaluation.riskLevel} (${c.riskEvaluation.riskScore}/100)</b></span>
        </div>
      `);

      this.markerLayerGroup?.addLayer(marker);
    });
  }

  public destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
