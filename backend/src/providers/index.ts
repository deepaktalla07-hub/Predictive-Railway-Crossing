import { config } from '../config/env';
import { IRoutingProvider } from './routing/IRoutingProvider';
import { OsrmRoutingProvider } from './routing/OsrmRoutingProvider';
import { DevStubRoutingProvider } from './routing/DevStubRoutingProvider';
import { IRailwayCrossingProvider } from './railway/IRailwayCrossingProvider';
import { OsmOverpassCrossingProvider } from './railway/OsmOverpassCrossingProvider';
import { DevStubCrossingProvider } from './railway/DevStubCrossingProvider';
import { ITrainDataProvider, ITrainScheduleProvider } from './trains/ITrainDataProvider';
import { RapidApiTrainDataProvider } from './trains/RapidApiTrainDataProvider';
import { LocalBaselineTrainDataProvider } from './trains/LocalBaselineTrainDataProvider';
import { HybridTrainDataProvider } from './trains/HybridTrainDataProvider';
import { DevStubTrainProvider } from './trains/DevStubTrainProvider';

export * from './routing/IRoutingProvider';
export * from './routing/OsrmRoutingProvider';
export * from './routing/DevStubRoutingProvider';
export * from './railway/IRailwayCrossingProvider';
export * from './railway/OsmOverpassCrossingProvider';
export * from './railway/DevStubCrossingProvider';
export * from './railway/CrossingCache';
export * from './trains/ITrainDataProvider';
export * from './trains/RapidApiTrainDataProvider';
export * from './trains/LocalBaselineTrainDataProvider';
export * from './trains/HybridTrainDataProvider';
export * from './trains/DevStubTrainProvider';
export * from './trains/TrainDataCache';

export interface AppProviders {
  routing: IRoutingProvider;
  crossings: IRailwayCrossingProvider;
  trains: ITrainDataProvider;
}

export function createProviders(): AppProviders {
  // 1. Routing Provider
  let routing: IRoutingProvider;
  if (config.ROUTING_PROVIDER === 'OSRM') {
    routing = new OsrmRoutingProvider(config.OSRM_BASE_URL);
  } else {
    routing = new DevStubRoutingProvider();
  }

  // 2. Railway Crossing Provider (Defaults to OsmOverpassCrossingProvider with caching & local verified baseline)
  let crossings: IRailwayCrossingProvider;
  if (config.RAILWAY_CROSSING_PROVIDER === 'DEV_STUB') {
    crossings = new DevStubCrossingProvider();
  } else {
    crossings = new OsmOverpassCrossingProvider();
  }

  // 3. Train Timetable & Live Telemetry Provider
  let trains: ITrainDataProvider;
  if (config.TRAIN_SCHEDULE_PROVIDER === 'DEV_STUB') {
    trains = new DevStubTrainProvider();
  } else {
    trains = new HybridTrainDataProvider(config.RAPIDAPI_KEY, config.RAPIDAPI_TRAIN_HOST);
  }

  return {
    routing,
    crossings,
    trains
  };
}

export const defaultProviders = createProviders();
