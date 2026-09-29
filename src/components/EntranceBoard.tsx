import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Zap,
  Accessibility,
  Clock,
  Radio,
  Sparkles,
  Compass,
} from 'lucide-react';
import { ZoneAvailability, TelemetryLogItem } from '../types';

interface EntranceBoardProps {
  zones: ZoneAvailability[];
  telemetryLogs: TelemetryLogItem[];
  onExit: () => void;
}

export const EntranceBoard: React.FC<EntranceBoardProps> = ({
  zones,
  telemetryLogs,
  onExit,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const getDirectionInfo = (zoneId: string) => {
    switch (zoneId) {
      case 'zone-a':
        return { icon: ArrowLeft, text: 'Turn Left at North Ring Road • 150m', lane: 'LANE 1 (WEST)' };
      case 'zone-b':
        return { icon: ArrowUp, text: 'Continue Straight past STEM Quad • 200m', lane: 'LANE 2 (CENTRAL)' };
      case 'zone-c':
        return { icon: ArrowRight, text: 'Turn Right to Performing Arts Blvd • 300m', lane: 'LANE 3 (SOUTH)' };
      case 'zone-d':
        return { icon: Compass, text: 'Follow Stadium Ring • Express Shuttle 6m', lane: 'LANE 4 (COMMUTER)' };
      default:
        return { icon: ArrowUp, text: 'Campus Lot Entrance', lane: 'CAMPUS ENTRY' };
    }
  };

  const totalCampusFree = zones.reduce((acc, z) => acc + z.freeSpots, 0);
  const totalCampusSpots = zones.reduce((acc, z) => acc + z.totalSpots, 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 font-sans select-none">
      {/* Kiosk Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                LIVE GATE TELEMETRY
              </span>
              <span className="text-xs text-slate-400">Campus Entrance Gate 1 (North Access)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              CAMPUS PARKING AVAILABILITY
            </h1>
          </div>
        </div>

        {/* Clock & Controls */}
        <div className="flex items-center gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 text-right">
            <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tracking-wider">
              {currentTime}
            </div>
            <div className="text-xs text-slate-400 font-medium">{currentDate}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="entrance-fullscreen-btn"
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
              title="Toggle Fullscreen Kiosk Mode"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              id="entrance-exit-btn"
              onClick={onExit}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
            >
              Exit Kiosk
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metric Banner */}
      <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-3xl sm:text-4xl font-black text-white font-mono">
            {totalCampusFree}
            <span className="text-base sm:text-lg font-normal text-slate-400 ml-1.5">
              / {totalCampusSpots} spots available
            </span>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden sm:block" />
          <div className="text-xs sm:text-sm text-slate-300 max-w-md">
            Parking guidance is updated in real time via ultrasonic sensors and automated camera detectors.
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600/50 text-emerald-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>GREEN = PLENTY (&gt;35%)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-600/50 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>YELLOW = FILLING</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-600/50 text-rose-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span>RED = FULL (&lt;12%)</span>
          </div>
        </div>
      </div>

      {/* Main Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
        {zones.map((zone) => {
          const dir = getDirectionInfo(zone.zoneId);
          const DirectionIcon = dir.icon;
          const isPlenty = zone.status === 'plenty';
          const isFilling = zone.status === 'filling';
          const isFull = zone.status === 'full';

          const cardTheme = isPlenty
            ? {
                border: 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.12)]',
                headerBg: 'bg-emerald-950/40 text-emerald-400',
                badgeBg: 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]',
                countText: 'text-emerald-400',
                statusText: 'PLENTY OF SPOTS',
                barColor: 'bg-emerald-500',
              }
            : isFilling
            ? {
                border: 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.12)]',
                headerBg: 'bg-amber-950/40 text-amber-400',
                badgeBg: 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]',
                countText: 'text-amber-400',
                statusText: 'FILLING UP FAST',
                barColor: 'bg-amber-500',
              }
            : {
                border: 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.12)]',
                headerBg: 'bg-rose-950/40 text-rose-400',
                badgeBg: 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]',
                countText: 'text-rose-400',
                statusText: 'LOT FULL / STANDBY',
                barColor: 'bg-rose-500',
              };

          return (
            <div
              key={zone.zoneId}
              id={`entrance-card-${zone.zoneId}`}
              className={`rounded-2xl bg-slate-900/90 border ${cardTheme.border} p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden`}
            >
              {/* Top Row: Zone Code & Direction */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-black uppercase px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                      {zone.shortCode}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{dir.lane}</span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${cardTheme.badgeBg}`}
                  >
                    {cardTheme.statusText}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
                  {zone.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mb-4">{zone.location}</p>
              </div>

              {/* Center Giant Count */}
              <div className="my-2 p-5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase font-mono tracking-widest text-slate-400">
                    Free Parking Spots
                  </div>
                  <div className={`text-4xl sm:text-6xl font-black font-mono tracking-tight ${cardTheme.countText}`}>
                    {zone.freeSpots}
                    <span className="text-lg sm:text-2xl font-normal text-slate-500 ml-2">
                      / {zone.totalSpots}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono text-slate-400 mb-1">Occupancy</div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
                    {zone.occupancyRate}%
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {zone.occupiedSpots} cars parked
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden my-3">
                <div
                  className={`h-full ${cardTheme.barColor} transition-all duration-700`}
                  style={{ width: `${Math.min(100, zone.occupancyRate)}%` }}
                />
              </div>

              {/* Bottom Details & Directional Wayfinding */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-slate-300">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <strong>{zone.evFree}</strong> / {zone.evTotal} EV Free
                  </span>
                  <span className="flex items-center gap-1">
                    <Accessibility className="w-3.5 h-3.5 text-blue-400" />
                    <strong>{zone.accessibleFree}</strong> / {zone.accessibleTotal} ADA Free
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <DirectionIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-slate-300">{dir.text}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Sensor Ticker Footer */}
      <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-4 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-semibold">LIVE SENSOR STREAM:</span>
        </div>

        <div className="overflow-hidden whitespace-nowrap text-slate-400 truncate flex-1">
          {telemetryLogs.slice(0, 4).map((log, idx) => (
            <span key={log.id} className="inline-block mr-6">
              [{log.time}] Spot <strong className="text-slate-200">{log.spotId}</strong> in {log.zoneCode}:{' '}
              <span
                className={
                  log.action === 'arrived'
                    ? 'text-rose-400 font-semibold'
                    : log.action === 'departed'
                    ? 'text-emerald-400 font-semibold'
                    : 'text-amber-400'
                }
              >
                {log.action.toUpperCase()}
              </span>{' '}
              via {log.source}
            </span>
          ))}
          {telemetryLogs.length === 0 && <span>Listening for live sensor triggers...</span>}
        </div>

        <div className="shrink-0 text-slate-500 hidden lg:block">
          IoT Frequency: 4000ms • Push Protocol: WS / SSE
        </div>
      </div>
    </div>
  );
};
