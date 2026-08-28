import { describe, it, expect, beforeEach } from 'vitest';
import { CommunityService } from '../src/services/community.service';
import { CommunityRepository } from '../src/repositories/community.repository';
import { CrossingRepository } from '../src/repositories/crossing.repository';
import { DevStubCrossingProvider } from '../src/providers/railway/DevStubCrossingProvider';
import { GateOperationalStatus } from '@railway-gate/shared';

describe('Community Railway-Crossing Reports Engine', () => {
  let communityService: CommunityService;
  let crossingRepo: CrossingRepository;
  let communityRepo: CommunityRepository;

  // Real test crossing: LC-88A at 12.8523, 77.6612
  const crossingId = 'dev-lc-88a';

  beforeEach(() => {
    const crossingProvider = new DevStubCrossingProvider();
    crossingRepo = new CrossingRepository(crossingProvider);
    communityRepo = new CommunityRepository();
    communityService = new CommunityService(communityRepo, crossingRepo);
  });

  it('1. should accept report when user is sufficiently close to crossing (<800m)', async () => {
    const closeLocation = { lat: 12.8525, lng: 77.6614 }; // ~30 meters away

    const result = await communityService.submitReport(
      {
        crossingId,
        reportedStatus: GateOperationalStatus.CLOSED,
        approximateLocation: closeLocation
      },
      '192.168.1.100'
    );

    expect(result.success).toBe(true);
    expect(result.appliedStatus).toBe(GateOperationalStatus.CLOSED);
    expect(result.label).toBe('COMMUNITY REPORTED');
    expect(result.disclaimer).toContain('COMMUNITY REPORTED status');
  });

  it('2. should reject report when user is too far from crossing (>800m)', async () => {
    const farLocation = { lat: 12.9200, lng: 77.7200 }; // ~10 km away

    const result = await communityService.submitReport(
      {
        crossingId,
        reportedStatus: GateOperationalStatus.CLOSED,
        approximateLocation: farLocation
      },
      '192.168.1.101'
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('away from crossing');
  });

  it('3. should reject impossible (0, 0) Null Island coordinates', async () => {
    const impossibleLocation = { lat: 0, lng: 0 };

    const result = await communityService.submitReport(
      {
        crossingId,
        reportedStatus: GateOperationalStatus.OPEN,
        approximateLocation: impossibleLocation
      },
      '192.168.1.102'
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('Impossible location detected');
  });

  it('4. should prevent duplicate reports from the same client within 30 seconds', async () => {
    const closeLocation = { lat: 12.8524, lng: 77.6613 };

    // First report
    const first = await communityService.submitReport(
      {
        crossingId,
        reportedStatus: GateOperationalStatus.CLOSING,
        approximateLocation: closeLocation
      },
      '192.168.1.103'
    );
    expect(first.success).toBe(true);

    // Immediate duplicate report from same client
    const duplicate = await communityService.submitReport(
      {
        crossingId,
        reportedStatus: GateOperationalStatus.CLOSING,
        approximateLocation: closeLocation
      },
      '192.168.1.103'
    );
    expect(duplicate.success).toBe(false);
    expect(duplicate.message).toContain('Duplicate report detected');
  });

  it('5. should calculate community confidence factoring recency, independent reports, distance, and agreement', async () => {
    const loc1 = { lat: 12.8524, lng: 77.6613 };
    const loc2 = { lat: 12.8525, lng: 77.6612 };
    const loc3 = { lat: 12.8522, lng: 77.6615 };

    // 3 independent users submit 'CLOSED'
    await communityService.submitReport(
      { crossingId, reportedStatus: GateOperationalStatus.CLOSED, approximateLocation: loc1 },
      '10.0.0.1'
    );
    await communityService.submitReport(
      { crossingId, reportedStatus: GateOperationalStatus.CLOSED, approximateLocation: loc2 },
      '10.0.0.2'
    );
    await communityService.submitReport(
      { crossingId, reportedStatus: GateOperationalStatus.CLOSED, approximateLocation: loc3 },
      '10.0.0.3'
    );

    const consensus = await communityService.getConsensusStatus(crossingId);

    expect(consensus).not.toBeNull();
    expect(consensus?.status).toBe(GateOperationalStatus.CLOSED);
    expect(consensus?.label).toBe('COMMUNITY REPORTED');
    expect(consensus?.isOfficialData).toBe(false);
    expect(consensus?.confidenceMetrics.independentReportsCount).toBe(3);
    expect(consensus?.confidenceMetrics.agreementRatio).toBe(1.0);
    expect(consensus?.confidenceScore).toBeGreaterThan(0.7);
  });
});
