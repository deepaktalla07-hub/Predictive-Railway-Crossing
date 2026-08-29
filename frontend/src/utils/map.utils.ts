import L from 'leaflet';
import { RiskLevel } from '@railway-gate/shared';

export function createOriginMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></div>
        <div class="relative w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">
          A
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

export function createDestinationMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="relative w-6 h-6 bg-emerald-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">
          B
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

export function createCrossingMarkerIcon(
  riskLevel: RiskLevel,
  isGradeSeparated: boolean,
  crossingCode: string
): L.DivIcon {
  let bgColor = 'bg-slate-500';
  let pulseColor = 'bg-slate-400/30';
  let borderColor = 'border-slate-300';
  let iconContent = '🛤️';

  if (isGradeSeparated) {
    bgColor = 'bg-emerald-600';
    pulseColor = 'bg-emerald-400/20';
    borderColor = 'border-emerald-200';
    iconContent = '🌉';
  } else if (riskLevel === RiskLevel.HIGH_RISK_BLOCK) {
    bgColor = 'bg-rose-600';
    pulseColor = 'bg-rose-500/40';
    borderColor = 'border-rose-300';
    iconContent = '⛔';
  } else if (riskLevel === RiskLevel.MODERATE_WARNING) {
    bgColor = 'bg-amber-500';
    pulseColor = 'bg-amber-400/30';
    borderColor = 'border-amber-200';
    iconContent = '⚠️';
  } else if (riskLevel === RiskLevel.LOW_RISK) {
    bgColor = 'bg-yellow-500';
    pulseColor = 'bg-yellow-400/20';
    borderColor = 'border-yellow-200';
    iconContent = '⏱️';
  } else {
    bgColor = 'bg-emerald-600';
    pulseColor = 'bg-emerald-400/20';
    borderColor = 'border-emerald-200';
    iconContent = '✅';
  }

  const isPulsing = riskLevel === RiskLevel.HIGH_RISK_BLOCK || riskLevel === RiskLevel.MODERATE_WARNING;

  return L.divIcon({
    className: 'custom-crossing-marker',
    html: `
      <div class="relative flex flex-col items-center group cursor-pointer">
        ${isPulsing ? `<div class="absolute -top-1 w-10 h-10 ${pulseColor} rounded-full animate-ping"></div>` : ''}
        <div class="relative w-9 h-9 ${bgColor} ${borderColor} border-2 rounded-xl shadow-xl flex items-center justify-center text-sm transform transition-transform group-hover:scale-110">
          ${iconContent}
        </div>
        <div class="mt-1 px-1.5 py-0.5 bg-slate-900/90 backdrop-blur border border-slate-700 text-[10px] font-semibold text-slate-200 rounded shadow-md whitespace-nowrap">
          ${crossingCode}
        </div>
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 25]
  });
}

export function createVehicleMarkerIcon(heading = 0): L.DivIcon {
  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div class="relative flex items-center justify-center w-12 h-12">
        <div class="absolute w-10 h-10 bg-cyan-500/25 rounded-full animate-ping"></div>
        <div class="absolute w-12 h-12 bg-blue-500/20 rounded-full"></div>
        <div
          class="relative w-9 h-9 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 rounded-full border-2 border-white shadow-2xl flex items-center justify-center text-white transform transition-transform duration-100"
          style="transform: rotate(${heading}deg);"
        >
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
}

