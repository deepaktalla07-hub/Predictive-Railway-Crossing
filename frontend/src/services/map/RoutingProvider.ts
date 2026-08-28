import { RouteAnalysisRequest, RouteAnalysisResponse } from '@railway-gate/shared';
import { IRoutingProvider } from './interfaces';
import { routeApi } from '../api';

export class ClientRoutingProvider implements IRoutingProvider {
  public readonly providerName = 'Railway Gate Route Assistant Orchestrator';

  public async analyzeJourney(request: RouteAnalysisRequest): Promise<RouteAnalysisResponse> {
    return routeApi.analyzeRoute(request);
  }
}

export const defaultRoutingProvider = new ClientRoutingProvider();
