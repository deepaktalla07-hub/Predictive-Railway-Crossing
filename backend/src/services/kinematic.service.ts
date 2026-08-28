import {
  DataProvenanceType,
  GateClosureWindow,
  PredictedTrainEvent,
  RailwayCrossing,
  TrainSchedule
} from '@railway-gate/shared';
import { addSeconds, toIsoStringSafe } from '../utils/time.utils';

export interface KinematicPredictionInput {
  crossing: RailwayCrossing;
  trainSchedule: TrainSchedule;
  estimatedArrivalAtCrossing: Date;
  trainSpeedKmh?: number;
  trainLengthMeters?: number;
}

export class KinematicEngineService {
  /**
   * Calculates the gate closure window [T_close, T_open] for a train crossing event.
   *
   * Formulations:
   * - Train Passage Time: t_passage = (L_train + W_road) / v_train
   * - T_close = T_cross - B_pre
   * - T_open = T_cross + t_passage + B_post
   */
  public computePredictedEvent(input: KinematicPredictionInput): PredictedTrainEvent {
    const { crossing, trainSchedule, estimatedArrivalAtCrossing } = input;
    const speedKmh = input.trainSpeedKmh || 65; // default 65 km/h
    const speedMs = (speedKmh * 1000) / 3600;
    const trainLengthMeters = input.trainLengthMeters || 650; // typical 24-coach train = ~600-650m
    const roadWidthMeters = 15; // typical 2-lane road crossing

    // Passage duration in seconds
    const passageDurationSec = Math.ceil((trainLengthMeters + roadWidthMeters) / Math.max(1, speedMs));

    // Pre-closure buffer (e.g. 360s = 6 mins)
    const preBufferSec = crossing.preClosureBufferSeconds || 360;
    // Post-clearance buffer (e.g. 120s = 2 mins)
    const postBufferSec = crossing.postClearanceBufferSeconds || 120;

    const closeStartTime = addSeconds(estimatedArrivalAtCrossing, -preBufferSec);
    const reopenTime = addSeconds(estimatedArrivalAtCrossing, passageDurationSec + postBufferSec);

    const totalClosureDurationSec = Math.floor(
      (reopenTime.getTime() - closeStartTime.getTime()) / 1000
    );

    const closureWindow: GateClosureWindow = {
      closeStartTime: toIsoStringSafe(closeStartTime),
      reopenTime: toIsoStringSafe(reopenTime),
      durationSeconds: totalClosureDurationSec
    };

    return {
      trainNumber: trainSchedule.trainNumber,
      trainName: trainSchedule.trainName,
      estimatedCrossingTime: toIsoStringSafe(estimatedArrivalAtCrossing),
      uncertaintyBufferSeconds: 180, // ±3 min schedule uncertainty
      gateClosureWindow: closureWindow,
      temporalOverlapSeconds: 0, // Calculated later against road user arrival
      confidenceScore: crossing.provenance.confidenceScore * 0.95,
      provenance: {
        sourceType: DataProvenanceType.CALCULATED_ESTIMATE,
        providerName: 'Kinematic Trajectory Prediction Engine',
        confidenceScore: 0.9,
        isRealtime: false,
        notes: `Computed from timetable schedule at ${speedKmh} km/h with passage time ${passageDurationSec}s`
      }
    };
  }
}

export const defaultKinematicEngine = new KinematicEngineService();
