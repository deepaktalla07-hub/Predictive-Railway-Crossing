import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  ShieldAlert,
  X,
  AlertTriangle,
  CheckCircle2,
  TrafficCone,
  Compass,
  FileText
} from 'lucide-react';
import { SAFETY_AND_TRANSPARENCY_MANDATE } from '@railway-gate/shared';

export const SafetyTransparencyModal: React.FC = () => {
  const { isSafetyModalOpen, setIsSafetyModalOpen } = useAppStore();

  if (!isSafetyModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Safety & Transparency Notice</h3>
              <p className="text-xs text-slate-400">Essential road user safety guidance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSafetyModalOpen(false)}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-4 text-xs">
          {/* Main Warning Box */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Predictions Are Estimates</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              <b>{SAFETY_AND_TRANSPARENCY_MANDATE.ESTIMATE_NOTICE}</b> Train operations, signals, emergency stops, track maintenance, and road traffic conditions can change unpredictably.
            </p>
          </div>

          {/* Mandatory Safety Instructions */}
          <div className="flex flex-col gap-2.5">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <TrafficCone className="w-3.5 h-3.5 text-blue-400" />
              <span>Mandatory Safety Rules: Users Must Always Follow</span>
            </h4>
            <div className="flex flex-col gap-2">
              {[
                { title: 'Railway Signals', desc: 'Trackside flashing red warning lights, audible bells, and train horn signals.' },
                { title: 'Physical Barriers & Gates', desc: 'Lowered barriers, lifting booms, and mechanical interlocking gates.' },
                { title: 'Road Traffic Signals', desc: 'Intersection stop lights and road signs preceding railway approaches.' },
                { title: 'Official Railway Instructions', desc: 'Direct instructions from gatemen, station masters, and railway police personnel.' },
                { title: 'Local Traffic Rules', desc: 'Safe stopping distances, no-overtaking zones, and local speed limits.' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">{item.title}: </span>
                    <span className="text-slate-300">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Warning: Never Cross on App Prediction Alone */}
          <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-rose-200 text-sm">Critical Warning</span>
              <p className="text-rose-300 leading-relaxed">
                <b>{SAFETY_AND_TRANSPARENCY_MANDATE.CRITICAL_CROSSING_RULE}</b> Always physically inspect track conditions and wait for signals and barriers to fully clear.
              </p>
            </div>
          </div>

          {/* System Purpose & Role Declaration */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-start gap-3">
            <Compass className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-slate-200">System Purpose & Scope</span>
              <p className="text-slate-400 leading-relaxed">
                {SAFETY_AND_TRANSPARENCY_MANDATE.SYSTEM_ROLE_DECLARATION} This service does not replace official signalling or physical railway controls.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setIsSafetyModalOpen(false)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all cursor-pointer text-xs"
          >
            I Understand & Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
