import React, { useState } from 'react';
import { CrossingRiskDetail, RiskLevel } from '@railway-gate/shared';
import { formatDistance, formatDuration, formatClockTime } from '../../utils/formatters';
import { RiskGauge } from '../prediction/RiskGauge';
import { ProvenanceBadge } from './ProvenanceBadge';
import { ClosureTimeline } from './ClosureTimeline';
import {
  Train,
  Car,
  Clock,
  Navigation,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Shield,
  ShieldAlert,
  Radio,
  Timer,
  Layers
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface CrossingCardProps {
  crossing: CrossingRiskDetail;
  isExpandedDefault?: boolean;
}

export const CrossingCard: React.FC<CrossingCardProps> = ({
  crossing,
  isExpandedDefault = false
}) => {
  const [isExpanded, setIsExpanded] = useState(isExpandedDefault);
  const setIsReportModalOpen = useAppStore((s) => s.setIsReportModalOpen);
  const setSelectedCrossing = useAppStore((s) => s.setSelectedCrossing);

  const primaryEvent = crossing.predictedTrainEvents[0];
  const userArrival = crossing.userEtaAtCrossing;
  const isUnknown = crossing.riskEvaluation.riskLevel === RiskLevel.UNKNOWN;

  // Calculate Time Difference / Wait Time
  const timeDifferenceSeconds = primaryEvent?.temporalOverlapSeconds || 0;
  const timeDifferenceDisplay =
    timeDifferenceSeconds > 0
      ? `-${Math.ceil(timeDifferenceSeconds / 60)} min gate conflict`
      : isUnknown
      ? 'Unverified Timing'
      : '+0 min (Clear Passage)';

  // Calculate Last Updated Time
  const lastUpdatedDisplay = crossing.provenance.lastSyncedAt
    ? formatClockTime(crossing.provenance.lastSyncedAt)
    : 'Live Stream';

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        crossing.riskEvaluation.riskLevel === RiskLevel.HIGH_RISK_BLOCK
          ? 'bg-slate-900/90 border-rose-500/40 shadow-lg shadow-rose-950/20'
          : crossing.riskEvaluation.riskLevel === RiskLevel.MODERATE_WARNING
          ? 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-950/20'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Card Header Summary */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 cursor-pointer flex flex-col gap-3 select-none"
      >
        {/* Top Meta: Crossing Name + Risk Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border shadow-md flex-shrink-0 ${
                crossing.isGradeSeparated
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : crossing.riskEvaluation.riskLevel === RiskLevel.HIGH_RISK_BLOCK
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : crossing.riskEvaluation.riskLevel === RiskLevel.MODERATE_WARNING
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
              }`}
            >
              {crossing.isGradeSeparated ? '🌉' : '🛤️'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-white tracking-tight leading-tight">
                  {crossing.name}
                </h4>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                <span className="font-mono text-slate-300 font-semibold bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700">
                  {crossing.crossingCode}
                </span>
                <span>•</span>
                <span className="text-slate-300">
                  Distance: <b className="text-white font-mono">{formatDistance(crossing.distanceFromRouteStartMeters)}</b>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <RiskGauge
              score={crossing.riskEvaluation.riskScore}
              level={crossing.riskEvaluation.riskLevel}
              size="sm"
              showBar={false}
            />
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-white transition-colors"
              aria-label={isExpanded ? 'Collapse card' : 'Expand card'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 9 Required Fields Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
          {/* 1. Train Information */}
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Train className="w-3 h-3 text-amber-400" />
              Train Info:
            </span>
            <span className="font-semibold text-slate-100 truncate">
              {primaryEvent ? `${primaryEvent.trainNumber} (${primaryEvent.trainName.split(' ')[0]})` : isUnknown ? 'Unknown (Missing)' : 'No Train Near'}
            </span>
          </div>

          {/* 2. Predicted Train Crossing Time */}
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-rose-400" />
              Predicted Gate:
            </span>
            <span className="font-mono font-bold text-rose-400">
              {primaryEvent
                ? `${formatClockTime(primaryEvent.gateClosureWindow.closeStartTime)} - ${formatClockTime(primaryEvent.gateClosureWindow.reopenTime)}`
                : isUnknown
                ? '--:--'
                : 'Open'}
            </span>
          </div>

          {/* 3. User Arrival Time */}
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Car className="w-3 h-3 text-blue-400" />
              User Arrival:
            </span>
            <span className="font-mono font-bold text-blue-400">
              {formatClockTime(userArrival.arrivalTime)}
            </span>
          </div>

          {/* 4. Time Difference / Wait Window */}
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Timer className="w-3 h-3 text-purple-400" />
              Time Difference:
            </span>
            <span
              className={`font-mono font-bold ${
                timeDifferenceSeconds > 0
                  ? 'text-rose-400'
                  : isUnknown
                  ? 'text-slate-400'
                  : 'text-emerald-400'
              }`}
            >
              {timeDifferenceDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Deep Inspection Drawer */}
      {isExpanded && (
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col gap-3.5 text-xs animate-in fade-in duration-200">
          {/* Summary Alert */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              crossing.riskEvaluation.riskLevel === RiskLevel.HIGH_RISK_BLOCK
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                : crossing.riskEvaluation.riskLevel === RiskLevel.MODERATE_WARNING
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : isUnknown
                ? 'bg-slate-800/40 border-slate-700 text-slate-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            }`}
          >
            <AlertOctagon className="w-4 h-4 flex-shrink-0 mt-0.5 text-current" />
            <div className="leading-relaxed">
              <b>Recommendation:</b> {crossing.riskEvaluation.summary}
            </div>
          </div>

          {/* Visual Closure Timeline */}
          <ClosureTimeline crossing={crossing} />

          {/* Data Source & Last Updated Time Row */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Data Source:</span>
              <ProvenanceBadge provenance={crossing.provenance} />
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <span>Last Synced:</span>
              <span className="font-mono text-slate-200 font-semibold">{lastUpdatedDisplay}</span>
            </div>
          </div>

          {/* Safety Disclaimer Callout */}
          <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-[10px] text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Predictions are estimates. Never cross based solely on this tool. Always obey railway signals & barriers.</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setSelectedCrossing(crossing);
                setIsReportModalOpen(true);
              }}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
            >
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              Report Live Spot Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
