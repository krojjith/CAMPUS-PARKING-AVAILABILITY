import React, { useState } from 'react';
import {
  BarChart3,
  Clock,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Car,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { ZoneAvailability } from '../types';

interface AnalyticsViewProps {
  zones: ZoneAvailability[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ zones }) => {
  const [selectedZoneTab, setSelectedZoneTab] = useState<string>('zone-a');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminPin, setAdminPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const activeZone = zones.find((z) => z.zoneId === selectedZoneTab) || zones[0];

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '2026' || adminPin === 'admin' || adminPin === '1234') {
      setIsAdminAuthenticated(true);
      setPinError(null);
    } else {
      setPinError('Invalid Facilities PIN. (Demo default: 2026)');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Predictive Analytics & Peak Fill Summary */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-700/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Historical Peak-Fill Times & Predictive Analytics
              </h2>
              <p className="text-xs text-slate-400">
                Pattern recognition models trained on campus semester turnstile and sensor telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Weekday Schedule (Mon - Fri)</span>
          </div>
        </div>

        {/* Predictive cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {zones.map((zone) => {
            return (
              <div
                key={zone.zoneId}
                className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono font-bold text-slate-300">{zone.shortCode}</span>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      {zone.freeSpots} spots free now
                    </span>
                  </div>
                  <div className="font-bold text-sm text-white">{zone.name}</div>
                  <div className="mt-2 text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/40">
                    <div className="flex items-start gap-1.5 text-emerald-300 font-medium mb-1">
                      <Sparkles className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>{zone.predictiveFillNote}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between text-[11px] text-slate-400">
                  <span>Current Fill:</span>
                  <span className="font-mono font-bold text-white">{zone.occupancyRate}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Hourly Occupancy Trend Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Hourly Occupancy Profile & Peak Curves
            </h3>
            <p className="text-xs text-slate-500">
              Aggregated historical fill percentage from 8:00 AM to 5:00 PM
            </p>
          </div>

          {/* Zone Pill Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            {zones.map((zone) => (
              <button
                key={zone.zoneId}
                onClick={() => setSelectedZoneTab(zone.zoneId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedZoneTab === zone.zoneId
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {zone.shortCode}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Zone Bar Chart */}
        {activeZone && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Viewing Trend for: <strong className="text-slate-900">{activeZone.name}</strong>
              </span>
              <span className="text-slate-500">
                Total Capacity: <strong>{activeZone.totalSpots} stalls</strong>
              </span>
            </div>

            {/* Custom Bar Visualization */}
            <div className="pt-4 pb-2">
              <div className="grid grid-cols-10 gap-2 items-end h-52 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                {activeZone.hourlyTrends.map((point) => {
                  const isPeak = point.occupancyPercent >= 85;
                  const isModerate = point.occupancyPercent >= 60 && point.occupancyPercent < 85;

                  return (
                    <div key={point.hour} className="flex flex-col items-center h-full justify-end group">
                      <div className="text-[10px] font-mono font-bold text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {point.occupancyPercent}%
                      </div>

                      <div className="w-full bg-slate-200/80 rounded-t-md h-full flex items-end overflow-hidden">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 group-hover:brightness-110 ${
                            isPeak
                              ? 'bg-rose-500'
                              : isModerate
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ height: `${point.occupancyPercent}%` }}
                        />
                      </div>

                      <span className="text-[10px] font-mono text-slate-500 mt-2 font-medium">
                        {point.hour.replace(' ', '')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>&lt;60% (Easy Parking)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>60-84% (Moderate)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>&ge;85% (Critical Peak)</span>
                  </span>
                </div>

                <div className="font-mono text-[11px] text-slate-400">
                  Data source: Automatic telemetry aggregation
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Facilities Staff Admin Access Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Campus Facilities & Parking Staff Management View
              </h3>
              <p className="text-xs text-slate-500">
                Staff controls for lot reservation, maintenance locks, and gate override
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              isAdminAuthenticated
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {isAdminAuthenticated ? 'Staff Authenticated' : 'Public Student Mode'}
          </span>
        </div>

        {!isAdminAuthenticated ? (
          <form onSubmit={handleAdminLogin} className="max-w-md space-y-3">
            <p className="text-xs text-slate-600">
              Facilities staff can unlock parking lot maintenance overrides and batch sensor calibrations.
            </p>
            <div className="flex gap-2">
              <input
                id="admin-pin-input"
                type="password"
                placeholder="Enter Staff PIN (Default: 2026)"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 flex-1"
              />
              <button
                id="btn-admin-auth"
                type="submit"
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Authenticate
              </button>
            </div>
            {pinError && <p className="text-xs text-rose-600 font-semibold">{pinError}</p>}
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Facilities Staff Session Active
              </span>
              <button
                onClick={() => setIsAdminAuthenticated(false)}
                className="text-emerald-700 hover:underline font-bold"
              >
                Log Out
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-800 block mb-1">Lot Gate Mode</span>
                <span className="text-xs text-slate-500 block mb-3">All gate arms operating automatically on sensor pulse.</span>
                <button
                  onClick={() => alert('Gate lock policy toggled.')}
                  className="w-full py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hold Open for Event
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-800 block mb-1">EV Station Power</span>
                <span className="text-xs text-slate-500 block mb-3">All 24 EV chargers online at 32A Level-2 capacity.</span>
                <button
                  onClick={() => alert('EV Chargers Diagnostics: All stations reporting normal load.')}
                  className="w-full py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Run EV Diagnostics
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-800 block mb-1">Batch Spot Reset</span>
                <span className="text-xs text-slate-500 block mb-3">Recalibrate ultrasonic thresholds across all lots.</span>
                <button
                  onClick={() => alert('Ultrasonic echo calibrated across 112 sensors.')}
                  className="w-full py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Calibrate Sensors
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
