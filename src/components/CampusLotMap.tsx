import React, { useState } from 'react';
import {
  ZoneAvailability,
  ParkingSpot,
  SpotType,
  SpotStatus,
} from '../types';
import {
  Car,
  Zap,
  Accessibility,
  Shield,
  Bike,
  Sparkles,
  MapPin,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ChevronRight,
  Bell,
  SlidersHorizontal,
} from 'lucide-react';

interface CampusLotMapProps {
  zones: ZoneAvailability[];
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
  spots: ParkingSpot[];
  onSelectSpot: (spot: ParkingSpot) => void;
  onOpenAlertsForZone: (zoneId: string) => void;
}

export const CampusLotMap: React.FC<CampusLotMapProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  spots,
  onSelectSpot,
  onOpenAlertsForZone,
}) => {
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentZone = zones.find((z) => z.zoneId === selectedZoneId) || zones[0];
  const spotsInZone = spots.filter((s) => s.zoneId === selectedZoneId);

  // Available floors in current zone
  const availableFloors = Array.from(new Set(spotsInZone.map((s) => s.floorLevel))).sort();

  // Filtered spots
  const filteredSpots = spotsInZone.filter((spot) => {
    if (availableFloors.length > 1 && spot.floorLevel !== selectedFloor) {
      return false;
    }
    if (filterType !== 'all' && spot.type !== filterType) {
      return false;
    }
    if (filterStatus !== 'all' && spot.status !== filterStatus) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      return (
        spot.code.toLowerCase().includes(q) ||
        spot.type.toLowerCase().includes(q) ||
        spot.sensorId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSpotTypeBadge = (type: SpotType) => {
    switch (type) {
      case 'ev':
        return { icon: Zap, label: 'EV Charger', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' };
      case 'accessible':
        return { icon: Accessibility, label: 'ADA Accessible', color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'faculty':
        return { icon: Shield, label: 'Faculty / Staff', color: 'text-purple-600 bg-purple-50 border-purple-200' };
      case 'motorcycle':
        return { icon: Bike, label: 'Motorcycle', color: 'text-amber-600 bg-amber-50 border-amber-200' };
      default:
        return { icon: Car, label: 'Standard', color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  const getStatusColor = (status: 'plenty' | 'filling' | 'full') => {
    if (status === 'plenty') return 'text-emerald-700 bg-emerald-50 border-emerald-300';
    if (status === 'filling') return 'text-amber-700 bg-amber-50 border-amber-300';
    return 'text-rose-700 bg-rose-50 border-rose-300';
  };

  return (
    <div className="space-y-6">
      {/* Zone Selector Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {zones.map((zone) => {
          const isSelected = zone.zoneId === selectedZoneId;
          const statusBadge = getStatusColor(zone.status);

          return (
            <button
              key={zone.zoneId}
              id={`select-zone-${zone.zoneId}`}
              onClick={() => {
                onSelectZone(zone.zoneId);
                setSelectedFloor(1);
              }}
              className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {zone.shortCode}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge}`}>
                  {zone.status.toUpperCase()}
                </span>
              </div>

              <div className="font-bold text-slate-900 text-sm truncate">{zone.name}</div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black font-mono text-slate-900">{zone.freeSpots}</span>
                <span className="text-xs text-slate-500 font-medium">/ {zone.totalSpots} free</span>
              </div>

              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full transition-all duration-500 ${
                    zone.status === 'plenty'
                      ? 'bg-emerald-500'
                      : zone.status === 'filling'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${zone.occupancyRate}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {zone.gateDistanceMinutes}m walk
                </span>
                <span className="font-mono">{zone.occupancyRate}% filled</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Zone Overview Banner & Predictive Insight */}
      {currentZone && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-slate-900">{currentZone.name}</h2>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusColor(currentZone.status)}`}>
                  {currentZone.status === 'plenty'
                    ? 'Plenty of Stalls'
                    : currentZone.status === 'filling'
                    ? 'Filling Rapidly'
                    : 'At Full Capacity'}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {currentZone.location}
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl">{currentZone.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-alert-zone"
                onClick={() => onOpenAlertsForZone(currentZone.zoneId)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>Notify me when spot opens</span>
              </button>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="flex items-center gap-1 text-slate-700">
                  <Zap className="w-3.5 h-3.5 text-cyan-600" />
                  <strong>{currentZone.evFree}</strong> EV
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 text-slate-700">
                  <Accessibility className="w-3.5 h-3.5 text-blue-600" />
                  <strong>{currentZone.accessibleFree}</strong> ADA
                </span>
              </div>
            </div>
          </div>

          {/* Predictive Note Box (Core Requirement) */}
          <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-blue-50/70 border border-emerald-200/70 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-900">Predictive Parking Advisory: </span>
              <span className="text-slate-700">{currentZone.predictiveFillNote}</span>
              {currentZone.estimatedFillTime && (
                <span className="font-semibold text-amber-800 ml-1.5 bg-amber-100/70 px-2 py-0.5 rounded">
                  {currentZone.estimatedFillTime}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Controls & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Floor Switcher (for multi-level garages like Zone A) */}
        {availableFloors.length > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Level:
            </span>
            <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
              {availableFloors.map((floor) => (
                <button
                  key={floor}
                  id={`floor-btn-${floor}`}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    selectedFloor === floor
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Floor {floor} ({spotsInZone.filter((s) => s.floorLevel === floor && s.status === 'free').length} free)
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" /> Surface Parking Grid
          </div>
        )}

        {/* Filter by spot type */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="w-3 h-3" /> Filter:
          </div>

          <select
            id="filter-spot-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Stall Types</option>
            <option value="standard">Standard Vehicle</option>
            <option value="ev">⚡ EV Charger Only</option>
            <option value="accessible">♿ ADA Accessible</option>
            <option value="faculty">🛡️ Faculty / Staff</option>
            <option value="motorcycle">🏍️ Motorcycle</option>
          </select>

          <select
            id="filter-spot-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Availability</option>
            <option value="free">🟢 Free Stalls Only</option>
            <option value="occupied">🔴 Occupied Only</option>
          </select>

          <input
            id="search-spot-input"
            type="text"
            placeholder="Search spot # (e.g. A-1A1)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 sm:w-44"
          />
        </div>
      </div>

      {/* Visual Parking Stalls Canvas */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-inner text-white">
        {/* Asphalt Lane Marker Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>DRIVE AISLE / ENTRY LANE &bull; SPEED LIMIT 5 MPH</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold">
              {filteredSpots.filter((s) => s.status === 'free').length} FREE NOW
            </span>
            <span>&bull;</span>
            <span>{filteredSpots.length} TOTAL IN VIEW</span>
          </div>
        </div>

        {/* Parking Grid Stalls */}
        <div className="py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
            {filteredSpots.map((spot) => {
              const isFree = spot.status === 'free';
              const isOccupied = spot.status === 'occupied';
              const typeBadge = getSpotTypeBadge(spot.type);
              const TypeIcon = typeBadge.icon;

              return (
                <button
                  key={spot.id}
                  id={`spot-cell-${spot.code}`}
                  onClick={() => onSelectSpot(spot)}
                  className={`group relative rounded-xl p-3 flex flex-col justify-between h-36 border-2 transition-all duration-200 text-left cursor-pointer overflow-hidden ${
                    isFree
                      ? 'bg-slate-800/90 border-emerald-500/80 hover:border-emerald-400 hover:bg-slate-800 hover:scale-[1.02] shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : isOccupied
                      ? 'bg-slate-950/90 border-slate-800 hover:border-slate-700 opacity-90'
                      : 'bg-amber-950/40 border-amber-500/50'
                  }`}
                >
                  {/* Top: Spot Code and Type Icon */}
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono font-bold text-xs text-slate-200 tracking-tight">
                      {spot.code}
                    </span>
                    <span
                      title={typeBadge.label}
                      className={`p-1 rounded-md border text-[10px] ${
                        spot.type === 'ev'
                          ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                          : spot.type === 'accessible'
                          ? 'bg-blue-950 text-blue-400 border-blue-800'
                          : spot.type === 'faculty'
                          ? 'bg-purple-950 text-purple-400 border-purple-800'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <TypeIcon className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Center Visual: Car Silhouette or Open Target */}
                  <div className="flex-1 flex flex-col items-center justify-center my-1">
                    {isFree ? (
                      <div className="text-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-1 group-hover:scale-110 transition-transform">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-[11px] font-black tracking-wider uppercase text-emerald-400 font-mono">
                          VACANT
                        </span>
                      </div>
                    ) : isOccupied ? (
                      <div className="text-center">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-1 text-slate-400">
                          <Car className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 truncate max-w-[80px] block">
                          {spot.occupiedVehicleType || 'Parked'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                        <span className="text-[10px] font-semibold text-amber-400 uppercase">
                          {spot.status}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Sensor indicator & Battery / Level */}
                  <div className="w-full pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate text-slate-500">
                      {spot.row}
                    </span>
                    <span
                      className={`font-semibold ${
                        isFree ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {spot.batteryLevel}%
                    </span>
                  </div>

                  {/* Parking stall boundary lines (yellow pavement line visual) */}
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-yellow-500/30 rounded-r" />
                  <div className="absolute right-0 top-2 bottom-2 w-1 bg-yellow-500/30 rounded-l" />
                </button>
              );
            })}
          </div>

          {filteredSpots.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">
              No parking stalls matched your current filter criteria.
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <strong className="text-slate-200">Vacant / Available</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-700" />
              <strong className="text-slate-300">Occupied</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>EV Charger</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Accessibility className="w-3.5 h-3.5 text-blue-400" />
              <span>ADA Stall</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Faculty Permit</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-500">
            Click any stall to inspect sensor diagnostics or override state
          </div>
        </div>
      </div>
    </div>
  );
};
