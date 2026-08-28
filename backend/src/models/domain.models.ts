import {
  Coordinate,
  RailwayCrossingRecord,
  CrossingGateType
} from '@railway-gate/shared';

export class LevelCrossingEntity {
  public id: string;
  public crossingCode: string;
  public name: string | null;
  public latitude: number;
  public longitude: number;
  public roadName: string | null;
  public railwayLine: string | null;
  public source: string;
  public sourceId: string;
  public lastUpdated: string;
  public gateType: CrossingGateType;
  public preClosureBufferSeconds: number;
  public postClearanceBufferSeconds: number;
  public averageClosureDurationSeconds: number;
  public isGradeSeparated: boolean;
  public tracksCount: number | null;
  public confidenceScore: number;
  public provenance: RailwayCrossingRecord['provenance'];

  constructor(data: RailwayCrossingRecord) {
    this.id = data.id;
    this.crossingCode = data.crossingCode;
    this.name = data.name;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.roadName = data.roadName;
    this.railwayLine = data.railwayLine;
    this.source = data.source;
    this.sourceId = data.sourceId;
    this.lastUpdated = data.lastUpdated;
    this.gateType = data.gateType;
    this.preClosureBufferSeconds = data.preClosureBufferSeconds || 360;
    this.postClearanceBufferSeconds = data.postClearanceBufferSeconds || 120;
    this.averageClosureDurationSeconds = data.averageClosureDurationSeconds || 600;
    this.isGradeSeparated = data.isGradeSeparated || false;
    this.tracksCount = data.tracksCount;
    this.confidenceScore = data.confidenceScore;
    this.provenance = data.provenance;
  }

  public get location(): Coordinate {
    return { lat: this.latitude, lng: this.longitude };
  }

  public toJSON(): RailwayCrossingRecord {
    return {
      id: this.id,
      crossingCode: this.crossingCode,
      name: this.name,
      latitude: this.latitude,
      longitude: this.longitude,
      roadName: this.roadName,
      railwayLine: this.railwayLine,
      source: this.source,
      sourceId: this.sourceId,
      lastUpdated: this.lastUpdated,
      gateType: this.gateType,
      preClosureBufferSeconds: this.preClosureBufferSeconds,
      postClearanceBufferSeconds: this.postClearanceBufferSeconds,
      averageClosureDurationSeconds: this.averageClosureDurationSeconds,
      isGradeSeparated: this.isGradeSeparated,
      tracksCount: this.tracksCount,
      confidenceScore: this.confidenceScore,
      provenance: this.provenance
    };
  }
}
