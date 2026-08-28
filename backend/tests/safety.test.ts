import { describe, it, expect } from 'vitest';
import { SAFETY_AND_TRANSPARENCY_MANDATE } from '@railway-gate/shared';
import { SystemController } from '../src/controllers/system.controller';
import { Request, Response } from 'express';

describe('Safety and Transparency Requirements Mandate', () => {
  it('1. should clearly state that railway crossing predictions are estimates and may be inaccurate', () => {
    expect(SAFETY_AND_TRANSPARENCY_MANDATE.ESTIMATE_NOTICE).toContain(
      'Railway crossing predictions are estimates and may be inaccurate'
    );
  });

  it('2. should require users to always follow signals, barriers, official instructions, and local rules', () => {
    const rules = SAFETY_AND_TRANSPARENCY_MANDATE.SAFETY_RULES_TO_FOLLOW.join(' ').toLowerCase();

    expect(rules).toContain('railway signals');
    expect(rules).toContain('barriers');
    expect(rules).toContain('traffic signals');
    expect(rules).toContain('official railway instructions');
    expect(rules).toContain('local traffic rules');
  });

  it('3. should prohibit instructing users to cross based solely on prediction', () => {
    expect(SAFETY_AND_TRANSPARENCY_MANDATE.CRITICAL_CROSSING_RULE).toContain(
      'Never instruct or attempt to cross a railway gate based solely on the application\'s prediction'
    );
  });

  it('4. should declare the system is a route-planning/warning tool, not a railway safety control system', () => {
    expect(SAFETY_AND_TRANSPARENCY_MANDATE.SYSTEM_ROLE_DECLARATION).toContain(
      'The application is a route-planning and warning tool, not a railway safety control system'
    );
  });

  it('5. should expose safety mandate via SystemController endpoints', async () => {
    const controller = new SystemController();

    let jsonResult: any = null;
    const res = {
      json: (payload: any) => {
        jsonResult = payload;
      }
    } as unknown as Response;

    await controller.getSafetyMandate({} as Request, res, () => {});

    expect(jsonResult).toBeDefined();
    expect(jsonResult.status).toBe('SUCCESS');
    expect(jsonResult.mandate.ESTIMATE_NOTICE).toBeDefined();
    expect(jsonResult.mandate.SYSTEM_ROLE_DECLARATION).toBeDefined();
  });
});
