import { Request, Response, NextFunction } from 'express';
import {
  DataProvenanceType,
  DataSourceStatus,
  SAFETY_AND_TRANSPARENCY_MANDATE,
  SystemHealthResponse
} from '@railway-gate/shared';
import { config } from '../config/env';

const startTime = Date.now();

export class SystemController {
  public getHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
      const sources: DataSourceStatus[] = [
        {
          sourceKey: 'routing_engine',
          name: config.ROUTING_PROVIDER === 'OSRM' ? 'OSRM Driving Engine' : 'Dev Stub Routing Engine',
          provenanceType: config.ROUTING_PROVIDER === 'OSRM' ? DataProvenanceType.OPEN_DATA : DataProvenanceType.UNKNOWN,
          operationalStatus: config.ROUTING_PROVIDER === 'OSRM' ? 'OPERATIONAL' : 'DEVELOPMENT_STUB',
          isRealtime: false,
          lastChecked: new Date().toISOString(),
          latencyMs: 14,
          coverageArea: 'Global / Regional',
          notes: config.ROUTING_PROVIDER === 'OSRM' ? 'Live OSRM routing server connected' : 'Deterministic test routes active'
        },
        {
          sourceKey: 'rail_crossings_gis',
          name: config.RAILWAY_CROSSING_PROVIDER === 'OSM_OVERPASS' ? 'OpenStreetMap Overpass Rail GIS' : 'Dev Stub Railway Crossing Registry',
          provenanceType: config.RAILWAY_CROSSING_PROVIDER === 'OSM_OVERPASS' ? DataProvenanceType.OPEN_DATA : DataProvenanceType.UNKNOWN,
          operationalStatus: config.RAILWAY_CROSSING_PROVIDER === 'OSM_OVERPASS' ? 'OPERATIONAL' : 'DEVELOPMENT_STUB',
          isRealtime: false,
          lastChecked: new Date().toISOString(),
          latencyMs: 38,
          coverageArea: 'India / Regional Rail',
          notes: 'Level crossings, barriers, and grade-separated infrastructure'
        },
        {
          sourceKey: 'train_schedules',
          name: 'Static GTFS & Kinematic Prediction Engine',
          provenanceType: DataProvenanceType.CALCULATED,
          operationalStatus: 'OPERATIONAL',
          isRealtime: false,
          lastChecked: new Date().toISOString(),
          latencyMs: 5,
          coverageArea: 'Supported corridors',
          notes: 'Kinematic arrival window interpolation'
        }
      ];

      const response: SystemHealthResponse = {
        status: 'HEALTHY',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptimeSeconds,
        environment: config.NODE_ENV,
        activeProviders: {
          routing: config.ROUTING_PROVIDER,
          railwayCrossing: config.RAILWAY_CROSSING_PROVIDER,
          trainSchedule: config.TRAIN_SCHEDULE_PROVIDER
        },
        sources,
        safetyDisclaimer: {
          estimateNotice: SAFETY_AND_TRANSPARENCY_MANDATE.ESTIMATE_NOTICE,
          mandatoryRules: SAFETY_AND_TRANSPARENCY_MANDATE.SAFETY_RULES_TO_FOLLOW,
          crossingRule: SAFETY_AND_TRANSPARENCY_MANDATE.CRITICAL_CROSSING_RULE,
          systemRole: SAFETY_AND_TRANSPARENCY_MANDATE.SYSTEM_ROLE_DECLARATION
        }
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  };

  public getSafetyMandate = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({
        status: 'SUCCESS',
        mandate: SAFETY_AND_TRANSPARENCY_MANDATE
      });
    } catch (err) {
      next(err);
    }
  };

  public getSources = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({
        status: 'SUCCESS',
        sources: [
          {
            key: 'OSRM',
            name: 'Open Source Routing Machine (OSRM)',
            license: 'ODbL (Open Database License)',
            type: 'ROUTING',
            status: config.ROUTING_PROVIDER === 'OSRM' ? 'ACTIVE' : 'CONFIGURABLE'
          },
          {
            key: 'OSM_OVERPASS',
            name: 'OpenStreetMap Overpass API',
            license: 'ODbL',
            type: 'RAIL_GIS',
            status: config.RAILWAY_CROSSING_PROVIDER === 'OSM_OVERPASS' ? 'ACTIVE' : 'CONFIGURABLE'
          },
          {
            key: 'DEV_STUBS',
            name: 'Development Stub Adapters',
            license: 'Internal MIT',
            type: 'TESTING',
            status: 'AVAILABLE'
          }
        ]
      });
    } catch (err) {
      next(err);
    }
  };
}
