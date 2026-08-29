import React from 'react';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { RefreshCw, AlertTriangle, Bell, Clock } from 'lucide-react';

export const RealtimeSyncBar: React.FC = () => {
  const {
    lastUpdatedSecondsAgo,
    isStale,
    staleWarning,
    isSyncing,
    predictionChangeNotice,
    clearChangeNotice,
    triggerManualRefresh
  } = useRealtimeSync(25);

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Prediction Change Alert Announcement Banner (Solid Opaque) */}
      {predictionChangeNotice && (
        <div className="p-3.5 bg-blue-950 border-2 border-blue-500 rounded-2xl flex items-center justify-between text-blue-100 text-xs shadow-2xl animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-cyan-400 shrink-0 animate-bounce" />
            <span className="font-bold">{predictionChangeNotice}</span>
          </div>
          <button
            type="button"
            onClick={clearChangeNotice}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Status & Freshness Announcement Bar (Solid Opaque) */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 rounded-xl border-2 border-slate-800 text-[11px] text-slate-200 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2 h-2 rounded-full ${
                isSyncing
                  ? 'bg-blue-400 animate-ping'
                  : isStale
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {isSyncing ? (
              <span className="text-blue-400 font-semibold animate-pulse">
                Syncing live telemetry...
              </span>
            ) : (
              <span>Last updated: {lastUpdatedSecondsAgo} seconds ago</span>
            )}
          </div>

          {isStale && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold flex items-center gap-1 text-[10px]">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {staleWarning}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => triggerManualRefresh()}
          disabled={isSyncing}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh real-time train positions and gate predictions"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
};
