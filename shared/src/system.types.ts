import { DataProvenanceType } from './provenance.types';

export const SAFETY_AND_TRANSPARENCY_MANDATE = {
  ESTIMATE_NOTICE: 'Railway crossing predictions are estimates and may be inaccurate.',
  SAFETY_RULES_TO_FOLLOW: [
    'Railway signals (trackside lights, indicators)',
    'Barriers & physical gate closure mechanisms',
    'Traffic signals & road junction lights',
    'Official railway instructions & station/gateman directives',
    'Local traffic rules & speed regulations'
  ],
  CRITICAL_CROSSING_RULE: 'Never instruct or attempt to cross a railway gate based solely on the application\'s prediction.',
  SYSTEM_ROLE_DECLARATION: 'The application is a route-planning and warning tool, not a railway safety control system.'
};

export interface SafetyDisclaimerPayload {
  estimateNotice: string;
  mandatoryRules: string[];
  crossingRule: string;
  systemRole: string;
}

export interface DataSourceStatus {
  sourceKey: string;
  name: string;
  provenanceType: DataProvenanceType;
  operationalStatus: 'OPERATIONAL' | 'DEGRADED' | 'DEVELOPMENT_STUB' | 'OFFLINE';
  isRealtime: boolean;
  lastChecked: string;
  latencyMs: number;
  coverageArea: string;
  notes: string;
}

export interface SystemHealthResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE';
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  activeProviders: {
    routing: string;
    railwayCrossing: string;
    trainSchedule: string;
  };
  sources: DataSourceStatus[];
  safetyDisclaimer?: SafetyDisclaimerPayload;
}
