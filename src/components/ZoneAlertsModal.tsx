import React, { useState } from 'react';
import {
  X,
  Bell,
  Trash2,
  Volume2,
  Sparkles,
  Zap,
  Accessibility,
  Plus,
  CheckCircle,
  Play,
} from 'lucide-react';
import { UserAlertSubscription, ZoneAvailability, SpotType } from '../types';
import { playSpotNotificationSound } from '../utils/audio';

interface ZoneAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: ZoneAvailability[];
  alerts: UserAlertSubscription[];
  onAddAlert: (zoneId: string, spotType?: SpotType, label?: string) => void;
  onRemoveAlert: (alertId: string) => void;
  onTriggerTestDeparture: (zoneId: string) => void;
  defaultZoneId?: string;
}

export const ZoneAlertsModal: React.FC<ZoneAlertsModalProps> = ({
  isOpen,
  onClose,
  zones,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onTriggerTestDeparture,
  defaultZoneId = 'zone-b',
}) => {
  if (!isOpen) return null;

  const [selectedZone, setSelectedZone] = useState<string>(defaultZoneId);
  const [selectedType, setSelectedType] = useState<string>('any');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [testNotificationSuccess, setTestNotificationSuccess] = useState<boolean>(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const typeArg = selectedType === 'any' ? undefined : (selectedType as SpotType);
    const targetZoneObj = zones.find((z) => z.zoneId === selectedZone);
    const label = customLabel.trim() || `Alert for ${targetZoneObj?.name || selectedZone}`;
    onAddAlert(selectedZone, typeArg, label);
    setCustomLabel('');
  };

  const handleTestChime = () => {
    playSpotNotificationSound();
    setTestNotificationSuccess(true);
    setTimeout(() => setTestNotificationSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Spot Availability Alerts</h3>
              <p className="text-xs text-slate-600">
                Get notified with sound & banner when a spot frees up
              </p>
            </div>
          </div>

          <button
            id="alerts-modal-close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Create Alert Form */}
          <form onSubmit={handleCreate} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Create New Availability Watch</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Target Parking Lot / Zone
                </label>
                <select
                  id="alert-zone-select"
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {zones.map((z) => (
                    <option key={z.zoneId} value={z.zoneId}>
                      {z.name} ({z.freeSpots} free)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Spot Type Requirement
                </label>
                <select
                  id="alert-type-select"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="any">Any Free Spot</option>
                  <option value="ev">⚡ EV Fast Charger Only</option>
                  <option value="accessible">♿ ADA Accessible Only</option>
                  <option value="standard">Standard Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Custom Reminder Note (Optional)
              </label>
              <input
                id="alert-custom-label-input"
                type="text"
                placeholder="e.g., Morning commute to Physics Lab"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <button
              id="alert-submit-btn"
              type="submit"
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Subscribe to Zone Alert</span>
            </button>
          </form>

          {/* Active Alerts List */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
              <span>Active Subscriptions ({alerts.length})</span>
              <button
                id="test-chime-btn"
                type="button"
                onClick={handleTestChime}
                className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 hover:underline"
              >
                <Volume2 className="w-3 h-3" /> Test Chime
              </button>
            </div>

            {testNotificationSuccess && (
              <div className="mb-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle className="w-3.5 h-3.5" /> Chime sound played! Your alerts are ready.
              </div>
            )}

            {alerts.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                No active parking alerts. Select a zone above and click subscribe to get notified immediately when a vehicle leaves!
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => {
                  const z = zones.find((item) => item.zoneId === alert.zoneId);
                  const freeCount =
                    alert.spotType === 'ev'
                      ? z?.evFree
                      : alert.spotType === 'accessible'
                      ? z?.accessibleFree
                      : z?.freeSpots;

                  return (
                    <div
                      key={alert.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {alert.userLabel}
                          </span>
                          {alert.spotType && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase">
                              {alert.spotType}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{z?.name || alert.zoneId}</span>
                          <span>&bull;</span>
                          <span className="text-emerald-700 font-semibold">
                            Currently: {freeCount ?? 0} spots open
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Demo button to trigger a departure in this zone so user can experience the alert */}
                        <button
                          id={`test-depart-${alert.id}`}
                          onClick={() => onTriggerTestDeparture(alert.zoneId)}
                          title="Simulate a car leaving this lot to trigger notification"
                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1"
                        >
                          <Play className="w-2.5 h-2.5" /> Test Alert
                        </button>

                        <button
                          id={`delete-alert-${alert.id}`}
                          onClick={() => onRemoveAlert(alert.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove alert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
