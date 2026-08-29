import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { config } from '../config/env';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * Determines if the process is running inside a Vercel Serverless Function.
 * In serverless environments, the in-memory rate limiter is not reliable because
 * each cold-start gets a fresh Map and instances do not share memory.
 * Vercel's Edge Config or upstash/ratelimit should be used instead for production rate limiting.
 */
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export function rateLimiter(maxRequests = 120, windowMs = 60000) {
  // Instance-scoped map so each rate limiter middleware instance maintains separate counters
  const ipBuckets = new Map<string, RateLimitRecord>();

  return (req: Request, _res: Response, next: NextFunction) => {
    // In local development mode, bypass rate limiting to prevent throttling during testing & hot reloading
    // In serverless environments, bypass in-memory rate limiting (not reliable across cold starts)
    if (config.NODE_ENV === 'development' || isServerless) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();

    let record = ipBuckets.get(ip);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      ipBuckets.set(ip, record);
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      return next(
        new AppError(
          429,
          'Too many requests. Please slow down and try again shortly.',
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    next();
  };
}

