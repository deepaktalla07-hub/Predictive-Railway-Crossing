import { BoundingBox, GeoJsonLineString, RailwayCrossingRecord } from '@railway-gate/shared';
import { GetCrossingsOptions, IRailwayCrossingProvider } from '../providers/railway/IRailwayCrossingProvider';

export class CrossingRepository {
  constructor(private provider: IRailwayCrossingProvider) {}

  public async getAll(options?: GetCrossingsOptions): Promise<RailwayCrossingRecord[]> {
    return this.provider.getCrossings(options);
  }

  public async findById(id: string): Promise<RailwayCrossingRecord | null> {
    return this.provider.getCrossingById(id);
  }

  public async findNearRoute(
    route: GeoJsonLineString,
    bufferMeters = 80
  ): Promise<RailwayCrossingRecord[]> {
    return this.provider.findCrossingsNearRoute(route, bufferMeters);
  }

  public async findCrossingsInCorridor(
    bbox: BoundingBox,
    _routePolyline?: GeoJsonLineString
  ): Promise<RailwayCrossingRecord[]> {
    return this.provider.getCrossings({ bbox });
  }
}
