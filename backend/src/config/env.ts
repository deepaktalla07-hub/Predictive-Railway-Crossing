import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from cwd or project root hierarchy
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });


const envSchema = z.object({
  PORT: z.string().default('5001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5174'),
  LOG_LEVEL: z.string().default('info'),

  // Provider selection
  ROUTING_PROVIDER: z.enum(['DEV_STUB', 'OSRM', 'GOOGLE']).default('DEV_STUB'),
  RAILWAY_CROSSING_PROVIDER: z.enum(['DEV_STUB', 'OSM_OVERPASS', 'POSTGIS']).default('OSM_OVERPASS'),
  TRAIN_SCHEDULE_PROVIDER: z.enum(['DEV_STUB', 'LOCAL_BASELINE', 'RAPIDAPI_LIVE']).default('LOCAL_BASELINE'),

  // Provider URLs & Credentials
  OSRM_BASE_URL: z.string().default('https://router.project-osrm.org'),
  OSM_OVERPASS_URL: z.string().default('https://overpass.kumi.systems/api/interpreter'),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  GTFS_RT_FEED_URL: z.string().optional().default(''),

  // RapidAPI Live Train Status Credentials (Optional, stored strictly on backend)
  RAPIDAPI_KEY: z.string().optional().default(''),
  RAPIDAPI_TRAIN_HOST: z.string().default('irctc1.p.rapidapi.com')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;
