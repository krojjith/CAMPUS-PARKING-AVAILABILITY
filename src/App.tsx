/**
 * @file src/App.tsx
 * @description Master application container for ParkCampus Real-Time Parking Availability System.
 *
 * System Features:
 * - Multi-View Architecture:
 *   - Student / Driver View: Interactive campus lot map with stall-level status (Free/Occupied/Reserved/EV/ADA).
 *   - Entrance Display Board: Full-screen high-contrast digital kiosk designed for lot entrances.
 *   - Sensors & Simulator Drawer: Hardware engineering view, manual override, ESP32 code snippets,
 *     and live telemetry audit stream.
 *   - Analytics & Historical Trends: Peak-fill time curves, hourly occupancy trends, and facilities PIN controls.
 *   - Technical Review & Docs: Built-in Review 2 documentation, API testing, schema reference, and
 *     Error Boundary test sandbox.
 * - Error Resilience:
 *   - Top-level Root ErrorBoundary and granular SectionErrorBoundaries wrap every distinct view.
 *   - Failures in analytics charts or map rendering are safely contained without disrupting
 *     live telemetry feeds or other tabs.
 * - Reactive Notifications:
 *   - Real-time chime and audio synthesis when a requested parking spot opens up.
 */

import React, { useState } from 'react';
import { useParkingData } from './hooks/useParkingData';
import { Header } from './components/Header';
import { CampusLotMap } from './components/CampusLotMap';
import { EntranceBoard } from './components/EntranceBoard';
import { HardwareSimulatorDrawer } from './components/HardwareSimulatorDrawer';
import { AnalyticsView } from './components/AnalyticsView';
import { SpotDetailModal } from './components/SpotDetailModal';
import { ZoneAlertsModal } from './components/ZoneAlertsModal';
import { TechDocsModal } from './components/TechDocsModal';
import { ErrorBoundary, SectionErrorBoundary } from './components/ErrorBoundary';
import {
  Bell,
  X,
  FileCode,
} from 'lucide-react';

export default function App() {
  const {
    zones,
    spots,
    selectedZoneId,
    setSelectedZoneId,
    currentZone,
    selectedSpot,
    setSelectedSpot,
    isConnected,
    simulatorConfig,
    telemetryLogs,
    userAlerts,
    activeNotification,
    updateSpotStatus,
    toggleSimulator,
    updateSimulatorConfig,
    triggerSimulatorStep,
    resetToBaseline,
    addAlert,
    removeAlert,
    dismissActiveNotification,
  } = useParkingData();

  /** Navigation active view state */
  const [currentView, setCurrentView] = useState<'student' | 'entrance' | 'hardware' | 'analytics'>('student');
  /** Alert subscriptions management modal */
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);
  const [alertsDefaultZone, setAlertsDefaultZone] = useState<string>('zone-b');
  /** Technical Documentation & Review 2 Spec modal */
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);

  const handleOpenAlertsForZone = (zoneId: string) => {
    setAlertsDefaultZone(zoneId);
    setIsAlertsModalOpen(true);
  };

  return (
    <ErrorBoundary isRoot={true} sectionName="ParkCampus Core System">
      <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
        {/* Top Floating Notification Chime Banner */}
        {activeNotification && (
          <aside
            aria-label="Parking Alert"
            className="fixed top-18 right-4 z-50 max-w-md w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-amber-500/80 flex items-start justify-between gap-3 animate-in slide-in-from-top-4 duration-300 ring-4 ring-amber-500/20"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-black uppercase text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    SPOT OPENED
                  </span>
                  <span className="text-xs text-slate-400">{activeNotification.time}</span>
                </div>
                <h4 className="font-bold text-sm text-white mt-1">
                  {activeNotification.zoneName}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {activeNotification.message}
                </p>
              </div>
            </div>

            <button
              onClick={dismissActiveNotification}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </aside>
        )}

        {/* Main Header */}
        {currentView !== 'entrance' && (
          <Header
            currentView={currentView}
            setCurrentView={setCurrentView}
            isConnected={isConnected}
            simulatorConfig={simulatorConfig}
            activeAlertsCount={userAlerts.length}
            onOpenAlerts={() => setIsAlertsModalOpen(true)}
            onToggleSimulator={toggleSimulator}
            onOpenDocs={() => setIsDocsModalOpen(true)}
          />
        )}

        {/* Main Content Areas with Section-Level Error Boundaries */}
        <main className="flex-1">
          {currentView === 'entrance' && (
            <SectionErrorBoundary sectionName="Entrance Display Board">
              <EntranceBoard
                zones={zones}
                telemetryLogs={telemetryLogs}
                onExit={() => setCurrentView('student')}
              />
            </SectionErrorBoundary>
          )}

          {currentView === 'student' && (
            <SectionErrorBoundary sectionName="Campus Lot Map">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <CampusLotMap
                  zones={zones}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={setSelectedZoneId}
                  spots={spots}
                  onSelectSpot={setSelectedSpot}
                  onOpenAlertsForZone={handleOpenAlertsForZone}
                />
              </div>
            </SectionErrorBoundary>
          )}

          {currentView === 'hardware' && (
            <SectionErrorBoundary sectionName="Sensors & Hardware Simulator">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <HardwareSimulatorDrawer
                  simulatorConfig={simulatorConfig}
                  onToggleSimulator={toggleSimulator}
                  onUpdateConfig={updateSimulatorConfig}
                  onTriggerStep={triggerSimulatorStep}
                  onResetBaseline={resetToBaseline}
                  telemetryLogs={telemetryLogs}
                  spots={spots}
                  onManualSensorUpdate={updateSpotStatus}
                />
              </div>
            </SectionErrorBoundary>
          )}

          {currentView === 'analytics' && (
            <SectionErrorBoundary sectionName="Predictive Analytics & Historical Trends">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <AnalyticsView zones={zones} />
              </div>
            </SectionErrorBoundary>
          )}
        </main>

        {/* Footer */}
        {currentView !== 'entrance' && (
          <footer className="border-t border-slate-200 bg-white/70 py-6 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">ParkCampus System</span>
                <span>&bull;</span>
                <span>College Campus Real-Time Parking Availability & Guidance</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                <button
                  onClick={() => setIsDocsModalOpen(true)}
                  className="hover:text-slate-900 underline flex items-center gap-1"
                >
                  <FileCode className="w-3 h-3 text-emerald-600" />
                  <span>Review 2 Technical Docs</span>
                </button>
                <span>&bull;</span>
                <span>POST /api/update</span>
                <span>&bull;</span>
                <span className="text-emerald-600 font-semibold">Active Telemetry</span>
              </div>
            </div>
          </footer>
        )}

        {/* Modals & Dialogs */}
        <SpotDetailModal
          spot={selectedSpot}
          zoneName={currentZone?.name || 'Campus Lot'}
          onClose={() => setSelectedSpot(null)}
          onUpdateStatus={updateSpotStatus}
          onOpenAlertsForZone={handleOpenAlertsForZone}
        />

        <ZoneAlertsModal
          isOpen={isAlertsModalOpen}
          onClose={() => setIsAlertsModalOpen(false)}
          zones={zones}
          alerts={userAlerts}
          onAddAlert={addAlert}
          onRemoveAlert={removeAlert}
          onTriggerTestDeparture={(zoneId) => triggerSimulatorStep(zoneId, 'depart')}
          defaultZoneId={alertsDefaultZone}
        />

        <TechDocsModal
          isOpen={isDocsModalOpen}
          onClose={() => setIsDocsModalOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
