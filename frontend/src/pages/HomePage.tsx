import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { MapView } from '../features/map/MapView';
import { RouteControls } from '../features/routes/RouteControls';
import { RouteSummaryCard } from '../features/routes/RouteSummaryCard';
import { AlternativeSelector } from '../features/routes/AlternativeSelector';
import { CrossingDrawer } from '../features/railway/CrossingDrawer';
import { MobileBottomSheet } from '../components/layout/MobileBottomSheet';
import { LiveNavigationOverlay } from '../features/navigation/LiveNavigationOverlay';
import {
  LoadingStateView,
  ErrorStateView,
  NoCrossingsStateView,
  InsufficientDataStateView
} from '../components/common/StateViews';
import { ProvenanceModal } from '../components/modals/ProvenanceModal';
import { ReportModal } from '../components/modals/ReportModal';
import { SafetyTransparencyModal } from '../components/modals/SafetyTransparencyModal';
import { RealtimeSyncBar } from '../components/common/RealtimeSyncBar';
import { SystemSourcesModal } from '../components/modals/SystemSourcesModal';
import { Map, Navigation, Shield, Layers, AlertTriangle } from 'lucide-react';
import { RiskLevel } from '@railway-gate/shared';

export const HomePage: React.FC = () => {
  const {
    analysisResult,
    isLoading,
    selectedCrossing,
    setSelectedCrossing,
    activeTab,
    setActiveTab,
    isNavigating
  } = useAppStore();

  const primary = analysisResult?.primaryRoute;
  const isZeroCrossings = primary && primary.crossings.length === 0;
  const hasUnknownCrossing =
    primary &&
    primary.crossings.some(
      (c) => c.riskEvaluation.riskLevel === RiskLevel.UNKNOWN
    );

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] bg-slate-950 overflow-hidden flex">
      {/* 1. Map View Canvas */}
      <div className="absolute inset-0 z-0">
        <MapView />
      </div>

      {/* Live Fullscreen Navigation HUD Overlay (When Driving) */}
      {isNavigating && <LiveNavigationOverlay />}

      {/* Floating System Provenance Status Pill (Top Center Desktop) - Hidden during Navigation */}
      {!isNavigating && (
        <div className="hidden lg:flex absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="px-3.5 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-full border border-slate-800 shadow-xl flex items-center gap-2 text-xs text-slate-300 pointer-events-auto">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">OSM & Train Telemetry Network</span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-400">Strict Provenance Active</span>
          </div>
        </div>
      )}

      {/* 2. Desktop Floating Split Cockpit (Left Deck) - Hidden during Navigation */}
      {!isNavigating && (
        <div className="hidden md:flex absolute top-4 left-4 z-10 w-full max-w-sm lg:max-w-md max-h-[calc(100vh-6rem)] flex-col gap-3 pointer-events-none">
        {/* Navigation Mode Tabs */}
        {analysisResult && (
          <div className="flex bg-slate-900/95 backdrop-blur-xl p-1 rounded-2xl border border-slate-800/90 shadow-2xl pointer-events-auto">
            <button
              type="button"
              onClick={() => setActiveTab('route')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'route'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Route Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('crossings')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'crossings'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gates ({primary?.crossings.length || 0})
            </button>
            {analysisResult.alternativeRoutes.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('alternatives')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black tracking-wide uppercase transition-all cursor-pointer ${
                  activeTab === 'alternatives'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Detours ({analysisResult.alternativeRoutes.length})
              </button>
            )}
          </div>
        )}

        {/* Scrollable Command Deck Cards */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-1 pointer-events-auto custom-scrollbar">
          {/* Always Visible Route Controls */}
          <RouteControls />

          {/* Real-time Periodic Refresh & Staleness Bar */}
          {analysisResult && <RealtimeSyncBar />}

          {/* Dynamic State Views */}
          {isLoading ? (
            <LoadingStateView />
          ) : analysisResult ? (
            <>
              {/* Tab 1: Route Summary */}
              {activeTab === 'route' && (
                <>
                  {isZeroCrossings && <NoCrossingsStateView />}
                  {hasUnknownCrossing && (
                    <InsufficientDataStateView
                      crossingName={
                        primary?.crossings.find(
                          (c) => c.riskEvaluation.riskLevel === RiskLevel.UNKNOWN
                        )?.name
                      }
                    />
                  )}
                  <RouteSummaryCard />
                </>
              )}

              {/* Tab 2: Crossings List */}
              {activeTab === 'crossings' && !selectedCrossing && (
                <RouteSummaryCard />
              )}

              {/* Tab 3: Alternative Detour Deck */}
              {activeTab === 'alternatives' && <AlternativeSelector />}
            </>
          ) : null}
        </div>
      </div>
      )}

      {/* 3. Mobile Responsive Bottom Sheet Drawer - Hidden during Navigation */}
      {!isNavigating && (
        <MobileBottomSheet
          title={
            analysisResult
              ? `Route: ${primary?.summary.split(' ')[0]} • ${primary?.crossings.length || 0} Gates`
              : 'Find Delay-Free Route'
          }
        >
          <RouteControls />

          {analysisResult && <RealtimeSyncBar />}

          {isLoading ? (
            <LoadingStateView />
          ) : analysisResult ? (
            <>
              {isZeroCrossings && <NoCrossingsStateView />}
              <RouteSummaryCard />
              {analysisResult.alternativeRoutes.length > 0 && <AlternativeSelector />}
            </>
          ) : null}
        </MobileBottomSheet>
      )}

      {/* 4. Selected Crossing Side Drawer (Desktop Drawer Overlay) */}
      {selectedCrossing && (
        <CrossingDrawer
          crossing={selectedCrossing}
          onClose={() => setSelectedCrossing(null)}
        />
      )}

      {/* 5. Modals & Overlays */}
      <ProvenanceModal />
      <ReportModal />
      <SafetyTransparencyModal />
      <SystemSourcesModal />
    </div>
  );
};
