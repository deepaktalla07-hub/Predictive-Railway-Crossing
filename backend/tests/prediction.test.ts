import { describe, it, expect } from 'vitest';
import { KinematicEngineService } from '../src/services/kinematic.service';
import { RiskCalculationService } from '../src/services/risk.service';
import { DevStubCrossingProvider } from '../src/providers/railway/DevStubCrossingProvider';
import { DevStubTrainProvider } from '../src/providers/trains/DevStubTrainProvider';
import { CrossingGateType, RiskLevel } from '@railway-gate/shared';

describe('Kinematic Prediction Engine Tests', () => {
  const kinematicEngine = new KinematicEngineService();
  const crossingProvider = new DevStubCrossingProvider();
  const trainProvider = new DevStubTrainProvider();

  it('should interpolate train arrival time and calculate gate closure buffer correctly', async () => {
    const crossing = (await crossingProvider.getCrossingById('dev-lc-88a'))!;
    const schedules = await trainProvider.getSchedulesForLine('SWR-SBC-HSRA');
    const schedule = schedules[0];
    const estimatedArrival = new Date('2026-08-19T08:30:00.000Z');

    const result = kinematicEngine.computePredictedEvent({
      crossing,
      trainSchedule: schedule,
      estimatedArrivalAtCrossing: estimatedArrival,
      trainSpeedKmh: 60
    });

    expect(result).toBeDefined();
    expect(result.trainNumber).toBe('12678');
    expect(result.gateClosureWindow.closeStartTime).toBeDefined();
    expect(result.gateClosureWindow.reopenTime).toBeDefined();

    const closeStart = new Date(result.gateClosureWindow.closeStartTime).getTime();
    const crossingTime = new Date(result.estimatedCrossingTime).getTime();
    const reopenTime = new Date(result.gateClosureWindow.reopenTime).getTime();

    // Close start should be 360 seconds (pre-buffer) before arrival
    expect(crossingTime - closeStart).toBe(360 * 1000);
    // Reopen should be after crossing time
    expect(reopenTime).toBeGreaterThan(crossingTime);
  });
});

describe('Risk Calculation Engine Tests', () => {
  const riskCalculator = new RiskCalculationService();
  const kinematicEngine = new KinematicEngineService();
  const crossingProvider = new DevStubCrossingProvider();
  const trainProvider = new DevStubTrainProvider();

  it('should flag HIGH_RISK_BLOCK when user arrival window directly overlaps gate closure', async () => {
    const crossing = (await crossingProvider.getCrossingById('dev-lc-88a'))!;
    const schedules = await trainProvider.getSchedulesForLine('SWR-SBC-HSRA');
    const schedule = schedules[0];
    const trainArrival = new Date('2026-08-19T09:00:00.000Z');

    const predictedEvent = kinematicEngine.computePredictedEvent({
      crossing,
      trainSchedule: schedule,
      estimatedArrivalAtCrossing: trainArrival
    });

    // User arriving right inside the closure window
    const userArrival = {
      estimatedArrival: new Date('2026-08-19T08:58:00.000Z'),
      minArrival: new Date('2026-08-19T08:55:00.000Z'),
      maxArrival: new Date('2026-08-19T09:03:00.000Z')
    };

    const { evaluation } = riskCalculator.evaluateCrossingRisk({
      userArrival,
      predictedEvents: [predictedEvent],
      isGradeSeparated: false,
      gateType: CrossingGateType.MANUAL_INTERLOCKED,
      tracksCount: 2,
      baseConfidence: 0.95
    });

    expect(evaluation.riskLevel).toBe(RiskLevel.HIGH_RISK_BLOCK);
    expect(evaluation.riskScore).toBeGreaterThanOrEqual(70);
    expect(evaluation.recommendation).toBe('AVOID_CROSSING');
  });

  it('should flag CLEAR when no trains are scheduled near arrival', async () => {
    const userArrival = {
      estimatedArrival: new Date('2026-08-19T14:00:00.000Z'),
      minArrival: new Date('2026-08-19T13:50:00.000Z'),
      maxArrival: new Date('2026-08-19T14:10:00.000Z')
    };

    const { evaluation } = riskCalculator.evaluateCrossingRisk({
      userArrival,
      predictedEvents: [],
      isGradeSeparated: false,
      gateType: CrossingGateType.MANUAL_INTERLOCKED,
      tracksCount: 2,
      baseConfidence: 0.95
    });

    expect(evaluation.riskLevel).toBe(RiskLevel.CLEAR);
    expect(evaluation.riskScore).toBeLessThanOrEqual(20);
    expect(evaluation.recommendation).toBe('PROCEED');
  });

  it('should mark grade-separated crossings (ROB/RUB) permanently CLEAR with 0 risk', async () => {
    const userArrival = {
      estimatedArrival: new Date('2026-08-19T09:00:00.000Z'),
      minArrival: new Date('2026-08-19T08:55:00.000Z'),
      maxArrival: new Date('2026-08-19T09:05:00.000Z')
    };

    const { evaluation } = riskCalculator.evaluateCrossingRisk({
      userArrival,
      predictedEvents: [],
      isGradeSeparated: true,
      gateType: CrossingGateType.SPECIAL_GRADE,
      tracksCount: 2,
      baseConfidence: 1.0
    });

    expect(evaluation.riskLevel).toBe(RiskLevel.CLEAR);
    expect(evaluation.riskScore).toBe(0);
    expect(evaluation.recommendation).toBe('PROCEED');
  });
});
