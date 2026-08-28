import React from 'react';
import { GateOperationalStatus } from '@railway-gate/shared';
import clsx from 'clsx';

interface GateStatusBadgeProps {
  status: GateOperationalStatus;
  confidence?: number;
}

export const GateStatusBadge: React.FC<GateStatusBadgeProps> = ({ status, confidence }) => {
  const getStyles = () => {
    switch (status) {
      case GateOperationalStatus.OPEN:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case GateOperationalStatus.CLOSING:
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse';
      case GateOperationalStatus.CLOSED:
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case GateOperationalStatus.OPENING:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border',
        getStyles()
      )}
    >
      <span className="w-2 h-2 rounded-full bg-current"></span>
      <span>{status}</span>
      {confidence !== undefined && (
        <span className="text-[10px] opacity-75 font-normal ml-0.5">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </span>
  );
};
