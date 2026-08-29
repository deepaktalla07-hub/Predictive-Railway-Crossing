import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSystemHealth } from '../../hooks/useSystemHealth';
import { ShieldAlert, ShieldCheck, Server, Train, AlertTriangle } from 'lucide-react';

export const Header: React.FC = () => {
  const { setIsProvenanceModalOpen, setIsSourcesModalOpen, setIsSafetyModalOpen } = useAppStore();
  const { data: health } = useSystemHealth();

  return (
    <header className="h-14 px-4 sm:px-6 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between z-20 shadow-xl">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 flex-shrink-0">
          <Train className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
              RailRoute Assistant
            </h1>
            <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold rounded">
              COCKPIT
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Delay-Free Level Crossing Navigation Assistant
          </p>
        </div>
      </div>

      {/* Center Safety Notice Banner */}
      <div
        onClick={() => setIsSafetyModalOpen(true)}
        className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold rounded-full transition-colors cursor-pointer"
        title="View Safety & Transparency Requirements"
      >
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>Predictions are estimates. Always obey railway signals & barriers.</span>
      </div>

      {/* Right Controls & Provenance/Status Badges */}
      <div className="flex items-center gap-2">
        {/* Safety & Legal Notice Button */}
        <button
          type="button"
          onClick={() => setIsSafetyModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          title="Safety Requirements & Legal Disclaimers"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Safety Notice</span>
        </button>

        {/* System Health Pill */}
        <button
          type="button"
          onClick={() => setIsSourcesModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 transition-colors cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="hidden sm:inline font-medium">Provider:</span>
          <span className="font-mono text-emerald-400 font-bold">
            {health?.status || 'HEALTHY'}
          </span>
        </button>

        {/* Provenance & Integrity Policy Button */}
        <button
          type="button"
          onClick={() => setIsProvenanceModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span className="hidden md:inline">Data Integrity</span>
        </button>
      </div>
    </header>
  );
};
