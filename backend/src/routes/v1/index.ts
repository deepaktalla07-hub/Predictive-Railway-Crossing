import { Router } from 'express';
import { AppProviders } from '../../providers';
import { createRouteRoutes } from './route.routes';
import { createCrossingRoutes } from './crossing.routes';
import { createTrainRoutes } from './train.routes';
import { createCommunityRoutes } from './community.routes';
import { createSystemRoutes } from './system.routes';

export function createV1Router(providers: AppProviders): Router {
  const router = Router();

  router.use('/routes', createRouteRoutes(providers));
  router.use('/crossings', createCrossingRoutes(providers));
  router.use('/trains', createTrainRoutes(providers));
  router.use('/community', createCommunityRoutes(providers));
  router.use('/system', createSystemRoutes());

  return router;
}
