import { useMutation } from '@tanstack/react-query';
import { routeApi } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { RouteAnalysisRequest } from '@railway-gate/shared';

export function useRouteAnalysis() {
  const {
    origin,
    destination,
    departureMode,
    customDepartureTime,
    avoidHighRiskGates,
    setIsLoading,
    setAnalysisResult,
    setActiveTab
  } = useAppStore();

  const mutation = useMutation({
    mutationFn: async (overrideParams?: Partial<RouteAnalysisRequest>) => {
      const targetOrigin = overrideParams?.origin || origin;
      const targetDestination = overrideParams?.destination || destination;

      if (!targetOrigin || !targetDestination) {
        throw new Error('Please specify both a starting point and destination to find a route.');
      }

      const departureTime =
        overrideParams?.departureTime ||
        (departureMode === 'NOW' ? new Date().toISOString() : customDepartureTime);

      const request: RouteAnalysisRequest = {
        origin: targetOrigin,
        destination: targetDestination,
        departureTime,
        avoidHighRiskGates,
        crossingBufferMeters: 80,
        ...overrideParams
      };

      return routeApi.analyzeRoute(request);
    },
    onMutate: () => {
      setIsLoading(true);
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setIsLoading(false);
      if (data.primaryRoute.crossings.length > 0) {
        setActiveTab('crossings');
      } else {
        setActiveTab('route');
      }
    },
    onError: (error) => {
      setIsLoading(false);
      console.error('Route analysis failed:', error);
    }
  });

  return {
    analyze: (overrideParams?: Partial<RouteAnalysisRequest>) => mutation.mutate(overrideParams),
    analyzeAsync: (overrideParams?: Partial<RouteAnalysisRequest>) => mutation.mutateAsync(overrideParams),
    isPending: mutation.isPending,
    error: mutation.error
  };
}
