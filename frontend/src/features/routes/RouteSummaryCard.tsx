import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatDistance, formatDuration, formatClockTime } from '../../utils/formatters';
import { RiskGauge } from '../prediction/RiskGauge';
import { ProvenanceBadge } from '../railway/ProvenanceBadge';
import { CrossingCard } from '../railway/CrossingCard';
import { InstantRiskCard } from './InstantRiskCard';
import {
  MapPin,
  Navigation,
  Clock,
  Car,
  AlertOctagon,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { RiskLevel } from '@railway-gate/shared';

export const RouteSummaryCard: React.FC = () => {
  const {
    analysisResult,
    selectedAlternativeId,
    originLabel,
    destinationLabel,
    setActiveTab
  } = useAppStore();

  if (!analysisResult) return null;

  const primary = analysisResult.primaryRoute;
  const selectedAlt = analysisResult.alternativeRoutes.find(
    (a) => a.id === selectedAlternativeId
  );

  const displayedRoute = selectedAlt || primary;
  const departureDate = new Date(analysisResult.requestParams.departureTime);
  const etaArrivalDate = new Date(departureDate.getTime() + displayedRoute.durationSeconds * 1000);

  const primaryCrossing = primary.crossings.find(
    (c) => c.riskEvaluation.riskLevel === RiskLevel.HIGH || c.riskEvaluation.riskLevel === RiskLevel.MODERATE
  ) || primary.crossings[0];

  const bestAlternative = analysisResult.alternativeRoutes[0];

  return (
    <div className="flex flex-col gap-3.5 p-4 bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl text-slate-200">
      {/* Telemetry Header */}
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold tracking-wider text-cyan-400">
            <span>{selectedAlt ? '🟣 ALTERNATIVE ROUTE ACTIVE' : '🔵 PRIMARY ROUTE'}</span>
          </div>
          <h3 className="text-sm font-extrabold text-white mt-0.5 leading-tight">
            {displayedRoute.summary}
          </h3>
        </div>

        <div className="text-right flex flex-col items-end flex-shrink-0">
          <div className="text-lg font-black text-white font-mono leading-none">
            {formatDuration(displayedRoute.durationSeconds)}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            {formatDistance(displayedRoute.distanceMeters)}
          </div>
        </div>
      </div>

      {/* START / DESTINATION / ETA TELEMETRY GRID */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* START */}
        <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/90 flex flex-col gap-1">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            START:
          </span>
          <span className="font-semibold text-slate-200 truncate">{originLabel}</span>
          <span className="text-[10px] text-slate-500 font-mono">
            Dep: {formatClockTime(analysisResult.requestParams.departureTime)}
          </span>
        </div>

        {/* DESTINATION */}
        <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/90 flex flex-col gap-1">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            DESTINATION:
          </span>
          <span className="font-semibold text-slate-200 truncate">{destinationLabel}</span>
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">
            ETA: {formatClockTime(etaArrivalDate.toISOString())}
          </span>
        </div>
      </div>

      {/* AT-A-GLANCE INSTANT RISK CARD (Understands result in <3 seconds) */}
      {primaryCrossing && !selectedAlt && (
        <InstantRiskCard crossing={primaryCrossing} alternative={bestAlternative} />
      )}

      {/* RISK LEVEL TELEMETRY BAR */}
      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
        <RiskGauge
          score={displayedRoute.riskSummary.maxRiskScore}
          level={displayedRoute.riskSummary.overallRiskLevel}
        />
        <div className="mt-2 text-xs text-slate-300 leading-relaxed font-medium">
          {displayedRoute.riskSummary.summaryRecommendation}
        </div>
      </div>

      {/* ALL RAILWAY CROSSINGS LIST */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <span>🛤️</span> ALL DETECTED GATES ({displayedRoute.riskSummary.totalCrossingsCount}):
          </span>

          {analysisResult.alternativeRoutes.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('alternatives')}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>View Detours ({analysisResult.alternativeRoutes.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Crossing Cards List */}
        {primary.crossings.length === 0 ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <span>✅</span>
            <span>Zero railway level crossings on this route path.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {primary.crossings.map((crossing) => (
              <CrossingCard key={crossing.crossingId} crossing={crossing} />
            ))}
          </div>
        )}
      </div>

      {/* Route Provenance Footer */}
      {!selectedAlt && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
          <span>Routing Data Provenance:</span>
          <ProvenanceBadge provenance={primary.provenance} />
        </div>
      )}
    </div>
  );
};
