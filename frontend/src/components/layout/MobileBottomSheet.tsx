import React, { useState } from 'react';
import { SheetSnapState } from '../../types';
import { ChevronUp, ChevronDown, Minus } from 'lucide-react';

interface MobileBottomSheetProps {
  children: React.ReactNode;
  title?: string;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({ children, title }) => {
  const [snapState, setSnapState] = useState<SheetSnapState>('HALF');

  const toggleSnap = () => {
    if (snapState === 'COLLAPSED') setSnapState('HALF');
    else if (snapState === 'HALF') setSnapState('EXPANDED');
    else setSnapState('COLLAPSED');
  };

  const getHeightClass = () => {
    switch (snapState) {
      case 'COLLAPSED':
        return 'h-16';
      case 'HALF':
        return 'h-[48vh]';
      case 'EXPANDED':
        return 'h-[85vh]';
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-2xl border-t border-slate-800 rounded-t-3xl shadow-2xl transition-all duration-300 flex flex-col md:hidden overflow-hidden ${getHeightClass()}`}
    >
      {/* Drag Handle Bar & Header */}
      <div
        onClick={toggleSnap}
        className="pt-2 pb-2 px-4 flex flex-col items-center justify-center cursor-pointer border-b border-slate-800/60 select-none flex-shrink-0"
      >
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mb-1"></div>
        <div className="w-full flex items-center justify-between text-xs font-bold text-slate-200">
          <span>{title || 'Route Telemetry & Crossings'}</span>
          <div className="flex items-center gap-1 text-[10px] text-cyan-400">
            <span>{snapState === 'EXPANDED' ? 'Minimize' : snapState === 'HALF' ? 'Expand' : 'Open'}</span>
            {snapState === 'EXPANDED' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {/* Scrollable Children Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {children}
      </div>
    </div>
  );
};
