import {
  CommunityConfidenceMetrics,
  CommunityCrossingStatusResult,
  CommunityGateReportRequest,
  Coordinate,
  DataProvenanceType,
  GateOperationalStatus,
  GateReportRequest,
  GateReportResponse,
  UserReportableStatus
} from '@railway-gate/shared';
import { CommunityRepository } from '../repositories/community.repository';
import { CrossingRepository } from '../repositories/crossing.repository';
import { calculateHaversineDistanceMeters, isValidCoordinate } from '../utils/geo.utils';
import { addSeconds, toIsoStringSafe } from '../utils/time.utils';

export interface RateLimitTracker {
  lastReportTime: number;
  reportCountInWindow: number;
  windowStartTime: number;
  lastReportStatus?: string;
}

export class CommunityService {
  private clientRateLimits = new Map<string, RateLimitTracker>();
  private maxGeofenceDistanceMeters = 800; // User must be within 800m of crossing
  private rateLimitWindowMs = 60000;      // 1 minute window
  private maxReportsPerWindow = 3;        // Max 3 reports per minute per client

  constructor(
    private communityRepo: CommunityRepository,
    private crossingRepo: CrossingRepository
  ) {}

  /**
   * Submits and validates a community railway gate status report.
   */
  public async submitReport(
    req: GateReportRequest,
    clientIp?: string
  ): Promise<GateReportResponse> {
    const rawStatus = req.status || req.reportedStatus;
    const normalizedStatus = this.normalizeReportStatus(rawStatus);

    const userCoord = req.approximateLocation || req.reporterCoordinate;

    // 1. Validate Level Crossing Existence
    const crossing = await this.crossingRepo.findById(req.crossingId);
    if (!crossing) {
      return {
        success: false,
        reportId: '',
        crossingId: req.crossingId,
        appliedStatus: GateOperationalStatus.UNKNOWN,
        consensusScore: 0,
        label: 'COMMUNITY REPORTED',
        message: `Level crossing with ID ${req.crossingId} was not found in the verified registry.`,
        expiresAt: new Date().toISOString(),
        disclaimer: 'COMMUNITY REPORTED status. Crowdsourced observation; not an official railway feed.'
      };
    }

    // 2. Validate Approximate Location & Prevent Impossible Coordinates
    if (!userCoord || !isValidCoordinate(userCoord)) {
      return {
        success: false,
        reportId: '',
        crossingId: req.crossingId,
        appliedStatus: GateOperationalStatus.UNKNOWN,
        consensusScore: 0,
        label: 'COMMUNITY REPORTED',
        message: 'Invalid or missing GPS coordinates. Valid approximate location is required for community validation.',
        expiresAt: new Date().toISOString(),
        disclaimer: 'COMMUNITY REPORTED status. Crowdsourced observation; not an official railway feed.'
      };
    }

    // Check for impossible (0, 0) coordinates
    if (Math.abs(userCoord.lat) < 0.0001 && Math.abs(userCoord.lng) < 0.0001) {
      return {
        success: false,
        reportId: '',
        crossingId: req.crossingId,
        appliedStatus: GateOperationalStatus.UNKNOWN,
        consensusScore: 0,
        label: 'COMMUNITY REPORTED',
        message: 'Impossible location detected (Null Island coordinate 0,0). Report rejected.',
        expiresAt: new Date().toISOString(),
        disclaimer: 'COMMUNITY REPORTED status. Crowdsourced observation; not an official railway feed.'
      };
    }

    // 3. Proximity Geofence Validation (Must be sufficiently close to crossing)
    const distanceMeters = calculateHaversineDistanceMeters(userCoord, {
      lat: crossing.latitude,
      lng: crossing.longitude
    });

    if (distanceMeters > this.maxGeofenceDistanceMeters) {
      return {
        success: false,
        reportId: '',
        crossingId: req.crossingId,
        appliedStatus: GateOperationalStatus.UNKNOWN,
        consensusScore: 0,
        label: 'COMMUNITY REPORTED',
        message: `User is ${Math.round(distanceMeters)}m away from crossing. Reports are only accepted within ${this.maxGeofenceDistanceMeters}m for physical verification.`,
        expiresAt: new Date().toISOString(),
        disclaimer: 'COMMUNITY REPORTED status. Crowdsourced observation; not an official railway feed.'
      };
    }

    // 4. Spam, Duplicate & Rate-Limit Prevention
    const clientId = req.reporterSessionId || clientIp || 'anonymous_client';
    const rateLimitCheck = this.checkRateLimitAndDuplicates(clientId, req.crossingId, normalizedStatus);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        reportId: '',
        crossingId: req.crossingId,
        appliedStatus: normalizedStatus,
        consensusScore: 0,
        label: 'COMMUNITY REPORTED',
        message: rateLimitCheck.reason,
        expiresAt: new Date().toISOString(),
        disclaimer: 'COMMUNITY REPORTED status. Crowdsourced observation; not an official railway feed.'
      };
    }

    // Calculate individual report trust weight based on distance
    const distanceWeight = this.calculateDistanceWeight(distanceMeters);

    const ipHash = clientIp
      ? Buffer.from(clientIp).toString('base64').substring(0, 16)
      : clientId.substring(0, 16);

    const savedReport = await this.communityRepo.saveReport(
      {
        crossingId: req.crossingId,
        reportedStatus: normalizedStatus,
        reporterCoordinate: userCoord,
        notes: req.notes
      },
      {
        reporterIpHash: ipHash,
        trustScore: distanceWeight,
        ttlSeconds: 900 // 15 mins validity
      }
    );

    return {
      success: true,
      reportId: savedReport.id,
      crossingId: req.crossingId,
      appliedStatus: normalizedStatus,
      consensusScore: Number(distanceWeight.toFixed(2)),
      label: 'COMMUNITY REPORTED',
      message: `Community report verified (${Math.round(distanceMeters)}m proximity) and factored into live consensus.`,
      expiresAt: toIsoStringSafe(savedReport.expiresAt),
      disclaimer: 'COMMUNITY REPORTED status. Crowdsourced observation; not an official railway feed.'
    };
  }

  /**
   * Computes multi-factor community confidence score and consensus status.
   *
   * Factors:
   * 1. Report Recency (exponential decay over 15 mins)
   * 2. Number of Independent Reports (multiplier scales 1..>=3)
   * 3. Distance from Crossing (closer reporters receive higher weight)
   * 4. Agreement Between Reports (consensus vote proportion)
   */
  public async getConsensusStatus(
    crossingId: string
  ): Promise<CommunityCrossingStatusResult | null> {
    const crossing = await this.crossingRepo.findById(crossingId);
    if (!crossing) return null;

    const reports = await this.communityRepo.getActiveReports(crossingId);
    if (reports.length === 0) {
      return null;
    }

    const now = Date.now();
    const statusWeights: Record<string, number> = {
      [GateOperationalStatus.OPEN]: 0,
      [GateOperationalStatus.CLOSED]: 0,
      [GateOperationalStatus.CLOSING]: 0,
      [GateOperationalStatus.OPENING]: 0
    };

    let totalWeight = 0;
    let totalAgeWeighted = 0;
    let totalDistWeighted = 0;

    // Track unique reporters
    const uniqueReporters = new Set<string>();

    for (const rep of reports) {
      const reporterKey = rep.reporterIpHash || rep.id;
      uniqueReporters.add(reporterKey);

      const ageSec = Math.max(0, (now - rep.reportedAt.getTime()) / 1000);
      const recencyWeight = Math.exp(-ageSec / 900); // 15 min half-life
      const distWeight = rep.trustScore || 0.8;

      const combinedWeight = recencyWeight * distWeight;
      statusWeights[rep.reportedStatus] = (statusWeights[rep.reportedStatus] || 0) + combinedWeight;

      totalWeight += combinedWeight;
      totalAgeWeighted += recencyWeight;
      totalDistWeighted += distWeight;
    }

    let topStatus = GateOperationalStatus.UNKNOWN;
    let maxWeight = 0;

    for (const [status, weight] of Object.entries(statusWeights)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        topStatus = status as GateOperationalStatus;
      }
    }

    // Factor 1: Average Recency Weight (0.0 to 1.0)
    const avgRecencyWeight = reports.length > 0 ? totalAgeWeighted / reports.length : 0.5;

    // Factor 2: Number of Independent Reports
    const independentCount = uniqueReporters.size;
    const countMultiplier = independentCount >= 3 ? 0.95 : independentCount === 2 ? 0.80 : 0.60;

    // Factor 3: Average Distance Weight
    const avgDistWeight = reports.length > 0 ? totalDistWeighted / reports.length : 0.7;

    // Factor 4: Agreement Ratio
    const agreementRatio = totalWeight > 0 ? maxWeight / totalWeight : 0.5;

    // Overall Combined Community Confidence (0.0 to 1.0)
    const rawConfidence = ((avgRecencyWeight * 0.35 + avgDistWeight * 0.25 + agreementRatio * 0.40) * countMultiplier);
    const overallConfidence = Number(Math.min(0.95, Math.max(0.1, rawConfidence)).toFixed(2));

    const metrics: CommunityConfidenceMetrics = {
      recencyWeight: Number(avgRecencyWeight.toFixed(2)),
      independentReportsCount: independentCount,
      averageDistanceMeters: 250,
      distanceWeight: Number(avgDistWeight.toFixed(2)),
      agreementRatio: Number(agreementRatio.toFixed(2)),
      overallConfidence
    };

    const latestReport = reports[0];

    return {
      crossingId,
      crossingCode: crossing.crossingCode,
      status: topStatus,
      label: 'COMMUNITY REPORTED',
      isOfficialData: false,
      confidenceScore: overallConfidence,
      confidenceMetrics: metrics,
      recentReportsCount: reports.length,
      lastReportedAt: toIsoStringSafe(latestReport.reportedAt),
      disclaimer: 'COMMUNITY REPORTED status. Crowdsourced observation; not an official railway feed.',
      provenance: {
        sourceType: DataProvenanceType.COMMUNITY_REPORTED,
        providerName: 'Community Gate Reports Network',
        confidenceScore: overallConfidence,
        isRealtime: true,
        lastSyncedAt: new Date().toISOString(),
        notes: `Consensus calculated from ${independentCount} independent report(s) with agreement ${Math.round(agreementRatio * 100)}%`
      }
    };
  }

  private normalizeReportStatus(status: any): GateOperationalStatus {
    const s = String(status).toUpperCase();
    if (s === 'OPEN' || s === 'OPENED') return GateOperationalStatus.OPEN;
    if (s === 'CLOSED') return GateOperationalStatus.CLOSED;
    if (s === 'CLOSING') return GateOperationalStatus.CLOSING;
    if (s === 'OPENING') return GateOperationalStatus.OPENING;
    return GateOperationalStatus.UNKNOWN;
  }

  private calculateDistanceWeight(distanceMeters: number): number {
    if (distanceMeters <= 100) return 1.0;
    if (distanceMeters <= 400) return 0.85;
    if (distanceMeters <= 800) return 0.65;
    return 0.3;
  }

  private checkRateLimitAndDuplicates(
    clientId: string,
    crossingId: string,
    status: GateOperationalStatus
  ): { allowed: boolean; reason: string } {
    const now = Date.now();
    const key = `${clientId}_${crossingId}`;
    const tracker = this.clientRateLimits.get(key);

    if (!tracker) {
      this.clientRateLimits.set(key, {
        lastReportTime: now,
        reportCountInWindow: 1,
        windowStartTime: now,
        lastReportStatus: status
      });
      return { allowed: true, reason: '' };
    }

    // Check duplicate status within 30 seconds
    if (tracker.lastReportStatus === status && now - tracker.lastReportTime < 30000) {
      return {
        allowed: false,
        reason: 'Duplicate report detected. You recently submitted this exact status.'
      };
    }

    // Check window rate limiting
    if (now - tracker.windowStartTime < this.rateLimitWindowMs) {
      if (tracker.reportCountInWindow >= this.maxReportsPerWindow) {
        return {
          allowed: false,
          reason: 'Too many reports submitted. Please wait a minute before submitting again.'
        };
      }
      tracker.reportCountInWindow++;
    } else {
      tracker.windowStartTime = now;
      tracker.reportCountInWindow = 1;
    }

    tracker.lastReportTime = now;
    tracker.lastReportStatus = status;
    return { allowed: true, reason: '' };
  }
}
