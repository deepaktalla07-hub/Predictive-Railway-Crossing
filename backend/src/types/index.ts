export * from '@railway-gate/shared';

// Backend internal types
export interface RequestWithProvenance {
  clientIp?: string;
  requestId: string;
}

export interface DomainErrorPayload {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}
