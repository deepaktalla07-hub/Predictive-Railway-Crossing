import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RoutingOrchestrationService } from '../services/routing.service';

export const routeAnalysisSchema = z.object({
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  destination: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  departureTime: z.string().optional(),
  avoidHighRiskGates: z.boolean().optional().default(true),
  crossingBufferMeters: z.number().min(10).max(500).optional().default(60)
});

export class RouteController {
  constructor(private routingService: RoutingOrchestrationService) {}

  public analyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await this.routingService.analyzeJourney(req.body);
      res.json(response);
    } catch (err) {
      next(err);
    }
  };
}
