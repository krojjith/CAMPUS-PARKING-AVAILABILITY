import React, { useState } from 'react';
import {
  X,
  Car,
  Zap,
  Accessibility,
  Shield,
  Bike,
  Cpu,
  Battery,
  Wifi,
  Clock,
  Check,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Send,
} from 'lucide-react';
import { ParkingSpot, SpotStatus, SpotType } from '../types';

interface SpotDetailModalProps {
  spot: ParkingSpot | null;
  zoneName: string;
  onClose: () => void;
  onUpdateStatus: (payload: { spotId: string; status: SpotStatus; source?: string }) => Promise<any>;
  onOpenAlertsForZone: (zoneId: string) => void;
}

export const SpotDetailModal: React.FC<SpotDetailModalProps> = ({
  spot,
  zoneName,
  onClose,
  onUpdateStatus,
  onOpenAlertsForZone,
}) => {
  if (!spot) return null;

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [overrideNotice, setOverrideNotice] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: SpotStatus) => {
    setIsUpdating(true);
    setOverrideNotice(null);
    try {
      await onUpdateStatus({
        spotId: spot.id,
        status: newStatus,
        source: 'manual',
      });
      setOverrideNotice(`Status updated to ${newStatus.toUpperCase()}`);
      setTimeout(() => setOverrideNotice(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const isFree = spot.status === 'free';
  const isOccupied = spot.status === 'occupied';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-mono font-bold text-sm ${
                isFree ? 'bg-emerald-600' : isOccupied ? 'bg-slate-700' : 'bg-amber-600'
              }`}
            >
              {spot.code}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Spot {spot.code}</h3>
              <p className="text-xs text-slate-500">
                {zoneName} &bull; Level {spot.floorLevel} &bull; Row {spot.row}
              </p>
            </div>
          </div>

          <button
            id="modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Status Display Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isFree
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : isOccupied
                ? 'bg-slate-100 border-slate-300 text-slate-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div>
              <div className="text-[11px] uppercase tracking-wider font-mono font-bold opacity-80">
                Current State
              </div>
              <div className="text-xl font-black tracking-tight mt-0.5">
                {isFree ? 'VACANT & AVAILABLE' : isOccupied ? 'OCCUPIED' : spot.status.toUpperCase()}
              </div>
              {isOccupied && spot.occupiedVehicleType && (
                <div className="text-xs mt-1 text-slate-600">
                  Vehicle: <strong>{spot.occupiedVehicleType}</strong>
                </div>
              )}
            </div>

            <div className="text-right text-xs">
              <span className="font-mono text-[11px] block opacity-70">Last ping:</span>
              <span className="font-medium">
                {new Date(spot.lastStatusChange).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          </div>

          {overrideNotice && (
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4" /> {overrideNotice}
            </div>
          )}

          {/* Hardware Sensor Diagnostics (IoT Telemetry) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-600" /> Sensor Diagnostics
              </span>
              <span className="font-mono text-[11px] text-slate-500">{spot.sensorId}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Hardware</span>
                <span className="font-semibold text-slate-800">
                  {spot.type === 'ev' ? 'ESP32 + CT Clamp' : 'Ultrasonic HC-SR04'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Battery Level</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Battery className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{spot.batteryLevel}%</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 block mb-1">WiFi Signal</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Wifi className="w-3.5 h-3.5 text-blue-600" />
                  <span className="capitalize">{spot.signalQuality} (-58 dBm)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Override Actions (Facilities / Demo) */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>Manual State Override (Facilities / Testing)</span>
              {isUpdating && <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                id="btn-override-free"
                disabled={isUpdating}
                onClick={() => handleStatusChange('free')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isFree
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300'
                }`}
              >
                Set Vacant
              </button>

              <button
                id="btn-override-occupied"
                disabled={isUpdating}
                onClick={() => handleStatusChange('occupied')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isOccupied
                    ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                Set Occupied
              </button>

              <button
                id="btn-override-maintenance"
                disabled={isUpdating}
                onClick={() => handleStatusChange('maintenance')}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-all border bg-white hover:bg-amber-50 text-amber-700 border-amber-300"
              >
                Maintenance
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            id="btn-notify-from-modal"
            onClick={() => {
              onClose();
              onOpenAlertsForZone(spot.zoneId);
            }}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline"
          >
            Watch this zone for openings &rarr;
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
