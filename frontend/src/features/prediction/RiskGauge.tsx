import React from 'react';
import { RiskLevel } from '@railway-gate/shared';
import clsx from 'clsx';
import { ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle, CheckCircle2 } from 'lucide-react';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showBar?: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  level,
  size = 'md',
  showBar = true
}) => {
  const getBadgeConfig = () => {
    switch (level) {
      case RiskLevel.CLEAR:
      case RiskLevel.LOW_RISK:
        return {
          label: 'LOW RISK',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-emerald-900/20',
          barColor: 'bg-emerald-500',
          icon: CheckCircle2
        };
      case RiskLevel.MODERATE_WARNING:
        return {
          label: 'MODERATE RISK',
          color: 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-amber-900/20',
          barColor: 'bg-amber-500',
          icon: AlertTriangle
        };
      case RiskLevel.HIGH_RISK_BLOCK:
        return {
          label: 'HIGH RISK',
          color: 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-rose-900/30 animate-pulse',
          barColor: 'bg-rose-500',
          icon: AlertOctagon
        };
      case RiskLevel.UNKNOWN:
      default:
        return {
          label: 'UNKNOWN RISK',
          color: 'bg-slate-500/20 text-slate-400 border-slate-500/40 shadow-slate-900/20',
          barColor: 'bg-slate-500',
          icon: HelpCircle
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 font-bold rounded-lg border px-2.5 py-1 shadow-sm tracking-wide',
            size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-sm' : 'text-xs',
            config.color
          )}
        >
          <Icon className={clsx(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          <span>{config.label}</span>
        </span>

        {level !== RiskLevel.UNKNOWN && (
          <span className="text-xs font-semibold text-slate-300 font-mono">
            Index: <span className="font-bold text-white text-sm">{score}</span>/100
          </span>
        )}
      </div>

      {showBar && (
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-slate-700/80 mt-0.5">
          <div
            className={clsx('h-full transition-all duration-700 rounded-full', config.barColor)}
            style={{ width: `${level === RiskLevel.UNKNOWN ? 50 : Math.max(5, Math.min(100, score))}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};
