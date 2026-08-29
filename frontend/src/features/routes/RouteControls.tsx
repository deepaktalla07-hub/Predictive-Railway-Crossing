import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useRouteAnalysis } from '../../hooks/useRouteAnalysis';
import { useGeolocation } from '../../hooks/useGeolocation';
import { PlacesAutocompleteInput } from './PlacesAutocompleteInput';
import {
  ArrowUpDown,
  Compass,
  Search,
  Clock,
  Navigation,
  Calendar
} from 'lucide-react';

function toLocalDatetimeString(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  }
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function formatDepartureLabel(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return 'Select time';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

export const RouteControls: React.FC = () => {
  const {
    origin,
    destination,
    originLabel,
    destinationLabel,
    departureMode,
    customDepartureTime,
    avoidHighRiskGates,
    isLoading,
    analysisResult,
    setOrigin,
    setDestination,
    setDepartureMode,
    setCustomDepartureTime,
    setAvoidHighRiskGates,
    startNavigation
  } = useAppStore();

  const { analyze } = useRouteAnalysis();
  const { getCurrentLocation, loading: geoLoading } = useGeolocation();

  const handleSwap = () => {
    const tempOrigin = origin;
    const tempOriginLabel = originLabel;
    setOrigin(destination, destinationLabel);
    setDestination(tempOrigin, tempOriginLabel);
  };

  const handleDepartureModeChange = (mode: 'NOW' | 'CUSTOM') => {
    setDepartureMode(mode);
    if (mode === 'NOW') {
      analyze({ departureTime: new Date().toISOString() });
    } else {
      // Initialize custom time to current time if not already set
      if (!customDepartureTime) {
        setCustomDepartureTime(new Date().toISOString());
      }
      analyze({ departureTime: customDepartureTime || new Date().toISOString() });
    }
  };

  const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      const parsedIso = new Date(val).toISOString();
      setCustomDepartureTime(parsedIso);
      analyze({ departureTime: parsedIso });
    }
  };

  const addQuickMinutes = (mins: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + mins);
    const iso = d.toISOString();
    setDepartureMode('CUSTOM');
    setCustomDepartureTime(iso);
    analyze({ departureTime: iso });
  };

  const setTomorrowTime = (hour: number, minute: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, minute, 0, 0);
    const iso = d.toISOString();
    setDepartureMode('CUSTOM');
    setCustomDepartureTime(iso);
    analyze({ departureTime: iso });
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
          onChange={(coord, label) => {
            setDestination(coord, label);
            if (coord && origin) {
              analyze({ origin, destination: coord });
            }
          }}
          placeholder="DESTINATION Location (Search Places)"
          iconType="destination"
          ariaLabel="Destination Location"
        />
      </div>

      {/* Advanced Timing & Gate Avoidance Controls */}
      <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
        {/* Departure Time Mode Tabs */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Departure Time:
          </span>

          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
            <button
              type="button"
              onClick={() => handleDepartureModeChange('NOW')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                departureMode === 'NOW'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Leave now
            </button>
            <button
              type="button"
              onClick={() => handleDepartureModeChange('CUSTOM')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                departureMode === 'CUSTOM'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Depart at
            </button>
          </div>
        </div>

        {/* Custom "Depart at" / "Leave at" Scheduled Panel */}
        {departureMode === 'CUSTOM' && (
          <div className="flex flex-col gap-2 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Native Date-Time Picker Input */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="flex-1 relative">
                <input
                  type="datetime-local"
                  value={toLocalDatetimeString(customDepartureTime || new Date().toISOString())}
                  onChange={handleCustomTimeChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-cyan-500 [color-scheme:dark] cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Time Shift Presets */}
            <div className="flex flex-wrap items-center gap-1 pt-1">
              <span className="text-[10px] font-semibold text-slate-400 mr-0.5">Quick:</span>
              <button
                type="button"
                onClick={() => addQuickMinutes(15)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                +15m
              </button>
              <button
                type="button"
                onClick={() => addQuickMinutes(30)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                +30m
              </button>
              <button
                type="button"
                onClick={() => addQuickMinutes(60)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                +1h
              </button>
              <button
                type="button"
                onClick={() => setTomorrowTime(9, 0)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                Tmrw 9 AM
              </button>
            </div>
          </div>
        )}

        {/* Departure Time Active Summary Chip */}
        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span>Scheduled Departure:</span>
          <span className="font-mono text-cyan-400 font-semibold">
            {departureMode === 'NOW'
              ? 'Immediate (Now)'
              : formatDepartureLabel(customDepartureTime || new Date().toISOString())}
          </span>
        </div>

        {/* Avoid High Risk Gates Checkbox */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300">
            <input
              type="checkbox"
              checked={avoidHighRiskGates}
              onChange={(e) => setAvoidHighRiskGates(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="font-medium text-[11px]">Auto Avoid Closed / High-Risk Gates</span>
          </label>
        </div>
      </div>

      {/* Actions Row: Find Route & Start Navigation */}
      <div className="flex flex-col gap-2">
        {analysisResult && (
          <button
            type="button"
            onClick={() => startNavigation()}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-[0.99] animate-pulse hover:animate-none"
          >
            <Navigation className="w-4 h-4 fill-current" />
            <span>Start Live Navigation</span>
          </button>
        )}

        <button
          type="button"
          disabled={isLoading || !destination}
          onClick={() => analyze()}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-[0.99]"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Calculating Route & Gate Closures...</span>
            </div>
          ) : !destination ? (
            <>
              <Search className="w-4 h-4" />
              <span>Search Destination to Find Route</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>{analysisResult ? 'Recalculate Route' : 'Find Delay-Free Route'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
