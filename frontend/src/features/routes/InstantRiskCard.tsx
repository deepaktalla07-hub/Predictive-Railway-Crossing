import React from 'react';
import { CrossingRiskDetail, AlternativeRouteResult, RiskLevel } from '@railway-gate/shared';
import { formatClockTime, formatDistance } from '../../utils/formatters';
import { useAppStore } from '../../store/useAppStore';
import {
  AlertTriangle,
  Train,
  Car,
  Clock,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';

interface InstantRiskCardProps {
  crossing: CrossingRiskDetail;
  alternative?: AlternativeRouteResult;
}

export const InstantRiskCard: React.FC<InstantRiskCardProps> = ({ crossing, alternative }) => {
  const { setSelectedAlternativeId, setActiveTab, setSelectedCrossing } = useAppStore();

  const primaryEvent = crossing.predictedTrainEvents[0];
  const userArrival = crossing.userEtaAtCrossing;
  const isHighRisk = crossing.riskEvaluation.riskLevel === RiskLevel.HIGH;
  const isModerateRisk = crossing.riskEvaluation.riskLevel === RiskLevel.MODERATE;
  const isClear = crossing.isGradeSeparated || crossing.riskEvaluation.riskLevel === RiskLevel.LOW;

  // Formatted Timings
  const userArrivalClock = userArrival?.arrivalTime
    ? formatClockTime(userArrival.arrivalTime)
    : '8:41 PM';

  const trainCrossingClock = primaryEvent?.estimatedCrossingTime
    ? formatClockTime(primaryEvent.estimatedCrossingTime)
    : '8:42 PM';

  const uncertaintyText = primaryEvent?.uncertaintyBufferSeconds
    ? `± ${Math.round(primaryEvent.uncertaintyBufferSeconds / 60)} min`
    : '± 1 min';

  const timeDiffSec = primaryEvent?.temporalOverlapSeconds || 60;
  const diffMinutes = Math.max(1, Math.round(timeDiffSec / 60));

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-xl ${
        isHighRisk
          ? 'bg-gradient-to-b from-rose-950/40 via-slate-900/90 to-slate-950 border-rose-500/50 shadow-rose-950/30'
          : isModerateRisk
          ? 'bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-950 border-amber-500/50 shadow-amber-950/30'
          : 'bg-slate-900/90 border-slate-800'
      }`}
    >
      {/* 1. Header Banner */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between border-b ${
          isHighRisk
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
            : isModerateRisk
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
            : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 font-bold text-xs">
          {isHighRisk ? (
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
          ) : isModerateRisk ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>Railway Crossing Risk Assessment</span>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] uppercase tracking-wider ${
            isHighRisk
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
              : isModerateRisk
              ? 'bg-amber-500 text-slate-950'
              : 'bg-emerald-500 text-slate-950'
          }`}
        >
          {isHighRisk ? 'HIGH RISK' : isModerateRisk ? 'MODERATE RISK' : 'CLEAR'}
        </span>
      </div>

      {/* 2. Crossing Name & Location Subtitle */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-sm text-white">{crossing.name}</h4>
          <p className="text-[11px] text-slate-400">
            {crossing.crossingCode} • {crossing.gateType.replace(/_/g, ' ')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedCrossing(crossing)}
          className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline"
        >
          View Details
        </button>
      </div>

      {/* 3. Primary 2x2 Telemetry Matrix */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Train Approach Box */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/90 flex flex-col gap-1">
          <div className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1.5">
            <Train className="w-3.5 h-3.5" />
            <span>Train:</span>
          </div>
          <div className="font-extrabold text-xs text-white">
            {primaryEvent ? `${primaryEvent.trainName || 'Train ' + primaryEvent.trainNumber}` : 'Approaching Train'}
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5">
            <span className="text-slate-400">Predicted crossing: </span>
            <span className="font-mono font-bold text-blue-300">{trainCrossingClock} {uncertaintyText}</span>
          </div>
        </div>

        {/* User Arrival Box */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/90 flex flex-col gap-1">
          <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5" />
            <span>Your arrival:</span>
          </div>
          <div className="font-mono font-black text-sm text-white">
            {userArrivalClock}
          </div>
          <div className="text-[11px] text-slate-400">
            Distance: {formatDistance(crossing.distanceFromRouteStartMeters || 10000)}
          </div>
        </div>

        {/* Time Difference Box */}
        <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/90 flex flex-col gap-0.5">
          <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Difference:</span>
          </div>
          <div className="font-mono font-extrabold text-xs text-amber-300">
            {diffMinutes} min gate conflict
          </div>
        </div>

        {/* Risk Evaluation Box */}
        <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/90 flex flex-col gap-0.5">
          <div className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3" />
            <span>Risk:</span>
          </div>
          <div className="font-extrabold text-xs text-rose-300 uppercase">
            {crossing.riskEvaluation.riskLevel}
          </div>
        </div>
      </div>

      {/* 4. Alternative Route Recommendation Callout (If High/Moderate Risk) */}
      {alternative && (isHighRisk || isModerateRisk) && (
        <div className="mx-4 mb-4 p-3.5 bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-950 rounded-xl border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-purple-400 tracking-wider">
                Recommended Alternative:
              </div>
              <div className="font-bold text-xs text-white">
                {alternative.title}
              </div>
              <div className="text-[11px] font-mono text-purple-300 font-semibold mt-0.5">
                {alternative.formattedAdditionalDistance} • {alternative.formattedAdditionalDuration} (Avoids Closed Gate)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedAlternativeId(alternative.id);
              setActiveTab('alternatives');
            }}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <span>Take Detour</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
