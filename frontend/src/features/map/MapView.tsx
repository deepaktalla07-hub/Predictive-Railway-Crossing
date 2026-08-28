import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { createMapAdapter, IMapAdapter } from '../../services/map';
import { Coordinate } from '@railway-gate/shared';
import { Layers, Compass, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export const MapView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<IMapAdapter | null>(null);
  const [providerLabel, setProviderLabel] = useState<string>('Initializing Map...');

  const {
    origin,
    destination,
    analysisResult,
    selectedAlternativeId,
    setSelectedCrossing,
    setActiveTab,
    setOrigin
  } = useAppStore();

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
          console.log('Map clicked:', coord);
        },
        onCrossingClick: (crossing) => {
          setSelectedCrossing(crossing);
          setActiveTab('crossings');
        }
      })
      .catch((err) => {
        console.warn('Map initialization fallback:', err);
      });

    return () => {
      adapter.destroy();
      adapterRef.current = null;
    };
  }, []);

  // Update Routes and Markers whenever analysisResult or selectedAlternativeId changes
  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    const crossings = analysisResult?.primaryRoute?.crossings || [];

    // 1. Draw Markers
    adapter.setMarkers(origin, destination, crossings, (crossing) => {
      setSelectedCrossing(crossing);
      setActiveTab('crossings');
    });

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
  }, [origin, destination, analysisResult, selectedAlternativeId, setSelectedCrossing, setActiveTab]);

  // Recenter Action
  const handleRecenter = () => {
    if (adapterRef.current) {
      adapterRef.current.fitBounds([origin, destination], 60);
    }
  };

  return (
    <div className="w-full h-full relative z-0 bg-slate-950 overflow-hidden select-none">
      {/* Underlying Map Engine Canvas (Google Maps or Leaflet) */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Map Overlay Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Recenter Bounds Button */}
        <button
          type="button"
          onClick={handleRecenter}
          title="Fit Route to Screen"
          className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 backdrop-blur-md shadow-xl flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Active Engine Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 shadow-md">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>{providerLabel}</span>
        </div>
      </div>
    </div>
  );
};
