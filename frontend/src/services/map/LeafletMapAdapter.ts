import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinate, CrossingRiskDetail } from '@railway-gate/shared';
import { IMapAdapter, MapBaseLayerType, MapInitOptions } from './interfaces';
import {
  createOriginMarkerIcon,
  createDestinationMarkerIcon,
  createCrossingMarkerIcon,
  createVehicleMarkerIcon
} from '../../utils/map.utils';
import { formatClockTime } from '../../utils/formatters';

const TILE_LAYERS = {
  streets: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  }
};

const RAILWAY_OVERLAY_URL = 'https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png';

export class LeafletMapAdapter implements IMapAdapter {
  public readonly providerName = 'Leaflet Interactive Engine';
  private map: L.Map | null = null;
  private baseTileLayer: L.TileLayer | null = null;
  private railwayTileLayer: L.TileLayer | null = null;
  private primaryLayer: L.Polyline | null = null;
  private altLayer: L.Polyline | null = null;
  private markerLayerGroup: L.LayerGroup | null = null;
  private vehicleMarker: L.Marker | null = null;
  private currentBaseLayer: MapBaseLayerType = 'streets';

  public async initialize(container: HTMLElement, options: MapInitOptions): Promise<void> {
    if (this.map) {
      this.map.remove();
    }

    this.map = L.map(container, {
      center: [options.center.lat, options.center.lng],
      zoom: options.zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      inertia: true,
      inertiaDeceleration: 3000,
      easeLinearity: 0.2
    });

    // Ensure container has grab cursor
    container.style.cursor = 'grab';
    this.map.on('dragstart', () => {
      container.style.cursor = 'grabbing';
    });
    this.map.on('dragend', () => {
      container.style.cursor = 'grab';
    });

    // Add Attribution in bottom right with compact size
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(this.map);

    // Add Metric Scale Bar
    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(this.map);

    // Default base layer (Streets)
    this.baseTileLayer = L.tileLayer(TILE_LAYERS.streets.url, {
      attribution: TILE_LAYERS.streets.attribution,
      maxZoom: TILE_LAYERS.streets.maxZoom
    }).addTo(this.map);

    this.markerLayerGroup = L.layerGroup().addTo(this.map);

    if (options.onMapClick) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        options.onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }
  }

  public zoomIn(): void {
    if (this.map) {
      this.map.zoomIn();
    }
  }

  public zoomOut(): void {
    if (this.map) {
      this.map.zoomOut();
    }
  }

  public pan(dx: number, dy: number): void {
    if (this.map) {
      this.map.panBy([dx, dy], { animate: true, duration: 0.25 });
    }
  }

  public setBaseLayer(layerType: MapBaseLayerType): void {
    if (!this.map) return;
    if (this.currentBaseLayer === layerType && this.baseTileLayer) return;

    if (this.baseTileLayer) {
      this.baseTileLayer.remove();
    }

    const cfg = TILE_LAYERS[layerType] || TILE_LAYERS.streets;
    this.baseTileLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom
    }).addTo(this.map);

    // Ensure base layer is behind routes & markers
    this.baseTileLayer.bringToBack();
    this.currentBaseLayer = layerType;
  }

  public toggleRailwayOverlay(enabled: boolean): void {
    if (!this.map) return;

    if (enabled) {
      if (!this.railwayTileLayer) {
        this.railwayTileLayer = L.tileLayer(RAILWAY_OVERLAY_URL, {
          attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Style: &copy; <a href="https://www.OpenRailwayMap.org">OpenRailwayMap</a>',
          maxZoom: 19,
          opacity: 0.85
        });
      }
      this.railwayTileLayer.addTo(this.map);
    } else {
      if (this.railwayTileLayer) {
        this.railwayTileLayer.remove();
      }
    }
  }

  public setCenter(coord: Coordinate, zoom?: number): void {
    if (!this.map) return;
    if (zoom) {
      this.map.setView([coord.lat, coord.lng], zoom, { animate: true });
    } else {
      this.map.panTo([coord.lat, coord.lng], { animate: true });
    }
  }

  public fitBounds(coords: Coordinate[], padding = 60): void {
    if (!this.map || coords.length === 0) return;
    const bounds = L.latLngBounds(coords.map((c) => [c.lat, c.lng] as [number, number]));
    this.map.fitBounds(bounds, { padding: [padding, padding], animate: true });
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

    // Draw Alternative Polyline first (underneath primary)
    if (alternativeCoords && alternativeCoords.length > 0) {
      this.altLayer = L.polyline(alternativeCoords, {
        color: '#a855f7',
        weight: 6,
        opacity: 0.85,
        dashArray: '8, 8'
      }).addTo(this.map);
    }

    // Draw Primary Polyline with Google Maps bold navigation styling
    this.primaryLayer = L.polyline(primaryCoords, {
      color: '#38bdf8',
      weight: 7,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);
  }

  public setMarkers(
    origin: Coordinate,
    destination: Coordinate,
    crossings: CrossingRiskDetail[],
    onSelectCrossing?: (crossing: CrossingRiskDetail) => void,
    onOriginDragEnd?: (coord: Coordinate) => void,
    onDestinationDragEnd?: (coord: Coordinate) => void
  ): void {
    if (!this.map || !this.markerLayerGroup) return;

    this.markerLayerGroup.clearLayers();

    // 1. Origin Marker (Draggable)
    const originMarker = L.marker([origin.lat, origin.lng], {
      icon: createOriginMarkerIcon(),
      draggable: true,
      title: 'Drag to change starting point'
    });
    originMarker.bindPopup(`
      <div style="font-size: 11px; font-weight: bold; color: #0f172a; min-width: 140px;">
        <span style="color: #2563eb;">📍 Origin (A)</span><br/>
        <span style="font-size: 10px; color: #64748b;">${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}</span><br/>
        <span style="font-size: 9px; color: #94a3b8;">(Drag pin to move)</span>
      </div>
    `);
    if (onOriginDragEnd) {
      originMarker.on('dragend', (e) => {
        const latlng = (e.target as L.Marker).getLatLng();
        onOriginDragEnd({ lat: latlng.lat, lng: latlng.lng });
      });
    }
    this.markerLayerGroup.addLayer(originMarker);

    // 2. Destination Marker (Draggable)
    const destMarker = L.marker([destination.lat, destination.lng], {
      icon: createDestinationMarkerIcon(),
      draggable: true,
      title: 'Drag to change destination'
    });
    destMarker.bindPopup(`
      <div style="font-size: 11px; font-weight: bold; color: #0f172a; min-width: 140px;">
        <span style="color: #059669;">🏁 Destination (B)</span><br/>
        <span style="font-size: 10px; color: #64748b;">${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}</span><br/>
        <span style="font-size: 9px; color: #94a3b8;">(Drag pin to move)</span>
      </div>
    `);
    if (onDestinationDragEnd) {
      destMarker.on('dragend', (e) => {
        const latlng = (e.target as L.Marker).getLatLng();
        onDestinationDragEnd({ lat: latlng.lat, lng: latlng.lng });
      });
    }
    this.markerLayerGroup.addLayer(destMarker);

    // 3. Level Crossing Markers
    crossings.forEach((c) => {
      const marker = L.marker([c.location.lat, c.location.lng], {
        icon: createCrossingMarkerIcon(
          c.riskEvaluation.riskLevel,
          c.isGradeSeparated,
          c.crossingCode
        ),
        title: `${c.name} (${c.crossingCode})`
      });

      marker.on('click', () => {
        if (onSelectCrossing) {
          onSelectCrossing(c);
        }
      });

      marker.bindPopup(`
        <div style="font-size: 12px; color: #0f172a; font-family: sans-serif; min-width: 170px;">
          <b>${c.name}</b> <span style="font-size: 10px; color: #64748b;">(${c.crossingCode})</span><br/>
          <div style="margin-top: 4px; font-size: 11px;">
            <span>ETA: <b>${formatClockTime(c.userEtaAtCrossing.arrivalTime)}</b></span><br/>
            <span>Status: <b style="color: ${c.riskEvaluation.riskLevel === 'HIGH' ? '#e11d48' : c.riskEvaluation.riskLevel === 'MODERATE' ? '#d97706' : '#059669'}">${c.riskEvaluation.riskLevel} (${c.riskEvaluation.riskScore}/100)</b></span>
          </div>
        </div>
      `);

      this.markerLayerGroup?.addLayer(marker);
    });
  }

  public setVehiclePosition(coord: Coordinate, heading = 0): void {
    if (!this.map) return;

    if (!this.vehicleMarker) {
      this.vehicleMarker = L.marker([coord.lat, coord.lng], {
        icon: createVehicleMarkerIcon(heading),
        zIndexOffset: 1000
      }).addTo(this.map);
    } else {
      this.vehicleMarker.setLatLng([coord.lat, coord.lng]);
      this.vehicleMarker.setIcon(createVehicleMarkerIcon(heading));
    }
  }

  public removeVehicle(): void {
    if (this.vehicleMarker) {
      this.vehicleMarker.remove();
      this.vehicleMarker = null;
    }
  }

  public destroy(): void {
    this.removeVehicle();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
