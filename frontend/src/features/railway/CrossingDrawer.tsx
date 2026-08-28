import React from 'react';
import { CrossingRiskDetail } from '@railway-gate/shared';
import { X, Shield, ShieldAlert, Navigation, AlertCircle, Radio, Database, Clock } from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';
import { ClosureTimeline } from './ClosureTimeline';
import { RiskGauge } from '../prediction/RiskGauge';
import { formatDistance, formatDuration, formatClockTime } from '../../utils/formatters';
import { useAppStore } from '../../store/useAppStore';

interface CrossingDrawerProps {
  crossing: CrossingRiskDetail;
  onClose: () => void;
}

export const CrossingDrawer: React.FC<CrossingDrawerProps> = ({ crossing, onClose }) => {
  const setIsReportModalOpen = useAppStore((s) => s.setIsReportModalOpen);

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-md border-l border-slate-800 p-4 overflow-y-auto text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            🛤️
          </span>
          <div>
            <h3 className="font-bold text-sm text-white">{crossing.name}</h3>
            <div className="text-xs text-slate-400 font-mono">{crossing.crossingCode}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 py-4">
        {/* Risk Gauge */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <RiskGauge
            score={crossing.riskEvaluation.riskScore}
            level={crossing.riskEvaluation.riskLevel}
          />
          <p className="mt-2 text-xs text-slate-400">{crossing.riskEvaluation.summary}</p>
        </div>

        {/* Temporal Closure Timeline */}
        <ClosureTimeline crossing={crossing} />

        {/* Infrastructure Details */}
        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex flex-col gap-2 text-xs">
          <span className="font-semibold text-slate-300">Geographic & Asset Attributes</span>
          <div className="grid grid-cols-2 gap-2 text-slate-400">
            <div>
              <span className="text-slate-500">Gate Mechanism:</span>{' '}
              <span className="text-slate-200 font-medium">{crossing.gateType}</span>
            </div>
            <div>
              <span className="text-slate-500">Distance Along Route:</span>{' '}
              <span className="text-slate-200 font-medium">
                {formatDistance(crossing.distanceFromRouteStartMeters)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">ETA from Start:</span>{' '}
              <span className="text-slate-200 font-medium">
                {formatDuration(crossing.userEtaAtCrossing.timeFromDepartureSeconds)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Coordinates:</span>{' '}
              <span className="text-slate-200 font-mono text-[10px]">
                {crossing.location.lat.toFixed(5)}, {crossing.location.lng.toFixed(5)}
              </span>
            </div>
            {crossing.provenance.referenceId && (
              <div>
                <span className="text-slate-500">Source ID:</span>{' '}
                <span className="text-slate-200 font-mono text-[10px]">
                  {crossing.provenance.referenceId}
                </span>
              </div>
            )}
            {crossing.provenance.license && (
              <div>
                <span className="text-slate-500">License:</span>{' '}
                <span className="text-slate-200 font-mono text-[10px]">
                  {crossing.provenance.license}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Data Source & Provenance Badge */}
        <div className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            Data Source:
          </span>
          <ProvenanceBadge provenance={crossing.provenance} />
        </div>

        {/* Safety & Legal Advisory Banner */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-[11px]">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-amber-300">Safety & Legal Notice</span>
            <p className="text-slate-300 leading-snug">
              Predictions are estimates and may be inaccurate. Never cross based solely on app predictions. Always follow railway signals, physical barriers, traffic lights, and official railway instructions.
            </p>
          </div>
        </div>

        {/* Community Report Button */}
        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5 text-blue-400" />
          Report Live Gate Status (Crowdsource)
        </button>
      </div>
    </div>
  );
};
