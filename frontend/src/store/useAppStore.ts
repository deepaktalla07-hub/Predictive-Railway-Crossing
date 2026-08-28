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
  setSystemHealth: (health) => set({ systemHealth: health })
}));
