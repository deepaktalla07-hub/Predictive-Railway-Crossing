import { Router } from 'express';
import { config } from '../../config/env';
import { CommunityController, communityReportSchema } from '../../controllers/community.controller';
import { validateBody } from '../../middleware/validation';
import { rateLimiter } from '../../middleware/rateLimiter';
import { AppProviders } from '../../providers';
import { CrossingRepository } from '../../repositories/crossing.repository';
import { CommunityRepository } from '../../repositories/community.repository';
import { CommunityService } from '../../services/community.service';

export function createCommunityRoutes(providers: AppProviders): Router {
  const router = Router();

  const crossingRepo = new CrossingRepository(providers.crossings);
  const communityRepo = new CommunityRepository();
  const communityService = new CommunityService(communityRepo, crossingRepo);

  const controller = new CommunityController(communityService);

  // Dedicated rate limiting for community gate status reports (60 / min in dev, 5 / min in production)
  const maxReports = config.NODE_ENV === 'development' ? 60 : 5;
  const reportRateLimiter = rateLimiter(maxReports, 60000);

  router.post('/reports', reportRateLimiter, validateBody(communityReportSchema), controller.submitReport);
  router.get('/crossings/:crossingId/status', controller.getConsensus);

  return router;
}
