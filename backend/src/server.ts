import { createApp } from './app';
import { config } from './config/env';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`🚂 Railway Gate Route Assistant Backend listening on port ${config.PORT}`);
  console.log(`📡 Environment: ${config.NODE_ENV}`);
  console.log(`🗺️  Routing Provider: ${config.ROUTING_PROVIDER}`);
  console.log(`🛤️  Railway Crossing Provider: ${config.RAILWAY_CROSSING_PROVIDER}`);
  console.log(`⏱️  Train Schedule Provider: ${config.TRAIN_SCHEDULE_PROVIDER}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
