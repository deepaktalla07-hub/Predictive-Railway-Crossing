import axios from 'axios';
import {
  GateReportRequest,
  GateReportResponse,
  LiveTrainPositionResult,
  LiveTrainStatusResult,
  RailwayCrossing,
  RouteAnalysisRequest,
  RouteAnalysisResponse,
  SystemHealthResponse,
  TrainETAResult,
  TrainRouteResult,
  TrainScheduleResult,
  TrainCrossingPredictionResult
} from '@railway-gate/shared';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  'http://localhost:5001/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const routeApi = {
  analyzeRoute: async (request: RouteAnalysisRequest): Promise<RouteAnalysisResponse> => {
    const response = await apiClient.post<RouteAnalysisResponse>('/routes/analyze', request);
    return response.data;
  }
};

export const crossingApi = {
  getCrossings: async (params?: { minLat?: number; minLng?: number; maxLat?: number; maxLng?: number; limit?: number }) => {
    const response = await apiClient.get<{ status: string; count: number; data: RailwayCrossing[] }>('/crossings', { params });
    return response.data;
  },

  getCrossing: async (id: string): Promise<RailwayCrossing> => {
    const response = await apiClient.get<{ status: string; data: RailwayCrossing }>(`/crossings/${id}`);
    return response.data.data;
  },

  getCrossingStatus: async (id: string) => {
    const response = await apiClient.get(`/crossings/${id}/status`);
    return response.data;
  }
};

export const trainApi = {
  getTrainStatus: async (trainNumber: string): Promise<LiveTrainStatusResult> => {
    const response = await apiClient.get<{ status: string; data: LiveTrainStatusResult }>(`/trains/${trainNumber}/status`);
    return response.data.data;
  },

  getTrainPosition: async (trainNumber: string): Promise<LiveTrainPositionResult> => {
    const response = await apiClient.get<{ status: string; data: LiveTrainPositionResult }>(`/trains/${trainNumber}/position`);
    return response.data.data;
  },

  getTrainRoute: async (trainNumber: string): Promise<TrainRouteResult> => {
    const response = await apiClient.get<{ status: string; data: TrainRouteResult }>(`/trains/${trainNumber}/route`);
    return response.data.data;
  },

  getTrainSchedule: async (trainNumber: string): Promise<TrainScheduleResult> => {
    const response = await apiClient.get<{ status: string; data: TrainScheduleResult }>(`/trains/${trainNumber}/schedule`);
    return response.data.data;
  },

  getTrainETA: async (trainNumber: string, targetStationOrCrossing: string): Promise<TrainETAResult> => {
    const response = await apiClient.get<{ status: string; data: TrainETAResult }>(`/trains/${trainNumber}/eta/${targetStationOrCrossing}`);
    return response.data.data;
  },

  predictCrossing: async (trainNumber: string, crossingId: string): Promise<TrainCrossingPredictionResult> => {
    const response = await apiClient.get<{ status: string; data: TrainCrossingPredictionResult }>(`/trains/${trainNumber}/predict-crossing/${crossingId}`);
    return response.data.data;
  }
};

export const communityApi = {
  submitReport: async (report: GateReportRequest): Promise<GateReportResponse> => {
    const response = await apiClient.post<GateReportResponse>('/community/reports', report);
    return response.data;
  }
};

export const systemApi = {
  getHealth: async (): Promise<SystemHealthResponse> => {
    const response = await apiClient.get<SystemHealthResponse>('/system/health');
    return response.data;
  },

  getSources: async () => {
    const response = await apiClient.get('/system/sources');
    return response.data;
  }
};
