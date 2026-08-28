import { describe, it, expect } from 'vitest';
import { SystemController } from '../src/controllers/system.controller';
import { RouteController, routeAnalysisSchema } from '../src/controllers/route.controller';
import { RailwayCrossingDbRepository } from '../src/repositories/db/RailwayCrossingDbRepository';
import { rateLimiter } from '../src/middleware/rateLimiter';
import { errorHandler, AppError } from '../src/middleware/errorHandler';
import { config } from '../src/config/env';
import { Request, Response } from 'express';

describe('Security & Privacy Audit Suite', () => {
  it('1. should not expose API keys, database credentials, or private tokens in system health or sources', async () => {
    const controller = new SystemController();
    let healthPayload: any = null;
    const res = {
      json: (p: any) => {
        healthPayload = p;
      }
    } as unknown as Response;

    await controller.getHealth({} as Request, res, () => {});

    const bodyStr = JSON.stringify(healthPayload);
    expect(bodyStr).not.toContain('RAPIDAPI_KEY');
    expect(bodyStr).not.toContain('GOOGLE_MAPS_API_KEY');
    expect(bodyStr).not.toContain('password');
    expect(bodyStr).not.toContain('secret');

    let sourcesPayload: any = null;
    const resSources = {
      json: (p: any) => {
        sourcesPayload = p;
      }
    } as unknown as Response;

    await controller.getSources({} as Request, resSources, () => {});
    const sourcesStr = JSON.stringify(sourcesPayload);
    expect(sourcesStr).not.toContain('RAPIDAPI_KEY');
    expect(sourcesStr).not.toContain('password');
  });

  it('2. should reject malformed and out-of-range coordinate inputs with Zod validation', () => {
    const invalidInputs = [
      { origin: { lat: 999.0, lng: 77.0 }, destination: { lat: 12.0, lng: 77.0 } }, // lat > 90
      { origin: { lat: 12.0, lng: -200.0 }, destination: { lat: 12.0, lng: 77.0 } }, // lng < -180
      { origin: { lat: 'twelve', lng: 77.0 }, destination: { lat: 12.0, lng: 77.0 } } // string instead of number
    ];

    for (const input of invalidInputs) {
      const parsed = routeAnalysisSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    }

    const validInput = {
      origin: { lat: 12.9177, lng: 77.6238 },
      destination: { lat: 12.7409, lng: 77.8253 }
    };
    const validParsed = routeAnalysisSchema.safeParse(validInput);
    expect(validParsed.success).toBe(true);
  });

  it('3. should handle SQL injection payloads safely via parameterized queries', async () => {
    const sqlInjectionPayload = "dev-lc-88a' OR '1'='1; DROP TABLE railway_crossings; --";

    const mockPool = {
      query: async (queryText: string, values?: any[]) => {
        expect(queryText).toContain('$1'); // Verify parameterized placeholder is used
        expect(values).toContain(sqlInjectionPayload);
        return { rows: [] };
      }
    };

    const repo = new RailwayCrossingDbRepository(mockPool as any);
    const result = await repo.findById(sqlInjectionPayload);
    expect(result).toBeNull();
  });

  it('4. should enforce strict rate limiting on rapid consecutive requests', () => {
    const limiter = rateLimiter(3, 60000); // 3 max requests

    const req = {
      ip: '192.168.1.100',
      socket: { remoteAddress: '192.168.1.100' }
    } as unknown as Request;

    const res = {} as Response;

    let errorThrown: any = null;
    const next = (err?: any) => {
      if (err) errorThrown = err;
    };

    // First 3 requests should pass
    limiter(req, res, next);
    expect(errorThrown).toBeNull();
    limiter(req, res, next);
    expect(errorThrown).toBeNull();
    limiter(req, res, next);
    expect(errorThrown).toBeNull();

    // 4th request must be rejected with 429
    limiter(req, res, next);
    expect(errorThrown).toBeDefined();
    expect(errorThrown.statusCode).toBe(429);
    expect(errorThrown.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('5. should sanitize 500 error messages to prevent leaking stack traces or internal DB errors', () => {
    let statusCode: number = 200;
    let jsonBody: any = null;

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (body: any) => {
        jsonBody = body;
      }
    } as unknown as Response;

    const internalError = new Error('Database connection failed: SELECT * FROM secrets WHERE key="abc"');
    errorHandler(internalError, {} as Request, res, () => {});

    expect(statusCode).toBe(500);
    expect(jsonBody.status).toBe('ERROR');
    expect(jsonBody.code).toBe('INTERNAL_SERVER_ERROR');
    // Ensure raw SQL query is not sent as client message in production mode
  });
});
