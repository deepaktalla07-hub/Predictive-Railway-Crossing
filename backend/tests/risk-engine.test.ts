import { describe, it, expect, beforeEach } from 'vitest';
import { RailwayCrossingRiskEngine } from '../src/services/risk-engine.service';

describe('RailwayCrossingRiskEngine - Time Comparison & Risk Classification', () => {
  let riskEngine: RailwayCrossingRiskEngine;

  beforeEach(() => {
    riskEngine = new RailwayCrossingRiskEngine();
  });

  it('1. should classify 30s difference as HIGH RISK (example from user specification)', () => {
    // Train crossing at 10:00:30, User arrival at 10:00:00 -> Difference: 30 seconds
    const trainCrossingTime = '2026-08-19T10:00:30.000Z';
    const userArrivalTime = '2026-08-19T10:00:00.000Z';

    const result = riskEngine.evaluateRisk({
      trainCrossingTime,
      userArrivalTime,
      isGradeSeparated: false,
      confidenceScore: 0.95
    });

    expect(result.riskLevel).toBe('HIGH');
    expect(result.timeDifferenceSeconds).toBe(30);
    expect(result.formattedTimeDifference).toBe('30 seconds');
    expect(result.reason).toContain('High risk of encountering a closed railway crossing');
    expect(result.reason).not.toContain('The railway gate WILL be closed');
    expect(result.confidence).toBe('HIGH');
  });

  it('2. should classify 5 min (300s) difference as MODERATE RISK', () => {
    // Train crossing at 10:05:00, User arrival at 10:00:00 -> Difference: 300 seconds
    const trainCrossingTime = '2026-08-19T10:05:00.000Z';
    const userArrivalTime = '2026-08-19T10:00:00.000Z';

    const result = riskEngine.evaluateRisk({
      trainCrossingTime,
      userArrivalTime,
      isGradeSeparated: false
    });

    expect(result.riskLevel).toBe('MODERATE');
    expect(result.timeDifferenceSeconds).toBe(300);
    expect(result.formattedTimeDifference).toBe('5 minutes');
    expect(result.reason).toContain('Moderate risk of encountering a closed railway crossing');
  });

  it('3. should classify 20 min (1200s) difference as LOW RISK', () => {
    // Train crossing at 10:20:00, User arrival at 10:00:00 -> Difference: 1200 seconds
    const trainCrossingTime = '2026-08-19T10:20:00.000Z';
    const userArrivalTime = '2026-08-19T10:00:00.000Z';

    const result = riskEngine.evaluateRisk({
      trainCrossingTime,
      userArrivalTime,
      isGradeSeparated: false
    });

    expect(result.riskLevel).toBe('LOW');
    expect(result.timeDifferenceSeconds).toBe(1200);
    expect(result.formattedTimeDifference).toBe('20 minutes');
    expect(result.reason).toContain('Low risk of encountering a closed railway crossing');
  });

  it('4. should handle grade-separated flyovers/underpasses as LOW risk without railway gate interaction', () => {
    const result = riskEngine.evaluateRisk({
      trainCrossingTime: '2026-08-19T10:00:10.000Z',
      userArrivalTime: '2026-08-19T10:00:00.000Z',
      isGradeSeparated: true
    });

    expect(result.riskLevel).toBe('LOW');
    expect(result.isGradeSeparated).toBe(true);
    expect(result.reason).toContain('Grade-separated overpass/underpass');
  });

  it('5. should return UNKNOWN when data is missing or incomplete', () => {
    const result = riskEngine.evaluateRisk({
      trainCrossingTime: null,
      userArrivalTime: '2026-08-19T10:00:00.000Z',
      isGradeSeparated: false
    });

    expect(result.riskLevel).toBe('UNKNOWN');
    expect(result.timeDifferenceSeconds).toBeNull();
    expect(result.confidence).toBe('UNKNOWN');
    expect(result.reason).toContain('Risk is unverified due to insufficient real-time train telemetry');
  });

  it('6. should support configurable custom risk thresholds', () => {
    const customEngine = new RailwayCrossingRiskEngine({
      highRiskTimeDifferenceSeconds: 600 // Custom: <= 10 mins is HIGH RISK
    });

    const result = customEngine.evaluateRisk({
      trainCrossingTime: '2026-08-19T10:07:00.000Z', // 7 mins = 420s
      userArrivalTime: '2026-08-19T10:00:00.000Z',
      isGradeSeparated: false
    });

    // 420s <= 600s -> evaluates to HIGH RISK under custom threshold
    expect(result.riskLevel).toBe('HIGH');
    expect(result.timeDifferenceSeconds).toBe(420);
  });
});
