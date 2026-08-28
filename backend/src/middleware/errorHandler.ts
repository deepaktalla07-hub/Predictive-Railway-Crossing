import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string = 'INTERNAL_ERROR',
    public details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const code = 'code' in err ? err.code : 'INTERNAL_SERVER_ERROR';
  const isProduction = config.NODE_ENV === 'production';

  // Server-side logging only
  if (statusCode >= 500) {
    console.error(`[Internal Server Error] ${code} (${statusCode}):`, err.message);
  } else {
    console.warn(`[Client Error] ${code} (${statusCode}):`, err.message);
  }

  // Sanitize user-facing message in production for 500 errors to prevent leaking system details
  const clientMessage =
    statusCode >= 500 && isProduction
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'An unexpected error occurred.';

  const clientDetails = isProduction && statusCode >= 500 ? undefined : 'details' in err ? err.details : undefined;

  res.status(statusCode).json({
    status: 'ERROR',
    code,
    message: clientMessage,
    details: clientDetails,
    timestamp: new Date().toISOString()
  });
}
