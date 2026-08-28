import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { defaultProviders } from './providers';
import { createV1Router } from './routes/v1';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';

export function createApp(): Express {
  const app = express();

  // Strip framework identification headers
  app.disable('x-powered-by');

  // 1. Security & Body Parsing Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hidePoweredBy: true,
      hsts: config.NODE_ENV === 'production'
    })
  );

  app.use(
    cors({
      origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(',').map((s) => s.trim()),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 2. Logging & Global Rate Limiting
  if (config.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }
  const globalMaxRequests = config.NODE_ENV === 'development' ? 1000 : 120;
  app.use(rateLimiter(globalMaxRequests, 60000));

  // 3. API V1 Routes
  app.use('/api/v1', createV1Router(defaultProviders));

  // 4. Root Health Check
  app.get('/', (_req, res) => {
    res.json({
      name: 'Railway Gate Route Assistant API',
      status: 'ONLINE',
      version: '1.0.0',
      docs: '/api/v1/system/sources',
      health: '/api/v1/system/health',
      safety: '/api/v1/system/safety'
    });
  });

  // 5. Global Error Handler
  app.use(errorHandler);

  return app;
}
