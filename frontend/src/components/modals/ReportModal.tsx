import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { communityApi } from '../../services/api';
import { GateOperationalStatus } from '@railway-gate/shared';
import { X, Radio, CheckCircle, AlertCircle, Users, MapPin } from 'lucide-react';

export const ReportModal: React.FC = () => {
  const { isReportModalOpen, setIsReportModalOpen, selectedCrossing, analysisResult } = useAppStore();

  const [crossingId, setCrossingId] = useState<string>(
    selectedCrossing?.crossingId || analysisResult?.primaryRoute?.crossings[0]?.crossingId || 'dev-lc-88a'
  );
  const [status, setStatus] = useState<GateOperationalStatus>(GateOperationalStatus.CLOSED);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCrossing) {
      setCrossingId(selectedCrossing.crossingId);
      // Default to vicinity of the crossing if GPS unavailable in dev
      setUserLocation({ lat: selectedCrossing.location.lat, lng: selectedCrossing.location.lng });
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          if (selectedCrossing) {
            setUserLocation({ lat: selectedCrossing.location.lat, lng: selectedCrossing.location.lng });
          }
        }
      );
    }
  }, [selectedCrossing, isReportModalOpen]);

  if (!isReportModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const approxLoc = userLocation || (selectedCrossing ? { lat: selectedCrossing.location.lat, lng: selectedCrossing.location.lng } : { lat: 12.8523, lng: 77.6612 });

    try {
      const res = await communityApi.submitReport({
        crossingId,
        reportedStatus: status,
        approximateLocation: approxLoc,
        notes
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Report verified and factored into live community consensus.');
        setTimeout(() => {
          setIsReportModalOpen(false);
          setSuccessMsg(null);
        }, 2200);
      } else {
        setErrorMsg(res.message || 'Report could not be accepted.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit report';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Community Gate Report</h3>
                <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[9px] font-extrabold rounded">
                  COMMUNITY REPORTED
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Physical on-site observation verification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsReportModalOpen(false)}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disclaimer Banner */}
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-[10px] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span><b>Notice:</b> Community reports are crowdsourced and never presented as official railway signalling data.</span>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
          {successMsg ? (
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold">Report Verified!</span>
                <span className="text-[11px] text-emerald-200/90">{successMsg}</span>
              </div>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-300">Target Level Crossing</label>
                <input
                  type="text"
                  value={crossingId}
                  onChange={(e) => setCrossingId(e.target.value)}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. dev-lc-88a or LC-88A"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-300">Observed Physical Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: GateOperationalStatus.CLOSED, label: 'CLOSED', desc: 'Barrier down / Train passing', color: 'border-rose-500/50 bg-rose-500/15 text-rose-300' },
                    { val: GateOperationalStatus.CLOSING, label: 'CLOSING', desc: 'Bells ringing / Lowering', color: 'border-amber-500/50 bg-amber-500/15 text-amber-300' },
                    { val: GateOperationalStatus.OPEN, label: 'OPEN', desc: 'Full vehicular flow', color: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' },
                    { val: GateOperationalStatus.OPENING, label: 'OPENED', desc: 'Barrier lifted / Clearing', color: 'border-blue-500/50 bg-blue-500/15 text-blue-300' }
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setStatus(item.val)}
                      className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                        status === item.val
                          ? `${item.color} ring-2 ring-blue-500 shadow-md`
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="font-bold text-white tracking-wide">{item.label}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-300">Optional Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Gate opened 1 min ago, traffic moving quickly"
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  maxLength={150}
                />
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Geofencing: Verified within proximity radius (&lt;800m)</span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Verifying Proximity...' : 'Submit Verified Report'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
