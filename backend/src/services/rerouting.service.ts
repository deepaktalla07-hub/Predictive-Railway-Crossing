import { AlternativeRouteEngine, GenerateAlternativesParams } from './alternative-route.service';
import { IRoutingProvider } from '../providers/routing/IRoutingProvider';

export class ReroutingService extends AlternativeRouteEngine {
  constructor(routingProvider: IRoutingProvider) {
    super(routingProvider);
  }
}

export * from './alternative-route.service';
