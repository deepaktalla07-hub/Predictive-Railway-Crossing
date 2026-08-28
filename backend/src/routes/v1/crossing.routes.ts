import { Router } from 'express';
import { CrossingController } from '../../controllers/crossing.controller';
import { AppProviders } from '../../providers';
import { CrossingRepository } from '../../repositories/crossing.repository';
import { CommunityRepository } from '../../repositories/community.repository';
import { CommunityService } from '../../services/community.service';

export function createCrossingRoutes(providers: AppProviders): Router {
  const router = Router();

  const crossingRepo = new CrossingRepository(providers.crossings);
  const communityRepo = new CommunityRepository();
  const communityService = new CommunityService(communityRepo, crossingRepo);

  const controller = new CrossingController(crossingRepo, communityService);

  router.get('/', controller.getCrossings);
  router.get('/:id', controller.getById);
  router.get('/:id/status', controller.getStatus);

  return router;
}
