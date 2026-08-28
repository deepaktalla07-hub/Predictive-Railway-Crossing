import { Router } from 'express';
import { SystemController } from '../../controllers/system.controller';

export function createSystemRoutes(): Router {
  const router = Router();
  const controller = new SystemController();

  router.get('/health', controller.getHealth);
  router.get('/safety', controller.getSafetyMandate);
  router.get('/sources', controller.getSources);

  return router;
}
