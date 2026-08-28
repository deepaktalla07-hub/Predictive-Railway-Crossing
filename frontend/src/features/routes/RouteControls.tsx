import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useRouteAnalysis } from '../../hooks/useRouteAnalysis';
import { useGeolocation } from '../../hooks/useGeolocation';
import { PlacesAutocompleteInput } from './PlacesAutocompleteInput';
import { RoutePreset } from '../../types';
import {
  ArrowUpDown,
  Compass,
  Sparkles,
  Search,
  Clock,
  Navigation,
  MapPin
} from 'lucide-react';

const SCENARIO_PRESETS: RoutePreset[] = [
  {
    id: 'preset-high-risk',
    name: 'Bengaluru → Hosur (LC-88A)',
    scenarioType: 'HIGH_RISK_CONFLICT',
    badge: 'HIGH RISK CONFLICT',
    description: 'Imminent gate closure with Intercity Express conflict',
    origin: { lat: 12.9177, lng: 77.6238, label: 'Silk Board Junction, Bengaluru' },
    destination: { lat: 12.7409, lng: 77.8253, label: 'Hosur Town Center' },
    isDemoData: true
  },
  {
    id: 'preset-moderate',
    name: 'Sarjapur → Karmelaram (LC-92B)',
    scenarioType: 'MODERATE_WARNING',
    badge: 'MODERATE WARNING',
    description: 'Approaching Karmelaram gate near window threshold',
    origin: { lat: 12.9250, lng: 77.6850, label: 'Bellandur EcoSpace' },
    destination: { lat: 12.8600, lng: 77.7800, label: 'Sarjapur Town' },
    isDemoData: true
  },
  {
    id: 'preset-clear',
    name: 'MG Road → Indiranagar',
    scenarioType: 'CLEAR_NO_CROSSINGS',
    badge: 'ZERO CROSSINGS',
    description: 'Unimpeded urban route with 0 level crossings',
    origin: { lat: 12.9750, lng: 77.6090, label: 'MG Road Metro Station' },
    destination: { lat: 12.9784, lng: 77.6408, label: '100ft Road, Indiranagar' },
    isDemoData: true
  },
  {
    id: 'preset-insufficient',
    name: 'Whitefield → Hoodi (LC-UNK)',
    scenarioType: 'INSUFFICIENT_DATA',
    badge: 'INSUFFICIENT DATA',
    description: 'Crossing with missing railway timetable feed',
    origin: { lat: 12.9698, lng: 77.7500, label: 'ITPL Main Gate' },
    destination: { lat: 12.9900, lng: 77.7150, label: 'Hoodi Industrial Area' },
    isDemoData: true
  }
];

export const RouteControls: React.FC = () => {
  const {
    origin,
    destination,
    originLabel,
    destinationLabel,
    departureMode,
    avoidHighRiskGates,
    isLoading,
    setOrigin,
    setDestination,
    setDepartureMode,
    setAvoidHighRiskGates
  } = useAppStore();

  const { analyze } = useRouteAnalysis();
  const { getCurrentLocation, loading: geoLoading } = useGeolocation();
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset-high-risk');

  const handleApplyPreset = (preset: RoutePreset) => {
    setSelectedPresetId(preset.id);
    setOrigin(preset.origin, preset.origin.label);
    setDestination(preset.destination, preset.destination.label);
    analyze({
      origin: preset.origin,
      destination: preset.destination
    });
  };

  const handleSwap = () => {
    const tempOrigin = origin;
    const tempOriginLabel = originLabel;
    setOrigin(destination, destinationLabel);
    setDestination(tempOrigin, tempOriginLabel);
  };

  return (
    <div className="flex flex-col gap-3.5 p-4 bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl text-slate-200">
      {/* Places Autocomplete Input Cluster */}
      <div className="flex flex-col gap-2 relative">
        {/* START Location with Places Autocomplete & GPS Button */}
        <PlacesAutocompleteInput
          value={originLabel}
          coordinate={origin}
          onChange={(coord, label) => setOrigin(coord, label)}
          placeholder="START Location (Search Places / GPS)"
          iconType="origin"
          ariaLabel="Start Location"
          rightElement={
            <button
              type="button"
              onClick={getCurrentLocation}
              title="Use current GPS location"
              aria-label="Use current GPS location"
              className="p-1 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <Compass
                className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin text-cyan-400' : ''}`}
              />
            </button>
          }
        />

        {/* Swap Origin / Destination Button */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 z-20">
          <button
            type="button"
            onClick={handleSwap}
            title="Swap Start and Destination"
            aria-label="Swap Start and Destination"
            className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
          >
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>

        {/* DESTINATION Location with Places Autocomplete */}
        <PlacesAutocompleteInput
          value={destinationLabel}
          coordinate={destination}
          onChange={(coord, label) => setDestination(coord, label)}
          placeholder="DESTINATION Location (Search Places)"
          iconType="destination"
          ariaLabel="Destination Location"
        />
      </div>

      {/* Scenario Presets Quick-Deck */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Navigation Test Scenarios:
          </span>
          <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
            [DEMO DATA]
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {SCENARIO_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 group ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/60 shadow-md ring-1 ring-blue-500/30'
                    : 'bg-slate-950/50 hover:bg-slate-800/80 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200 group-hover:text-white truncate">
                    {preset.name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                      preset.scenarioType === 'HIGH_RISK_CONFLICT'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : preset.scenarioType === 'MODERATE_WARNING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : preset.scenarioType === 'CLEAR_NO_CROSSINGS'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {preset.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Row */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
        {/* Departure Mode Toggle */}
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setDepartureMode('NOW')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                departureMode === 'NOW'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Now
            </button>
            <button
              type="button"
              onClick={() => setDepartureMode('CUSTOM')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                departureMode === 'CUSTOM'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scheduled
            </button>
          </div>
        </div>

        {/* Avoid High Risk Toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300">
          <input
            type="checkbox"
            checked={avoidHighRiskGates}
            onChange={(e) => setAvoidHighRiskGates(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 w-3.5 h-3.5"
          />
          <span className="font-medium text-[11px]">Auto Avoid Gates</span>
        </label>
      </div>

      {/* Find Route Action Button */}
      <button
        type="button"
        disabled={isLoading}
        onClick={() => analyze()}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-[0.99]"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Calculating Route & Gate Closures...</span>
          </div>
        ) : (
          <>
            <Search className="w-4 h-4" />
            <span>Find Delay-Free Route</span>
          </>
        )}
      </button>
    </div>
  );
};
