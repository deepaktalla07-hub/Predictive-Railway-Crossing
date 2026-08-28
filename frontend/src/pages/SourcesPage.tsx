import React from 'react';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { ShieldCheck, Database, Server, CheckCircle2 } from 'lucide-react';

export const SourcesPage: React.FC = () => {
  const { data: health } = useSystemHealth();

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6 text-slate-200">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-blue-400" />
        <div>
          <h2 className="text-xl font-bold text-white">System Architecture & Data Provenance</h2>
          <p className="text-xs text-slate-400">
            Real-time transparency, licensing, and zero-fabrication verification policy
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {health?.sources.map((src) => (
          <div key={src.sourceKey} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{src.name}</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded">
                {src.operationalStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400">{src.notes}</p>
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Coverage: {src.coverageArea}</span>
              <span>Latency: {src.latencyMs}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
