import { create } from 'zustand';
import {
  Coordinate,
  CrossingRiskDetail,
  RouteAnalysisResponse,
  SystemHealthResponse
} from '@railway-gate/shared';
import { ActiveTab } from '../types';

interface AppState {
  // Navigation & Route Inputs
  origin: Coordinate;
  destination: Coordinate;
  originLabel: string;
  destinationLabel: string;
  departureMode: 'NOW' | 'CUSTOM';
  customDepartureTime: string; // ISO
  avoidHighRiskGates: boolean;

  // Analysis State
  isLoading: boolean;
  analysisResult: RouteAnalysisResponse | null;
  selectedAlternativeId: string | null; // null for primary

  // Selected details
  selectedCrossing: CrossingRiskDetail | null;
  activeTab: ActiveTab;

  // Modals
  isReportModalOpen: boolean;
  isProvenanceModalOpen: boolean;
  isSourcesModalOpen: boolean;
  isSafetyModalOpen: boolean;
  systemHealth: SystemHealthResponse | null;

  // Live Turn-by-Turn Navigation State
  isNavigating: boolean;
  navProgress: number; // 0 to 1
  vehicleCoord: Coordinate | null;
  vehicleHeading: number; // degrees
  currentSpeedKmh: number;
  remainingDistanceMeters: number;
  remainingDurationSeconds: number;
  nextCrossing: CrossingRiskDetail | null;
  distanceToNextCrossingMeters: number | null;

  // Actions
  setOrigin: (coord: Coordinate, label?: string) => void;
  setDestination: (coord: Coordinate, label?: string) => void;
  setDepartureMode: (mode: 'NOW' | 'CUSTOM') => void;
  setCustomDepartureTime: (iso: string) => void;
  setAvoidHighRiskGates: (avoid: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setAnalysisResult: (result: RouteAnalysisResponse | null) => void;
  setSelectedAlternativeId: (id: string | null) => void;
  setSelectedCrossing: (crossing: CrossingRiskDetail | null) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setIsReportModalOpen: (open: boolean) => void;
  setIsProvenanceModalOpen: (open: boolean) => void;
  setIsSourcesModalOpen: (open: boolean) => void;
  setIsSafetyModalOpen: (open: boolean) => void;
  setSystemHealth: (health: SystemHealthResponse | null) => void;
  startNavigation: () => void;
  stopNavigation: () => void;
  updateNavTelemetry: (telemetry: {
    progress: number;
    coord: Coordinate;
    heading: number;
    speedKmh: number;
    remainingDistance: number;
    remainingDuration: number;
    nextCrossing: CrossingRiskDetail | null;
    distanceToNextCrossing: number | null;
  }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Default: Bangalore (Silk Board) to Hosur (via LC-88A)
  origin: { lat: 12.9177, lng: 77.6238 },
  destination: { lat: 12.7409, lng: 77.8253 },
  originLabel: 'Silk Board Junction, Bengaluru',
  destinationLabel: 'Hosur Town Center',
  departureMode: 'NOW',
  customDepartureTime: new Date().toISOString(),
  avoidHighRiskGates: true,

  isLoading: false,
  analysisResult: null,
  selectedAlternativeId: null,

  selectedCrossing: null,
  activeTab: 'route',

  isReportModalOpen: false,
  isProvenanceModalOpen: false,
  isSourcesModalOpen: false,
  isSafetyModalOpen: false,
  systemHealth: null,

  // Live Navigation State
  isNavigating: false,
  navProgress: 0,
  vehicleCoord: null,
  vehicleHeading: 0,
  currentSpeedKmh: 45,
  remainingDistanceMeters: 0,
  remainingDurationSeconds: 0,
  nextCrossing: null,
  distanceToNextCrossingMeters: null,

  setOrigin: (coord, label) =>
    set({ origin: coord, originLabel: label || `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}` }),
  setDestination: (coord, label) =>
    set({
      destination: coord,
      destinationLabel: label || `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`
    }),
  setDepartureMode: (mode) => set({ departureMode: mode }),
  setCustomDepartureTime: (iso) => set({ customDepartureTime: iso }),
  setAvoidHighRiskGates: (avoid) => set({ avoidHighRiskGates: avoid }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setAnalysisResult: (result) =>
    set({ analysisResult: result, selectedAlternativeId: null, selectedCrossing: null }),
  setSelectedAlternativeId: (id) => set({ selectedAlternativeId: id }),
  setSelectedCrossing: (crossing) => set({ selectedCrossing: crossing }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsReportModalOpen: (open) => set({ isReportModalOpen: open }),
  setIsProvenanceModalOpen: (open) => set({ isProvenanceModalOpen: open }),
  setIsSourcesModalOpen: (open) => set({ isSourcesModalOpen: open }),
  setIsSafetyModalOpen: (open) => set({ isSafetyModalOpen: open }),
  setSystemHealth: (health) => set({ systemHealth: health }),

  startNavigation: () =>
    set((state) => ({
      isNavigating: true,
      navProgress: 0,
      vehicleCoord: state.origin,
      remainingDistanceMeters: state.analysisResult?.primaryRoute.distanceMeters || 0,
      remainingDurationSeconds: state.analysisResult?.primaryRoute.durationSeconds || 0,
      nextCrossing: state.analysisResult?.primaryRoute.crossings[0] || null
    })),

  stopNavigation: () =>
    set({
      isNavigating: false,
      navProgress: 0,
      vehicleCoord: null
    }),

  updateNavTelemetry: (t) =>
    set({
      navProgress: t.progress,
      vehicleCoord: t.coord,
      vehicleHeading: t.heading,
      currentSpeedKmh: t.speedKmh,
      remainingDistanceMeters: t.remainingDistance,
      remainingDurationSeconds: t.remainingDuration,
      nextCrossing: t.nextCrossing,
      distanceToNextCrossingMeters: t.distanceToNextCrossing
    })
}));
