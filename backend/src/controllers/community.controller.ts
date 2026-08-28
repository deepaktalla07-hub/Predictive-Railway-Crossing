import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CommunityService } from '../services/community.service';
import { GateOperationalStatus } from '@railway-gate/shared';

export const communityReportSchema = z.object({
  crossingId: z.string().min(1, 'Crossing ID is required'),
  status: z.enum(['OPEN', 'CLOSING', 'CLOSED', 'OPENED', 'OPENING']).optional(),
  reportedStatus: z.nativeEnum(GateOperationalStatus).optional(),
  approximateLocation: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    })
    .optional(),
  reporterCoordinate: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    })
    .optional(),
  timestamp: z.string().optional(),
  notes: z.string().max(250).optional()
}).refine((data) => data.status !== undefined || data.reportedStatus !== undefined, {
  message: 'Either status or reportedStatus must be provided'
});

export class CommunityController {
  constructor(private communityService: CommunityService) {}

  public submitReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress;
      const result = await this.communityService.submitReport(req.body, clientIp);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  public getConsensus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const crossingId = String(req.params.crossingId);
      const consensus = await this.communityService.getConsensusStatus(crossingId);

      if (!consensus) {
        res.status(404).json({
          success: false,
          message: `No active community reports found for crossing ${crossingId}`
        });
        return;
      }

      res.json(consensus);
    } catch (err) {
      next(err);
    }
  };
}
