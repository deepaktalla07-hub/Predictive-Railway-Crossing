import React from 'react';
import { CrossingRiskDetail } from '@railway-gate/shared';
import { formatClockTime } from '../../utils/formatters';
import { Clock, Train, Car } from 'lucide-react';

interface ClosureTimelineProps {
  crossing: CrossingRiskDetail;
}

export const ClosureTimeline: React.FC<ClosureTimelineProps> = ({ crossing }) => {
  const userArrival = crossing.userEtaAtCrossing;
  const events = crossing.predictedTrainEvents;

  if (events.length === 0) {
    return (
      <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-400">
        No train events scheduled within window of arrival ({formatClockTime(userArrival.arrivalTime)}).
      </div>
    );
  }

  const primaryEvent = events[0];
  const gateWindow = primaryEvent.gateClosureWindow;

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="font-semibold flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          Temporal Gate Closure Timeline
        </span>
        <span className="text-[11px] text-slate-400 font-mono">
          Gate Buffer: {Math.round(gateWindow.durationSeconds / 60)} mins
        </span>
      </div>

      {/* Visual Timeline Bar */}
      <div className="relative pt-6 pb-4">
        {/* Rail Gate Closed Segment */}
        <div className="relative w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
          <div className="absolute left-1/4 right-1/4 h-full bg-rose-500/80 rounded-full flex items-center justify-center">
            <span className="text-[9px] text-white font-bold tracking-wider uppercase">Gate Closed</span>
          </div>
        </div>

        {/* Train Marker Pin */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="px-1.5 py-0.5 bg-amber-500/90 text-slate-950 font-bold text-[10px] rounded shadow flex items-center gap-1">
            <Train className="w-3 h-3" />
            {primaryEvent.trainNumber}
          </div>
          <div className="w-0.5 h-3 bg-amber-400"></div>
        </div>

        {/* User Arrival Pin */}
        <div className="absolute top-0 left-[48%] -translate-x-1/2 flex flex-col items-center">
          <div className="px-1.5 py-0.5 bg-blue-500 text-white font-bold text-[10px] rounded shadow flex items-center gap-1">
            <Car className="w-3 h-3" />
            You
          </div>
          <div className="w-0.5 h-3 bg-blue-400"></div>
        </div>
      </div>

      {/* Detailed Timing Milestones */}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
          <div className="text-slate-500">Gate Closes</div>
          <div className="font-mono font-semibold text-rose-400">
            {formatClockTime(gateWindow.closeStartTime)}
          </div>
        </div>
        <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
          <div className="text-slate-500">Your Arrival</div>
          <div className="font-mono font-semibold text-blue-400">
            {formatClockTime(userArrival.arrivalTime)}
          </div>
        </div>
        <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
          <div className="text-slate-500">Gate Reopens</div>
          <div className="font-mono font-semibold text-emerald-400">
            {formatClockTime(gateWindow.reopenTime)}
          </div>
        </div>
      </div>

      {primaryEvent.temporalOverlapSeconds > 0 && (
        <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded text-rose-300 text-xs flex items-center justify-between">
          <span>Overlap Conflict Window:</span>
          <span className="font-mono font-bold">{Math.round(primaryEvent.temporalOverlapSeconds / 60)} minutes</span>
        </div>
      )}
    </div>
  );
};
