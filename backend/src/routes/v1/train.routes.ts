import { Router } from 'express';
import { TrainController } from '../../controllers/train.controller';
import { PredictionController } from '../../controllers/prediction.controller';
import { AppProviders } from '../../providers';
import { TrainRepository } from '../../repositories/train.repository';
import { CrossingRepository } from '../../repositories/crossing.repository';
import { TrainCrossingPredictionEngine } from '../../services/prediction.engine';

export function createTrainRoutes(providers: AppProviders): Router {
  const router = Router();

  const trainRepo = new TrainRepository(providers.trains);
  const crossingRepo = new CrossingRepository(providers.crossings);
  const predictionEngine = new TrainCrossingPredictionEngine(providers.trains);

  const trainController = new TrainController(trainRepo);
  const predictionController = new PredictionController(predictionEngine, crossingRepo);

  router.get('/:trainNumber/status', trainController.getStatus);
  router.get('/:trainNumber/position', trainController.getPosition);
  router.get('/:trainNumber/route', trainController.getRoute);
  router.get('/:trainNumber/schedule', trainController.getSchedule);
  router.get('/:trainNumber/eta/:target', trainController.getETA);
  router.get('/:trainNumber/predict-crossing/:crossingId', predictionController.predictCrossing);

  return router;
}
