import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Coordinate, CrossingRiskDetail } from '@railway-gate/shared';
import {
  createOriginMarkerIcon,
  createDestinationMarkerIcon,
  createCrossingMarkerIcon
} from '../../utils/map.utils';
import { formatClockTime } from '../../utils/formatters';

interface MapMarkersProps {
  origin: Coordinate;
  destination: Coordinate;
  crossings: CrossingRiskDetail[];
  onSelectCrossing: (crossing: CrossingRiskDetail) => void;
}

export const MapMarkers: React.FC<MapMarkersProps> = ({
  origin,
  destination,
  crossings,
  onSelectCrossing
}) => {
  return (
    <>
      {/* Origin Marker */}
      <Marker position={[origin.lat, origin.lng]} icon={createOriginMarkerIcon()}>
        <Popup>
          <div className="text-xs font-semibold text-slate-800 p-1">
            <span className="text-blue-600 font-bold">Origin (A)</span>
            <br />
            {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
          </div>
        </Popup>
      </Marker>

      {/* Destination Marker */}
      <Marker position={[destination.lat, destination.lng]} icon={createDestinationMarkerIcon()}>
        <Popup>
          <div className="text-xs font-semibold text-slate-800 p-1">
            <span className="text-emerald-600 font-bold">Destination (B)</span>
            <br />
            {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
          </div>
        </Popup>
      </Marker>

      {/* Level Crossing Markers */}
      {crossings.map((c) => (
        <Marker
          key={c.crossingId}
          position={[c.location.lat, c.location.lng]}
          icon={createCrossingMarkerIcon(
            c.riskEvaluation.riskLevel,
            c.isGradeSeparated,
            c.crossingCode
          )}
          eventHandlers={{
            click: () => onSelectCrossing(c)
          }}
        >
          <Popup>
            <div className="text-xs p-1 text-slate-900 flex flex-col gap-1 max-w-[200px]">
              <div className="font-bold flex items-center justify-between">
                <span>{c.name}</span>
                <span className="font-mono text-[10px] text-slate-600">{c.crossingCode}</span>
              </div>
              <div className="text-[11px] text-slate-700">
                Arrival ETA: <b>{formatClockTime(c.userEtaAtCrossing.arrivalTime)}</b>
              </div>
              <div className="text-[11px]">
                Risk Score: <b>{c.riskEvaluation.riskScore}/100</b>
              </div>
              <button
                type="button"
                onClick={() => onSelectCrossing(c)}
                className="mt-1 w-full py-1 bg-blue-600 text-white font-bold rounded text-[10px] cursor-pointer"
              >
                View Full Timeline & Details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};
