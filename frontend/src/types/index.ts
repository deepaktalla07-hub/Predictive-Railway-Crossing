export * from '@railway-gate/shared';

export type UiRouteState =
  | 'IDLE'
  | 'LOADING'
  | 'SUCCESS'
  | 'NO_ROUTE'
  | 'NO_CROSSINGS'
  | 'INSUFFICIENT_DATA'
  | 'ERROR';

export type SheetSnapState = 'COLLAPSED' | 'HALF' | 'EXPANDED';

export type ActiveTab = 'route' | 'crossings' | 'alternatives';

export interface RoutePreset {
  id: string;
  name: string;
  scenarioType: 'HIGH_RISK_CONFLICT' | 'MODERATE_WARNING' | 'CLEAR_NO_CROSSINGS' | 'INSUFFICIENT_DATA';
  badge: string;
  description: string;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  isDemoData: boolean;
}
