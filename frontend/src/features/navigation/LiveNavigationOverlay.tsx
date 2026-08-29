import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatDistance, formatDuration, formatClockTime } from '../../utils/formatters';
import { Coordinate, CrossingRiskDetail, RiskLevel } from '@railway-gate/shared';
import {
  Navigation,
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  FastForward,
  Compass,
  Volume2,
  VolumeX,
  Train,
  CheckCircle,
  LocateFixed,
  Car
} from 'lucide-react';

function haversineMeters(c1: Coordinate, c2: Coordinate): number {
  const R = 6371000;
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface LiveNavigationOverlayProps {
  onVehicleMove?: (coord: Coordinate, heading: number) => void;
  onCenterVehicle?: (coord: Coordinate) => void;
}

export const LiveNavigationOverlay: React.FC<LiveNavigationOverlayProps> = ({
  onVehicleMove,
  onCenterVehicle
}) => {
  const {
    analysisResult,
    selectedAlternativeId,
    destinationLabel,
    stopNavigation,
    updateNavTelemetry,
    vehicleCoord
  } = useAppStore();

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [hasReachedDestination, setHasReachedDestination] = useState<boolean>(false);

  const activeRoute =
    analysisResult?.alternativeRoutes.find((a) => a.id === selectedAlternativeId) ||
    analysisResult?.primaryRoute;

  const rawCoordinates = activeRoute?.polylineGeoJSON?.coordinates || [];
  // Convert [lng, lat] to Coordinate[]
  const routePoints: Coordinate[] = rawCoordinates.map(([lng, lat]) => ({ lat, lng }));
  const totalDistance = activeRoute?.distanceMeters || 10000;
  const totalDuration = activeRoute?.durationSeconds || 900;
  const crossings: CrossingRiskDetail[] = analysisResult?.primaryRoute?.crossings || [];

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());

  // Calculate vehicle position along route based on progress (0 to 1)
  const getInterpolatedPosition = (t: number) => {
    if (routePoints.length < 2) return { coord: routePoints[0] || { lat: 0, lng: 0 }, heading: 0, index: 0 };
    const totalSegments = routePoints.length - 1;
    const currentFraction = Math.max(0, Math.min(1, t)) * totalSegments;
    const index = Math.min(Math.floor(currentFraction), totalSegments - 1);
    const segmentT = currentFraction - index;

    const p1 = routePoints[index];
    const p2 = routePoints[index + 1];

    const lat = p1.lat + (p2.lat - p1.lat) * segmentT;
    const lng = p1.lng + (p2.lng - p1.lng) * segmentT;

    // Calculate heading (bearing) angle in degrees
    const y = Math.sin((p2.lng - p1.lng) * (Math.PI / 180)) * Math.cos(p2.lat * (Math.PI / 180));
    const x =
      Math.cos(p1.lat * (Math.PI / 180)) * Math.sin(p2.lat * (Math.PI / 180)) -
      Math.sin(p1.lat * (Math.PI / 180)) *
        Math.cos(p2.lat * (Math.PI / 180)) *
        Math.cos((p2.lng - p1.lng) * (Math.PI / 180));
    const heading = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;

    return { coord: { lat, lng }, heading, index };
  };

  // Find next upcoming railway crossing ahead of current vehicle position
  const getNextUpcomingCrossing = (currentCoord: Coordinate, currentProg: number) => {
    const remainingCrossings = crossings.filter((c) => {
      // Find approximate progress of crossing along route
      return c.distanceFromRouteStartMeters >= currentProg * totalDistance - 50;
    });

    if (remainingCrossings.length === 0) return { crossing: null, distanceMeters: null };

    const next = remainingCrossings[0];
    const distMeters = Math.max(
      0,
      Math.round(haversineMeters(currentCoord, next.location))
    );
    return { crossing: next, distanceMeters: distMeters };
  };

  // Animation Loop for Smooth Live Vehicle Movement
  useEffect(() => {
    if (!isPlaying || hasReachedDestination || routePoints.length < 2) return;

    lastTimeRef.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Realistic speed: base duration adjusted by playbackSpeed
      const simDurationSec = Math.max(25, totalDuration / 20); // Compressed for live smooth driving preview
      const step = (deltaSec / simDurationSec) * playbackSpeed;

      setProgress((prev) => {
        const nextProg = prev + step;
        if (nextProg >= 1) {
          setHasReachedDestination(true);
          return 1;
        }
        return nextProg;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, hasReachedDestination, totalDuration, routePoints.length]);

  // Update vehicle position and telemetry on progress changes
  useEffect(() => {
    const { coord, heading } = getInterpolatedPosition(progress);
    const { crossing: nextCross, distanceMeters: distToNextCross } = getNextUpcomingCrossing(coord, progress);

    const remainingDist = Math.round(totalDistance * (1 - progress));
    const remainingDur = Math.round(totalDuration * (1 - progress));
    const speed = Math.round(42 + Math.sin(progress * 10) * 8);

    updateNavTelemetry({
      progress,
      coord,
      heading,
      speedKmh: speed,
      remainingDistance: remainingDist,
      remainingDuration: remainingDur,
      nextCrossing: nextCross,
      distanceToNextCrossing: distToNextCross
    });

    onVehicleMove?.(coord, heading);
  }, [progress]);

  const { coord: currentCoord, heading: currentHeading } = getInterpolatedPosition(progress);
  const { crossing: nextCrossing, distanceMeters: distToNextCrossing } = getNextUpcomingCrossing(
    currentCoord,
    progress
  );

  const remainingDist = Math.round(totalDistance * (1 - progress));
  const remainingDur = Math.round(totalDuration * (1 - progress));
  const etaDate = new Date(Date.now() + remainingDur * 1000);

  const isNextGateHighRisk = nextCrossing?.riskEvaluation.riskLevel === RiskLevel.HIGH;
  const isNextGateModerate = nextCrossing?.riskEvaluation.riskLevel === RiskLevel.MODERATE;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 sm:p-4 font-sans select-none">
      {/* 1. TOP TURN-BY-TURN & RAILWAY CROSSING ALERT BANNER (Google Maps Style) */}
      <div className="w-full max-w-lg mx-auto pointer-events-auto flex flex-col gap-2 animate-in slide-in-from-top-4 duration-300">
        {/* Next Maneuver / Destination Target Card */}
        <div className="bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
              <Navigation
                className="w-6 h-6 text-white transform transition-transform"
                style={{ transform: `rotate(${currentHeading}deg)` }}
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  {hasReachedDestination ? 'Arrived at Destination' : 'Head towards'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate max-w-[240px] sm:max-w-[280px]">
                {hasReachedDestination ? destinationLabel : activeRoute?.summary || destinationLabel}
              </h2>
            </div>
          </div>

          {/* Audio voice mute button */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute Audio' : 'Mute Voice Alerts'}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>

        {/* Dynamic Railway Crossing HUD Warning (if crossing ahead) */}
        {nextCrossing && distToNextCrossing !== null && !hasReachedDestination && (
          <div
            className={`p-3 rounded-2xl border shadow-xl flex items-center justify-between transition-all duration-300 ${
              isNextGateHighRisk
                ? 'bg-rose-950/90 border-rose-500/80 text-rose-100 shadow-rose-950/50'
                : isNextGateModerate
                ? 'bg-amber-950/90 border-amber-500/80 text-amber-100 shadow-amber-950/50'
                : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100 shadow-emerald-950/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isNextGateHighRisk
                    ? 'bg-rose-600 text-white animate-pulse'
                    : isNextGateModerate
                    ? 'bg-amber-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                <Train className="w-5 h-5" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <span>Upcoming Gate: {nextCrossing.name}</span>
                  <span className="text-[10px] opacity-80">({nextCrossing.crossingCode})</span>
                </div>
                <span className="text-xs font-extrabold">
                  {distToNextCrossing < 100
                    ? 'Crossing tracks now!'
                    : `In ${formatDistance(distToNextCrossing)} • ${nextCrossing.riskEvaluation.riskLevel} RISK`}
                </span>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                  isNextGateHighRisk
                    ? 'bg-rose-500 text-white'
                    : isNextGateModerate
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {nextCrossing.riskEvaluation.riskLevel === 'HIGH' ? 'CLOSING' : 'OPEN'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. BOTTOM LIVE NAVIGATION CONTROL BAR (Google Maps Style) */}
      <div className="w-full max-w-lg mx-auto pointer-events-auto flex flex-col gap-2 animate-in slide-in-from-bottom-4 duration-300">
        {/* Destination Reached Banner */}
        {hasReachedDestination && (
          <div className="p-3.5 bg-emerald-600 border border-emerald-400 rounded-2xl shadow-2xl flex items-center justify-between text-white animate-bounce">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle className="w-5 h-5" />
              <span>You have arrived at your destination!</span>
            </div>
            <button
              type="button"
              onClick={stopNavigation}
              className="px-3 py-1 bg-white text-emerald-900 rounded-xl font-extrabold text-xs cursor-pointer shadow"
            >
              Finish
            </button>
          </div>
        )}

        {/* Main Drive HUD Card */}
        <div className="bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-white">
          {/* Main ETA & Metrics Row */}
          <div className="flex items-center justify-between">
            {/* ETA & Remaining Time */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {formatDuration(remainingDur)}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                ({formatDistance(remainingDist)})
              </span>
            </div>

            {/* Arrival Clock Time */}
            <div className="text-right flex flex-col items-end">
              <span className="text-xs text-slate-400 font-medium">ETA</span>
              <span className="text-base sm:text-lg font-black text-white font-mono">
                {formatClockTime(etaDate.toISOString())}
              </span>
            </div>
          </div>

          {/* Route Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          {/* Actions & Simulation Controls Row */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            {/* Simulation Controls: Play/Pause, 1x/2x */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                title={isPlaying ? 'Pause Simulation' : 'Resume Navigation'}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                title="Simulation Speed"
                className="px-2.5 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1 text-xs font-bold text-cyan-400 transition-colors cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>{playbackSpeed}x</span>
              </button>

              {/* Re-center Camera on Car */}
              <button
                type="button"
                onClick={() => onCenterVehicle?.(currentCoord)}
                title="Center Camera on Vehicle"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
              >
                <LocateFixed className="w-4 h-4" />
              </button>
            </div>

            {/* Cancel / Exit Navigation Button (Red X) */}
            <button
              type="button"
              onClick={stopNavigation}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
