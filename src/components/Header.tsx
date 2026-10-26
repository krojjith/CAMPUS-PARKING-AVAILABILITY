/**
 * @file src/components/Header.tsx
 * @description Primary top-navigation header for the ParkCampus application.
 *
 * Capabilities:
 * - View Switching: Smooth transitions between Campus Map (student), Entrance Board (kiosk),
 *   Sensors & Simulator (hardware engineering), and Historical Trends (analytics/admin).
 * - System Health Telemetry: Live WebSocket/SSE streaming indicator (Green = active, Red = reconnecting).
 * - Real-Time Simulation Control: Quick toggle to pause/resume background traffic generation.
 * - Alert Center Trigger: Counter badge indicating active parking alert subscriptions.
 * - Technical Review Modal: One-click access to the in-app Review 2 Documentation, API tester,
 *   database schema explorer, and Error Boundary testing harness.
 */

import React from 'react';
import {
  Car,
  Tv,
  Cpu,
  BarChart3,
  Bell,
  Wifi,
  WifiOff,
  BookOpen,
  FileCode,
  GraduationCap,
} from 'lucide-react';
import { SimulatorConfig } from '../types';

interface HeaderProps {
  /** Currently active view in application */
  currentView: 'student' | 'entrance' | 'hardware' | 'analytics';
  /** State setter to change views */
  setCurrentView: (view: 'student' | 'entrance' | 'hardware' | 'analytics') => void;
  /** WebSocket/SSE connection health flag */
  isConnected: boolean;
  /** Current simulator settings */
  simulatorConfig: SimulatorConfig;
  /** Number of active alert subscriptions configured by the user */
  activeAlertsCount: number;
  /** Opens user alert subscription modal */
  onOpenAlerts: () => void;
  /** Toggles simulator on/off */
  onToggleSimulator: () => void;
  /** Opens technical documentation and review modal with optional tab */
  onOpenDocs: (tab?: 'report' | 'api' | 'schema' | 'testing' | 'boundaries' | 'hardware') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  isConnected,
  simulatorConfig,
  activeAlertsCount,
  onOpenAlerts,
  onToggleSimulator,
  onOpenDocs,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-sm ring-1 ring-emerald-500/20">
              <Car className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">ParkCampus</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                  Live IoT
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Campus Real-Time Parking Availability & Guidance
              </p>
            </div>
          </div>

          {/* Navigation Modes */}
          <nav className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              id="nav-student-view"
              onClick={() => setCurrentView('student')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'student'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Campus Map</span>
            </button>

            <button
              id="nav-entrance-view"
              onClick={() => setCurrentView('entrance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'entrance'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Entrance Board</span>
            </button>

            <button
              id="nav-hardware-view"
              onClick={() => setCurrentView('hardware')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'hardware'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sensors &</span> Simulator
            </button>

            <button
              id="nav-analytics-view"
              onClick={() => setCurrentView('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'analytics'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trends</span>
            </button>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Student Phase Report & Repo Button */}
            <button
              id="header-student-report-button"
              onClick={() => onOpenDocs('report')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-xs transition-colors"
              title="Open Student Phase Report, Submission Details & GitHub Repo"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Phase Report &amp; Repo</span>
              <span className="sm:hidden">Report</span>
            </button>

            {/* Tech Docs & Review 2 Spec Modal Button */}
            <button
              id="header-tech-docs-button"
              onClick={() => onOpenDocs('api')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 shadow-xs transition-colors"
              title="Open Technical Documentation, API Reference, Schema & Testing Spec"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden xl:inline">Tech Docs &amp; Review 2</span>
              <span className="xl:hidden">Docs</span>
            </button>

            {/* Live simulator quick toggle */}
            <button
              id="header-simulator-toggle"
              onClick={onToggleSimulator}
              title={simulatorConfig.active ? 'Simulation running: click to pause' : 'Simulation paused: click to resume'}
              className={`hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                simulatorConfig.active
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${simulatorConfig.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>Sim: {simulatorConfig.active ? 'Active' : 'Paused'}</span>
            </button>

            {/* Notification alert button */}
            <button
              id="header-alerts-button"
              onClick={onOpenAlerts}
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="Manage Spot Availability Alerts"
            >
              <Bell className="w-4 h-4" />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            {/* Connection status indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-rose-50 text-rose-700 border-rose-200/80'
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Live Stream</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Reconnecting</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
