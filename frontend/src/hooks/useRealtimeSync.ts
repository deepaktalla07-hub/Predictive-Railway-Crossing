import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { routeApi } from '../services/api';
import { RiskLevel, RouteAnalysisResponse } from '@railway-gate/shared';

export interface RealtimeSyncState {
  lastUpdatedSecondsAgo: number;
  isStale: boolean;
  staleWarning: string | null;
  isSyncing: boolean;
  predictionChangeNotice: string | null;
  clearChangeNotice: () => void;
  triggerManualRefresh: () => Promise<void>;
}

export function useRealtimeSync(refreshIntervalSeconds = 25): RealtimeSyncState {
  const {
    analysisResult,
    setAnalysisResult,
    origin,
    destination,
    departureMode,
    customDepartureTime,
    avoidHighRiskGates
  } = useAppStore();

  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState<number>(Date.now());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [predictionChangeNotice, setPredictionChangeNotice] = useState<string | null>(null);

  const prevRiskRef = useRef<RiskLevel | null>(null);

  // Sync timestamp when new analysisResult arrives
  useEffect(() => {
    if (analysisResult?.analyzedAt) {
      const parsed = new Date(analysisResult.analyzedAt).getTime();
      if (!isNaN(parsed)) {
        setLastUpdatedTimestamp(parsed);
      }
    }
  }, [analysisResult]);

  // Dynamic seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - lastUpdatedTimestamp) / 1000));
      setSecondsAgo(diff);
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUpdatedTimestamp]);

  const fetchUpdate = useCallback(async () => {
    if (!analysisResult || !origin || !destination) return;
    if (document.visibilityState !== 'visible') return; // Pause polling when tab is inactive

    setIsSyncing(true);
    try {
      const departureTime =
        departureMode === 'NOW' ? new Date().toISOString() : customDepartureTime;

      const freshResult = await routeApi.analyzeRoute({
        origin,
        destination,
        departureTime,
        avoidHighRiskGates,
        crossingBufferMeters: 80
      });

      // Detect Prediction Changes
      const oldRisk = analysisResult.primaryRoute.riskSummary.overallRiskLevel;
      const newRisk = freshResult.primaryRoute.riskSummary.overallRiskLevel;

      if (oldRisk !== newRisk) {
        setPredictionChangeNotice(
          `Prediction Updated: Overall risk changed from ${oldRisk} to ${newRisk}.`
        );
      }

      setAnalysisResult(freshResult);
      setLastUpdatedTimestamp(Date.now());
    } catch (err) {
      console.warn('[useRealtimeSync] Periodic sync throttled or network issue:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [analysisResult, origin, destination, departureMode, customDepartureTime, avoidHighRiskGates, setAnalysisResult]);

  // Periodic Polling
  useEffect(() => {
    if (!analysisResult) return;

    const interval = setInterval(() => {
      fetchUpdate();
    }, refreshIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [fetchUpdate, analysisResult, refreshIntervalSeconds]);

  const isStale = secondsAgo > 60;
  const staleWarning = isStale ? 'Data may be outdated.' : null;

  return {
    lastUpdatedSecondsAgo: secondsAgo,
    isStale,
    staleWarning,
    isSyncing,
    predictionChangeNotice,
    clearChangeNotice: () => setPredictionChangeNotice(null),
    triggerManualRefresh: fetchUpdate
  };
}
