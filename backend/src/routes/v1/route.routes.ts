import { Router } from 'express';
import { RouteController, routeAnalysisSchema } from '../../controllers/route.controller';
import { validateBody } from '../../middleware/validation';
import { AppProviders } from '../../providers';
import { CrossingRepository } from '../../repositories/crossing.repository';
import { TrainRepository } from '../../repositories/train.repository';
import { KinematicEngineService } from '../../services/kinematic.service';
import { RiskCalculationService } from '../../services/risk.service';
import { CrossingsService } from '../../services/crossings.service';
import { ReroutingService } from '../../services/rerouting.service';
import { RoutingOrchestrationService } from '../../services/routing.service';

export function createRouteRoutes(providers: AppProviders): Router {
  const router = Router();

  const crossingRepo = new CrossingRepository(providers.crossings);
  const trainRepo = new TrainRepository(providers.trains);
  const kinematicEngine = new KinematicEngineService();
  const riskCalculator = new RiskCalculationService();

  const crossingsService = new CrossingsService(
    crossingRepo,
    trainRepo,
    kinematicEngine,
    riskCalculator
  );

  const reroutingService = new ReroutingService(providers.routing);
  const routingService = new RoutingOrchestrationService(
    providers.routing,
    crossingsService,
    reroutingService
  );

  const controller = new RouteController(routingService);

  router.post('/analyze', validateBody(routeAnalysisSchema), controller.analyze);

  return router;
}
