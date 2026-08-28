import { Request, Response, NextFunction } from 'express';
import { TrainRepository } from '../repositories/train.repository';
import { AppError } from '../middleware/errorHandler';

export class TrainController {
  constructor(private trainRepo: TrainRepository) {}

  public getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trainNumber = Array.isArray(req.params.trainNumber)
        ? req.params.trainNumber[0]
        : req.params.trainNumber;

      if (!trainNumber) {
        throw new AppError(400, 'Train number is required', 'BAD_REQUEST');
      }

      const status = await this.trainRepo.getTrainStatus(trainNumber);
      res.json({ status: 'SUCCESS', data: status });
    } catch (err) {
      next(err);
    }
  };

  public getPosition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trainNumber = Array.isArray(req.params.trainNumber)
        ? req.params.trainNumber[0]
        : req.params.trainNumber;

      if (!trainNumber) {
        throw new AppError(400, 'Train number is required', 'BAD_REQUEST');
      }

      const position = await this.trainRepo.getTrainPosition(trainNumber);
      res.json({ status: 'SUCCESS', data: position });
    } catch (err) {
      next(err);
    }
  };

  public getRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trainNumber = Array.isArray(req.params.trainNumber)
        ? req.params.trainNumber[0]
        : req.params.trainNumber;

      if (!trainNumber) {
        throw new AppError(400, 'Train number is required', 'BAD_REQUEST');
      }

      const route = await this.trainRepo.getTrainRoute(trainNumber);
      if (!route) {
        throw new AppError(404, `Route for train ${trainNumber} not found`, 'NOT_FOUND');
      }
      res.json({ status: 'SUCCESS', data: route });
    } catch (err) {
      next(err);
    }
  };

  public getSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trainNumber = Array.isArray(req.params.trainNumber)
        ? req.params.trainNumber[0]
        : req.params.trainNumber;

      if (!trainNumber) {
        throw new AppError(400, 'Train number is required', 'BAD_REQUEST');
      }

      const schedule = await this.trainRepo.getTrainSchedule(trainNumber);
      if (!schedule) {
        throw new AppError(404, `Schedule for train ${trainNumber} not found`, 'NOT_FOUND');
      }
      res.json({ status: 'SUCCESS', data: schedule });
    } catch (err) {
      next(err);
    }
  };

  public getETA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trainNumber = Array.isArray(req.params.trainNumber)
        ? req.params.trainNumber[0]
        : req.params.trainNumber;
      const target = Array.isArray(req.params.target) ? req.params.target[0] : req.params.target;

      if (!trainNumber || !target) {
        throw new AppError(400, 'Train number and target station/crossing are required', 'BAD_REQUEST');
      }

      const eta = await this.trainRepo.getTrainETA(trainNumber, target);
      res.json({ status: 'SUCCESS', data: eta });
    } catch (err) {
      next(err);
    }
  };
}
