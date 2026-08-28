import React from 'react';
import { DataProvenanceType, ProvenanceMetadata } from '@railway-gate/shared';
import { ShieldCheck, Info, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ProvenanceBadgeProps {
  provenance: ProvenanceMetadata;
  interactive?: boolean;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  provenance,
  interactive = true
}) => {
  const setIsProvenanceModalOpen = useAppStore((s) => s.setIsProvenanceModalOpen);

  const getSourceDisplay = () => {
    switch (provenance.sourceType) {
      case DataProvenanceType.OFFICIAL_RAIL:
        return { label: 'Official Rail Timetable', icon: ShieldCheck, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case DataProvenanceType.OPEN_GEO_OSM:
        return { label: 'OpenStreetMap Verified GIS', icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case DataProvenanceType.THIRD_PARTY_VERIFIED:
        return { label: 'Third-Party Verified Feed', icon: ShieldCheck, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      case DataProvenanceType.CALCULATED_ESTIMATE:
        return { label: 'Kinematic Trajectory Estimate', icon: Info, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case DataProvenanceType.COMMUNITY_REPORTED:
        return { label: 'Community Spot Consensus', icon: Info, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      case DataProvenanceType.UNVERIFIED_DEV_STUB:
        return { label: 'Dev Test Stub (Offline)', icon: AlertTriangle, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
      default:
        return { label: 'Unverified Source', icon: AlertTriangle, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
    }
  };

  const { label, icon: Icon, color } = getSourceDisplay();

  return (
    <button
      type="button"
      onClick={() => interactive && setIsProvenanceModalOpen(true)}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${color} ${
        interactive ? 'hover:brightness-125 cursor-pointer' : ''
      }`}
      title="Click to view data provenance, confidence score, and licensing"
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      <span className="text-[9px] opacity-75 font-mono">
        ({Math.round(provenance.confidenceScore * 100)}% conf)
      </span>
    </button>
  );
};
