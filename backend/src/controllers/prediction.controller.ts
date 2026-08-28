import { Request, Response, NextFunction } from 'express';
import { TrainCrossingPredictionEngine } from '../services/prediction.engine';
import { CrossingRepository } from '../repositories/crossing.repository';
import { AppError } from '../middleware/errorHandler';

export class PredictionController {
  constructor(
    private predictionEngine: TrainCrossingPredictionEngine,
    private crossingRepo: CrossingRepository
  ) {}

  public predictCrossing = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const trainNumber = Array.isArray(req.params.trainNumber)
        ? req.params.trainNumber[0]
        : req.params.trainNumber;
      const crossingId = Array.isArray(req.params.crossingId)
        ? req.params.crossingId[0]
        : req.params.crossingId;

      if (!trainNumber || !crossingId) {
        throw new AppError(400, 'trainNumber and crossingId are required parameters', 'BAD_REQUEST');
      }

      const crossing = await this.crossingRepo.findById(crossingId);
      if (!crossing) {
        throw new AppError(404, `Railway crossing with ID ${crossingId} not found`, 'NOT_FOUND');
      }

      const result = await this.predictionEngine.predictCrossingEvent({
        crossing,
        trainNumber
      });

      res.json({
        status: 'SUCCESS',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };
}
