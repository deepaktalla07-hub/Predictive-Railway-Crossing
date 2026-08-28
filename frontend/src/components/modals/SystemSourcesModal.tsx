import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSystemHealth } from '../../hooks/useSystemHealth';
import { X, Server, Activity, Database, CheckCircle2, AlertTriangle } from 'lucide-react';

export const SystemSourcesModal: React.FC = () => {
  const { isSourcesModalOpen, setIsSourcesModalOpen } = useAppStore();
  const { data: health, isLoading } = useSystemHealth();

  if (!isSourcesModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">System Health & Connected Data Providers</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsSourcesModalOpen(false)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Status Banner */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-emerald-300">Backend API: {health?.status || 'HEALTHY'}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Uptime: {health?.uptimeSeconds || 0}s | Env: {health?.environment || 'development'}
            </span>
          </div>

          <h4 className="font-bold text-slate-200 mt-1">Configured Subsystem Adapters</h4>

          <div className="flex flex-col gap-2.5">
            {health?.sources.map((src) => (
              <div key={src.sourceKey} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{src.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      src.operationalStatus === 'OPERATIONAL'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {src.operationalStatus}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">{src.notes}</p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-500">
                  <span>Coverage: {src.coverageArea}</span>
                  <span>Latency: {src.latencyMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setIsSourcesModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
