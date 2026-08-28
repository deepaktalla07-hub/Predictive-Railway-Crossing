import { Request, Response, NextFunction } from 'express';
import { CrossingRepository } from '../repositories/crossing.repository';
import { CommunityService } from '../services/community.service';
import { AppError } from '../middleware/errorHandler';

export class CrossingController {
  constructor(
    private crossingRepo: CrossingRepository,
    private communityService: CommunityService
  ) {}

  public getCrossings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { minLat, minLng, maxLat, maxLng, limit, offset } = req.query;

      let bbox;
      if (minLat && minLng && maxLat && maxLng) {
        bbox = {
          minLat: parseFloat(minLat as string),
          minLng: parseFloat(minLng as string),
          maxLat: parseFloat(maxLat as string),
          maxLng: parseFloat(maxLng as string)
        };
      }

      const crossings = await this.crossingRepo.getAll({
        bbox,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0
      });

      res.json({
        status: 'SUCCESS',
        count: crossings.length,
        data: crossings
      });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const crossing = await this.crossingRepo.findById(id);
      if (!crossing) {
        throw new AppError(404, 'Level crossing not found', 'NOT_FOUND');
      }
      res.json({ status: 'SUCCESS', data: crossing });
    } catch (err) {
      next(err);
    }
  };

  public getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const crossing = await this.crossingRepo.findById(id);
      if (!crossing) {
        throw new AppError(404, 'Level crossing not found', 'NOT_FOUND');
      }

      const communityStatus = await this.communityService.getConsensusStatus(id);

      res.json({
        status: 'SUCCESS',
        crossingId: id,
        liveStatus: communityStatus || {
          currentStatus: 'OPEN',
          confidence: 0.8,
          lastUpdated: new Date().toISOString(),
          source: 'System Baseline Timetable'
        }
      });
    } catch (err) {
      next(err);
    }
  };
}
