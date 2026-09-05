import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useRouteAnalysis } from '../../hooks/useRouteAnalysis';
import { useGeolocation } from '../../hooks/useGeolocation';
import { createMapAdapter, defaultPlacesProvider, IMapAdapter, MapBaseLayerType } from '../../services/map';
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
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MousePointerClick,
  Loader2
} from 'lucide-react';

export const MapView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<IMapAdapter | null>(null);
  const [providerLabel, setProviderLabel] = useState<string>('Leaflet Interactive');
  const [activeBaseLayer, setActiveBaseLayer] = useState<MapBaseLayerType>('streets');
  const [railwayOverlayActive, setRailwayOverlayActive] = useState<boolean>(true);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);
  const [clickedCoord, setClickedCoord] = useState<Coordinate | null>(null);
  const [clickedAddress, setClickedAddress] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);

  const {
    origin,
    destination,
    mapPickingMode,
    analysisResult,
    selectedAlternativeId,
    setSelectedCrossing,
    setActiveTab,
    setOrigin,
    setDestination,
    setMapPickingMode,
    isNavigating,
    vehicleCoord,
    vehicleHeading
  } = useAppStore();

  const { analyze } = useRouteAnalysis();
  const { getCurrentLocation, location: userLocation, loading: geoLoading } = useGeolocation();

  // Keep a ref to the latest state and actions to avoid stale closures in map event callbacks
  const latestStateRef = useRef({
    mapPickingMode,
    origin,
    destination,
    analyze,
    setOrigin,
    setDestination,
    setMapPickingMode
  });

  useEffect(() => {
    latestStateRef.current = {
      mapPickingMode,
      origin,
      destination,
      analyze,
      setOrigin,
      setDestination,
      setMapPickingMode
    };
  }, [mapPickingMode, origin, destination, analyze, setOrigin, setDestination, setMapPickingMode]);

  // Synchronize Live Navigation Vehicle Marker & Camera Tracking
  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    if (isNavigating && vehicleCoord) {
      adapter.setVehiclePosition(vehicleCoord, vehicleHeading);
      adapter.setCenter(vehicleCoord);
    } else {
      adapter.removeVehicle();
    }
  }, [isNavigating, vehicleCoord, vehicleHeading]);

  // Initialize Map Adapter once container is mounted
  useEffect(() => {
    if (!containerRef.current) return;

    const adapter = createMapAdapter();
    adapterRef.current = adapter;
    setProviderLabel(adapter.providerName);

    adapter
      .initialize(containerRef.current, {
        center: origin || userLocation || { lat: 12.9177, lng: 77.6238 },
        zoom: 13,
        onMapClick: async (coord: Coordinate) => {
          const currentPickingMode = latestStateRef.current.mapPickingMode;
          const currentOrigin = latestStateRef.current.origin;
          const currentDest = latestStateRef.current.destination;

          if (currentPickingMode === 'origin') {
            const fallbackLabel = `Map Point (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`;
            latestStateRef.current.setOrigin(coord, fallbackLabel);
            latestStateRef.current.setMapPickingMode(null);

            // Asynchronously reverse geocode for full address
            defaultPlacesProvider.reverseGeocode(coord).then((addr) => {
              if (addr) {
                latestStateRef.current.setOrigin(coord, addr);
              }
            });

            if (currentDest) {
              latestStateRef.current.analyze({ origin: coord, destination: currentDest });
            }
          } else if (currentPickingMode === 'destination') {
            const fallbackLabel = `Map Point (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`;
            latestStateRef.current.setDestination(coord, fallbackLabel);
            latestStateRef.current.setMapPickingMode(null);

            // Asynchronously reverse geocode for full address
            defaultPlacesProvider.reverseGeocode(coord).then((addr) => {
              if (addr) {
                latestStateRef.current.setDestination(coord, addr);
              }
            });

            if (currentOrigin) {
              latestStateRef.current.analyze({ origin: currentOrigin, destination: coord });
            }
          } else {
            setClickedCoord(coord);
            setIsReverseGeocoding(true);
            setClickedAddress(null);
            defaultPlacesProvider.reverseGeocode(coord).then((addr) => {
              setClickedAddress(addr);
              setIsReverseGeocoding(false);
            }).catch(() => {
              setIsReverseGeocoding(false);
            });
          }
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

  const lastFittedRequestIdRef = useRef<string | null>(null);

  // Sync user GPS location if requested
  useEffect(() => {
    if (userLocation && adapterRef.current) {
      adapterRef.current.setCenter(userLocation, 15);
    }
  }, [userLocation]);

  // Auto-center on user GPS origin when detected and destination is empty
  useEffect(() => {
    if (origin && !destination && adapterRef.current) {
      adapterRef.current.setCenter(origin, 14);
    }
  }, [origin, destination]);

  // Update Routes and Markers
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
        if (destination) {
          analyze({ origin: newOrigin, destination });
        }
      },
      (newDest) => {
        setDestination(newDest, `${newDest.lat.toFixed(4)}, ${newDest.lng.toFixed(4)}`);
        if (origin) {
          analyze({ origin, destination: newDest });
        }
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

      // Only auto-fit bounds when a brand new route calculation request is received
      const currentReqId =
        analysisResult.requestId ||
        `${origin?.lat || 0},${origin?.lng || 0}-${destination?.lat || 0},${destination?.lng || 0}`;
      if (lastFittedRequestIdRef.current !== currentReqId) {
        lastFittedRequestIdRef.current = currentReqId;
        const allCoords = primaryCoords.map(([lat, lng]) => ({ lat, lng }));
        if (altCoords) {
          altCoords.forEach(([lat, lng]) => allCoords.push({ lat, lng }));
        }
        adapter.fitBounds(allCoords, 70);
      }
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
      } else if (origin && destination) {
        adapterRef.current.fitBounds([origin, destination], 60);
      } else if (origin) {
        adapterRef.current.setCenter(origin, 14);
      }
    }
  };

  // Click-to-Route Handlers
  const handleSetStart = () => {
    if (clickedCoord) {
      const label = clickedAddress || `Map Point (${clickedCoord.lat.toFixed(4)}, ${clickedCoord.lng.toFixed(4)})`;
      setOrigin(clickedCoord, label);
      setClickedCoord(null);
      if (destination) {
        analyze({ origin: clickedCoord, destination });
      }
    }
  };

  const handleSetDestination = () => {
    if (clickedCoord) {
      const label = clickedAddress || `Map Point (${clickedCoord.lat.toFixed(4)}, ${clickedCoord.lng.toFixed(4)})`;
      setDestination(clickedCoord, label);
      setClickedCoord(null);
      if (origin) {
        analyze({ origin, destination: clickedCoord });
      }
    }
  };

  return (
    <div className={`w-full h-full relative z-0 bg-slate-950 overflow-hidden select-none ${mapPickingMode ? 'cursor-crosshair' : ''}`}>
      {/* Underlying Map Engine Canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Active Map Pin Dropping Banner (Top Center) */}
      {mapPickingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/98 backdrop-blur-2xl border border-cyan-500/80 px-4 py-2.5 rounded-2xl shadow-2xl shadow-cyan-900/40 flex items-center gap-3 text-xs text-white animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto">
          <div className="relative flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full ${mapPickingMode === 'origin' ? 'bg-cyan-400' : 'bg-emerald-400'} animate-ping`} />
            <div className={`absolute w-2 h-2 rounded-full ${mapPickingMode === 'origin' ? 'bg-cyan-400' : 'bg-emerald-400'}`} />
          </div>

          <div className="flex flex-col">
            <span className="font-extrabold text-slate-100 flex items-center gap-1.5">
              <MousePointerClick className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
              {mapPickingMode === 'origin'
                ? 'Select START Point on Map (A)'
                : 'Select DESTINATION Point on Map (B)'}
            </span>
            <span className="text-[11px] text-slate-400">
              Click anywhere on the map to place pin
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMapPickingMode(null)}
            className="ml-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-semibold text-[11px] border border-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Floating Interactive Map Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Layer Switcher & Tool Group */}
        <div className="flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-800 text-slate-300">
          {/* Pan Left Button */}
          <button
            type="button"
            onClick={() => adapterRef.current?.pan(-150, 0)}
            title="Pan Left (Move Sideways)"
            aria-label="Pan Left"
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Pan Right Button */}
          <button
            type="button"
            onClick={() => adapterRef.current?.pan(150, 0)}
            title="Pan Right (Move Sideways)"
            aria-label="Pan Right"
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

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
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-slate-900/98 backdrop-blur-2xl border border-slate-700 p-3.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-3 text-xs text-slate-200 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-[90vw]">
          <div className="flex flex-col min-w-0 max-w-xs">
            <span className="font-bold text-slate-100 flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="truncate">{clickedAddress || 'Selected Point'}</span>
              {isReverseGeocoding && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin flex-shrink-0" />}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {clickedCoord.lat.toFixed(4)}, {clickedCoord.lng.toFixed(4)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleSetStart}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              <span>Set as Start (A)</span>
            </button>

            <button
              type="button"
              onClick={handleSetDestination}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1"
            >
              <Navigation className="w-3 h-3" />
              <span>Set as Dest (B)</span>
            </button>

            <button
              type="button"
              onClick={() => setClickedCoord(null)}
              className="p-1 text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
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


