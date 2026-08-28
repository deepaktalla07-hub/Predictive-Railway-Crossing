import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatDistance, formatDuration, formatClockTime } from '../../utils/formatters';
import { Clock, ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { RiskLevel } from '@railway-gate/shared';

export const AlternativeSelector: React.FC = () => {
  const {
    analysisResult,
    selectedAlternativeId,
    setSelectedAlternativeId
  } = useAppStore();

  if (!analysisResult) return null;

  const alternatives = analysisResult.alternativeRoutes;
  const primary = analysisResult.primaryRoute;

  const normalDistText = primary.formattedDistance || formatDistance(primary.distanceMeters);
  const normalDurationText = primary.formattedDuration || formatDuration(primary.durationSeconds);
  const normalRisk = primary.riskSummary.overallRiskLevel;

  return (
    <div className="flex flex-col gap-3.5 p-4 bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div>
          <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-wider">
            ROUTE COMPARISON & AVOIDANCE DECK
          </span>
          <h3 className="text-sm font-bold text-white mt-0.5">
            Alternative Route Engine
          </h3>
        </div>

        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-extrabold rounded-full border border-purple-500/40 font-mono">
          {alternatives.length} options
        </span>
      </div>

      {/* NORMAL ROUTE Card */}
      <div
        onClick={() => setSelectedAlternativeId(null)}
        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
          selectedAlternativeId === null
            ? 'bg-blue-600/15 border-blue-500 shadow-lg ring-1 ring-blue-500/50'
            : 'bg-slate-950/60 hover:bg-slate-800/70 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-extrabold rounded-md border border-blue-500/40">
              NORMAL ROUTE
            </span>
            <span className="text-xs font-bold text-white">Default Driving Route</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                normalRisk === RiskLevel.HIGH
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : normalRisk === RiskLevel.MODERATE
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              Risk: {normalRisk}
            </span>
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Distance</span>
            <span className="font-mono font-bold text-white text-sm">{normalDistText}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">ETA / Duration</span>
            <span className="font-mono font-bold text-white text-sm">{normalDurationText}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {primary.riskSummary.conflictingCrossingsCount > 0
              ? `⚠️ ${primary.riskSummary.conflictingCrossingsCount} railway crossing with predicted gate closure`
              : '✅ Zero predicted level crossing conflicts'}
          </span>
          {primary.riskSummary.maxPotentialDelaySeconds > 0 && (
            <span className="text-rose-400 font-semibold font-mono">
              ~{Math.round(primary.riskSummary.maxPotentialDelaySeconds / 60)} min gate wait
            </span>
          )}
        </div>
      </div>

      {/* ALTERNATIVE ROUTES */}
      {alternatives.length === 0 ? (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>No alternative detours required. The normal driving route has minimal railway risk.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            Evaluated Alternatives
          </div>

          {alternatives.map((alt, index) => {
            const isSelected = selectedAlternativeId === alt.id;
            return (
              <div
                key={alt.id}
                onClick={() => setSelectedAlternativeId(alt.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                  isSelected
                    ? 'bg-purple-600/15 border-purple-500 shadow-xl ring-1 ring-purple-500/50'
                    : 'bg-slate-950/60 hover:bg-slate-800/70 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-extrabold rounded-md border border-purple-500/40">
                      ALTERNATIVE {index + 1}
                    </span>
                    <span className="text-xs font-bold text-white">{alt.title}</span>
                  </div>

                  {alt.isRecommended && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold rounded-full animate-pulse">
                      ★ RECOMMENDED
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">{alt.summary}</p>

                {/* Side-by-side Comparative Metrics */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">Distance</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono font-bold text-white text-sm">
                        {alt.formattedDistance || formatDistance(alt.distanceMeters)}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        ({alt.formattedAdditionalDistance || `+${formatDistance(alt.additionalDistanceMeters)}`})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">ETA / Duration</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono font-bold text-white text-sm">
                        {alt.formattedDuration || formatDuration(alt.durationSeconds)}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        ({alt.formattedAdditionalDuration || `+${formatDuration(alt.additionalDurationSeconds)}`})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Avoidance Confirmation & Net Time Benefit */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1">
                    {alt.avoidsAffectedCrossing ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Avoids affected crossing
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Passes near crossing
                      </span>
                    )}
                  </div>

                  <span className="text-emerald-400 font-mono font-bold">
                    +{Math.round(alt.timeSavedVsGateWaitSeconds / 60)} min saved vs gate wait
                  </span>
                </div>

                {alt.suggestedDepartureTime && (
                  <div className="text-[11px] text-cyan-300 flex items-center gap-1 font-mono bg-cyan-950/40 p-1.5 rounded-lg border border-cyan-800/40">
                    <Clock className="w-3 h-3" />
                    <span>Suggested Shift: Depart at {formatClockTime(alt.suggestedDepartureTime)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
