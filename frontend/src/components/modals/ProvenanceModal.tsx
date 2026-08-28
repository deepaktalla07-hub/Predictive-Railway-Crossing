import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, ShieldCheck, CheckCircle2, AlertTriangle, Database, FileText } from 'lucide-react';

export const ProvenanceModal: React.FC = () => {
  const { isProvenanceModalOpen, setIsProvenanceModalOpen } = useAppStore();

  if (!isProvenanceModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-white">Data Provenance & Integrity Guarantee</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsProvenanceModalOpen(false)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs max-h-[75vh] overflow-y-auto">
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-200 leading-relaxed">
            <b>Zero-Fabrication Policy:</b> Every railway coordinate, level crossing barrier state, and train arrival window is derived from verified geospatial feeds or deterministic kinematic formulas with unambiguous provenance labels. No simulated data is passed off as real-time ground truth.
          </div>

          <h4 className="font-bold text-slate-200 mt-1">Data Source Taxonomy</h4>

          <div className="flex flex-col gap-2.5">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400">OpenStreetMap (Overpass API)</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">ODbL License</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Provides authoritative geographic infrastructure, including railway line paths, level crossing coordinates, barrier types, and grade-separated bridges.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-400">OSRM / OpenRouteService Driving Graph</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">Open Source</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Generates road routes, travel duration estimates, step-by-step coordinates, and grade-separated avoidance detours.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-400">Kinematic Trajectory Prediction Engine</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">Internal Algorithmic</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Interpolates train arrival time at intermediate level crossings based on timetable stop sequences, track distances, and barrier pre-closure buffers.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-purple-400">Community Consensus & Geo-Verification</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">Crowdsourced</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Incorporates real-time spot reports with exponential time-decay weighting (10-minute half-life) and 500m proximity geofencing.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setIsProvenanceModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
