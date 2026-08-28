import { DataProvenanceType, ProvenanceMetadata } from '@railway-gate/shared';

export class ProvenanceService {
  public static createMetadata(params: {
    sourceType: DataProvenanceType;
    providerName: string;
    confidenceScore: number;
    isRealtime?: boolean;
    notes?: string;
    license?: string;
    referenceId?: string;
  }): ProvenanceMetadata {
    return {
      sourceType: params.sourceType,
      providerName: params.providerName,
      confidenceScore: Math.max(0, Math.min(1, params.confidenceScore)),
      isRealtime: params.isRealtime ?? false,
      lastSyncedAt: new Date().toISOString(),
      notes: params.notes,
      license: params.license,
      referenceId: params.referenceId
    };
  }

  public static isVerified(sourceType: DataProvenanceType): boolean {
    return (
      sourceType === DataProvenanceType.OFFICIAL_RAIL ||
      sourceType === DataProvenanceType.OPEN_GEO_OSM ||
      sourceType === DataProvenanceType.THIRD_PARTY_VERIFIED
    );
  }
}
