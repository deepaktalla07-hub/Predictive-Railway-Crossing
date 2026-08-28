import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Sparkles,
  Search,
  CheckCircle2,
  HelpCircle,
  Train,
  Radio
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

// ==========================================
// 1. Loading State View (Animated Radar)
// ==========================================
export const LoadingStateView: React.FC = () => {
  return (
    <div className="p-6 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center justify-center text-center gap-4 text-slate-200 animate-in fade-in duration-300">
      {/* Radar Pulse Graphic */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping"></div>
        <div className="absolute inset-2 rounded-full border border-blue-400/50 animate-pulse"></div>
        <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/30">
          <Train className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="font-bold text-sm text-white">Analyzing Navigation & Rail Gate Telemetry</h4>
        <p className="text-xs text-slate-400 max-w-xs">
          Scanning road corridors, intersecting railway crossings, and interpolating train arrival windows...
        </p>
      </div>

      {/* Checklist Progress Steps */}
      <div className="flex flex-col gap-1.5 w-full max-w-xs text-[11px] text-left pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Computing driving route coordinates</span>
        </div>
        <div className="flex items-center gap-2 text-blue-400 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          <span>Detecting railway level crossing buffer zones</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
          <span>Calculating kinematic gate closure window</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. Error State View (Retry & Diagnostics)
// ==========================================
interface ErrorStateViewProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorStateView: React.FC<ErrorStateViewProps> = ({
  message = 'Unable to analyze the requested journey. The routing or spatial engine encountered a temporary failure.',
  onRetry
}) => {
  return (
    <div className="p-5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-rose-500/30 shadow-2xl flex flex-col gap-3.5 text-slate-200">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
          <AlertOctagon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-white">Route Analysis Error</h4>
          <span className="text-[10px] text-rose-400 font-mono">ERROR_CODE: ROUTE_PIPELINE_FAILED</span>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Route Calculation</span>
        </button>
      )}
    </div>
  );
};

// ==========================================
// 3. No Route State View
// ==========================================
export const NoRouteStateView: React.FC = () => {
  return (
    <div className="p-6 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center justify-center text-center gap-3 text-slate-200">
      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
        <Search className="w-6 h-6" />
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="font-bold text-sm text-white">No Drivable Route Found</h4>
        <p className="text-xs text-slate-400 max-w-xs">
          No navigable road corridor could be established between the specified start and destination coordinates. Please check locations or select a preset.
        </p>
      </div>
    </div>
  );
};

// ==========================================
// 4. No Railway Crossing State View ("All Clear")
// ==========================================
export const NoCrossingsStateView: React.FC = () => {
  return (
    <div className="p-5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-emerald-500/30 shadow-xl flex flex-col gap-3 text-slate-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold rounded uppercase tracking-wide">
            All Clear • Free Flow
          </span>
          <h4 className="font-bold text-sm text-white mt-0.5">Zero Railway Crossings Encountered</h4>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        This route does not cross any at-grade railway level crossings. Your driving journey is completely free of train-induced gate closures and delay risks.
      </p>
    </div>
  );
};

// ==========================================
// 5. Insufficient Data State View (Unknown Risk)
// ==========================================
export const InsufficientDataStateView: React.FC<{ crossingName?: string }> = ({
  crossingName = 'Approaching Crossing'
}) => {
  const setIsReportModalOpen = useAppStore((s) => s.setIsReportModalOpen);

  return (
    <div className="p-5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-xl flex flex-col gap-3 text-slate-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0">
          <HelpCircle className="w-6 h-6" />
        </div>
        <div>
          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-extrabold rounded uppercase tracking-wide">
            Unknown • Unverified Data
          </span>
          <h4 className="font-bold text-sm text-white mt-0.5">Insufficient Railway Telemetry</h4>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        Railway timetable and telemetry data for <b>{crossingName}</b> is currently unavailable or unverified. In adherence to our data integrity policy, no safe timing assumptions are made.
      </p>

      <button
        type="button"
        onClick={() => setIsReportModalOpen(true)}
        className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
      >
        <Radio className="w-3.5 h-3.5 text-blue-400" />
        <span>Submit Real-Time Gate Report (Crowdsource)</span>
      </button>
    </div>
  );
};
