import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useRouteAnalysis } from '../../hooks/useRouteAnalysis';
import { useGeolocation } from '../../hooks/useGeolocation';
import { createMapAdapter, IMapAdapter, MapBaseLayerType } from '../../services/map';
import { Coordinate } from '@railway-gate/shared';
import {
  Layers,
  Compass,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MapPin,
  Navigation,
  Train,
  Check,
  Globe,
  Moon,
  Map as MapIcon,
  X
} from 'lucide-react';

export const MapView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<IMapAdapter | null>(null);
  const [providerLabel, setProviderLabel] = useState<string>('Leaflet Interactive');
  const [activeBaseLayer, setActiveBaseLayer] = useState<MapBaseLayerType>('streets');
  const [railwayOverlayActive, setRailwayOverlayActive] = useState<boolean>(true);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);
  const [clickedCoord, setClickedCoord] = useState<Coordinate | null>(null);

  const {
    origin,
    destination,
    analysisResult,
    selectedAlternativeId,
    setSelectedCrossing,
    setActiveTab,
    setOrigin,
    setDestination
  } = useAppStore();

  const { analyze } = useRouteAnalysis();
  const { getCurrentLocation, location: userLocation, loading: geoLoading } = useGeolocation();

  // Initialize Map Adapter once container is mounted
  useEffect(() => {
    if (!containerRef.current) return;

    const adapter = createMapAdapter();
    adapterRef.current = adapter;
    setProviderLabel(adapter.providerName);

    adapter
      .initialize(containerRef.current, {
        center: origin,
        zoom: 12,
        onMapClick: (coord: Coordinate) => {
          setClickedCoord(coord);
        },
        onCrossingClick: (crossing) => {
          setSelectedCrossing(crossing);
          setActiveTab('crossings');
        }
      })
      .then(() => {
        // Enable railway track overlay by default for visibility of railway level crossings
        adapter.toggleRailwayOverlay(true);
      })
      .catch((err) => {
        console.warn('Map initialization fallback:', err);
      });

    return () => {
      adapter.destroy();
      adapterRef.current = null;
    };
  }, []);

  // Sync user GPS location if requested
  useEffect(() => {
    if (userLocation && adapterRef.current) {
      adapterRef.current.setCenter(userLocation, 15);
    }
  }, [userLocation]);

  // Update Routes and Markers whenever analysisResult, origin, destination change
  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    const crossings = analysisResult?.primaryRoute?.crossings || [];

    // 1. Draw Markers with Drag Callbacks
    adapter.setMarkers(
      origin,
      destination,
      crossings,
      (crossing) => {
        setSelectedCrossing(crossing);
        setActiveTab('crossings');
      },
      (newOrigin) => {
        setOrigin(newOrigin, `${newOrigin.lat.toFixed(4)}, ${newOrigin.lng.toFixed(4)}`);
        analyze({ origin: newOrigin });
      },
      (newDest) => {
        setDestination(newDest, `${newDest.lat.toFixed(4)}, ${newDest.lng.toFixed(4)}`);
        analyze({ destination: newDest });
      }
    );

    // 2. Draw Polylines
    if (analysisResult?.primaryRoute?.polylineGeoJSON?.coordinates) {
      const primaryCoords: [number, number][] =
        analysisResult.primaryRoute.polylineGeoJSON.coordinates.map(([lng, lat]) => [lat, lng]);

      const selectedAlt = analysisResult.alternativeRoutes.find(
        (a) => a.id === selectedAlternativeId
      );

      const altCoords: [number, number][] | undefined = selectedAlt?.polylineGeoJSON?.coordinates?.map(
        ([lng, lat]) => [lat, lng]
      );

      adapter.drawRoutes(primaryCoords, altCoords);

      // Fit bounds to the active route
      const allCoords = primaryCoords.map(([lat, lng]) => ({ lat, lng }));
      if (altCoords) {
        altCoords.forEach(([lat, lng]) => allCoords.push({ lat, lng }));
      }
      adapter.fitBounds(allCoords, 70);
    } else {
      adapter.fitBounds([origin, destination], 80);
    }
  }, [origin, destination, analysisResult, selectedAlternativeId, setSelectedCrossing, setActiveTab, setOrigin, setDestination, analyze]);

  // Layer Switching Handlers
  const handleLayerChange = (layer: MapBaseLayerType) => {
    setActiveBaseLayer(layer);
    if (adapterRef.current) {
      adapterRef.current.setBaseLayer(layer);
    }
  };

  const handleToggleRailwayOverlay = () => {
    const next = !railwayOverlayActive;
    setRailwayOverlayActive(next);
    if (adapterRef.current) {
      adapterRef.current.toggleRailwayOverlay(next);
    }
  };

  // Recenter Bounds Action
  const handleRecenter = () => {
    if (adapterRef.current) {
      if (analysisResult?.primaryRoute?.polylineGeoJSON?.coordinates) {
        const primaryCoords = analysisResult.primaryRoute.polylineGeoJSON.coordinates.map(
          ([lng, lat]) => ({ lat, lng })
        );
        adapterRef.current.fitBounds(primaryCoords, 60);
      } else {
        adapterRef.current.fitBounds([origin, destination], 60);
      }
    }
  };

  // Click-to-Route Handlers
  const handleSetStart = () => {
    if (clickedCoord) {
      setOrigin(clickedCoord, `${clickedCoord.lat.toFixed(4)}, ${clickedCoord.lng.toFixed(4)}`);
      setClickedCoord(null);
      analyze({ origin: clickedCoord });
    }
  };

  const handleSetDestination = () => {
    if (clickedCoord) {
      setDestination(clickedCoord, `${clickedCoord.lat.toFixed(4)}, ${clickedCoord.lng.toFixed(4)}`);
      setClickedCoord(null);
      analyze({ destination: clickedCoord });
    }
  };

  return (
    <div className="w-full h-full relative z-0 bg-slate-950 overflow-hidden select-none">
      {/* Underlying Map Engine Canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Interactive Map Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Layer Switcher & Tool Group */}
        <div className="flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-800 text-slate-300">
          {/* Zoom In Button */}
          <button
            type="button"
            onClick={() => adapterRef.current?.zoomIn()}
            title="Zoom In (+)"
            aria-label="Zoom In"
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={() => adapterRef.current?.zoomOut()}
            title="Zoom Out (-)"
            aria-label="Zoom Out"
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Fit Route Bounds Button */}
          <button
            type="button"
            onClick={handleRecenter}
            title="Fit Route to Screen"
            aria-label="Fit Route to Screen"
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Current Location (GPS) Button */}
          <button
            type="button"
            onClick={getCurrentLocation}
            title="Find My Location (GPS)"
            aria-label="Find My Location"
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <Compass className={`w-4 h-4 ${geoLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Map Layer Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            title="Switch Map Layers (Satellite, Streets, Railway Overlay)"
            aria-label="Switch Map Layers"
            className={`w-10 h-10 flex items-center justify-center transition-colors cursor-pointer ${
              isLayerMenuOpen ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Map Layers Dropdown Panel */}
        {isLayerMenuOpen && (
          <div className="w-56 p-3 bg-slate-900/98 backdrop-blur-2xl border border-slate-700 rounded-2xl shadow-2xl flex flex-col gap-2.5 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px] font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Map Display Styles
              </span>
              <button
                type="button"
                onClick={() => setIsLayerMenuOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Base Layer Options */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => handleLayerChange('streets')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-semibold transition-all cursor-pointer ${
                  activeBaseLayer === 'streets'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Streets & Roads</span>
                </div>
                {activeBaseLayer === 'streets' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => handleLayerChange('satellite')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-semibold transition-all cursor-pointer ${
                  activeBaseLayer === 'satellite'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Satellite Imagery</span>
                </div>
                {activeBaseLayer === 'satellite' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => handleLayerChange('dark')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-semibold transition-all cursor-pointer ${
                  activeBaseLayer === 'dark'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dark Navigation</span>
                </div>
                {activeBaseLayer === 'dark' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Overlays Section */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Railway Infrastructure
              </span>
              <label className="flex items-center justify-between p-2 bg-slate-950/60 hover:bg-slate-800 rounded-xl border border-slate-800/80 cursor-pointer text-slate-200">
                <div className="flex items-center gap-2">
                  <Train className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[11px] font-semibold">Rail Tracks Overlay</span>
                </div>
                <input
                  type="checkbox"
                  checked={railwayOverlayActive}
                  onChange={handleToggleRailwayOverlay}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Clicked Map Location Action Card (Bottom Center) */}
      {clickedCoord && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-slate-900/98 backdrop-blur-2xl border border-slate-700 p-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs text-slate-200 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex flex-col">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              Selected Point
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {clickedCoord.lat.toFixed(4)}, {clickedCoord.lng.toFixed(4)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSetStart}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              <span>Set as Start (A)</span>
            </button>

            <button
              type="button"
              onClick={handleSetDestination}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1"
            >
              <Navigation className="w-3 h-3" />
              <span>Set as Dest (B)</span>
            </button>

            <button
              type="button"
              onClick={() => setClickedCoord(null)}
              className="p-1 text-slate-400 hover:text-white transition-colors ml-1"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

