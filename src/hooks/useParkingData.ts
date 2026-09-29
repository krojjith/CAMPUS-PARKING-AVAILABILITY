/**
 * @file src/hooks/useParkingData.ts
 * @description Master React hook managing real-time parking data synchronization,
 * dual-transport streaming (WebSocket + SSE fallback), sensor alert subscriptions,
 * and audio chime synthesis.
 *
 * Synchronization Lifecycle:
 * 1. Initial State Fetch: Asynchronously fetches `/api/zones` and `/api/spots` via REST.
 * 2. Primary Stream: Connects to `ws://${host}/ws` for low-latency bi-directional updates.
 * 3. Secondary Stream (Fallback): If WebSocket drops or is blocked by network proxies,
 *    automatically opens an `EventSource` connection to `/api/stream` (SSE).
 * 4. Safety Polling: Executes periodic sync every 10 seconds to reconcile any drift.
 * 5. Audio Notifications: Evaluates user alert criteria on every spot transition
 *    (e.g., alert when Zone B EV spot frees up) and triggers synthesizer audio chime.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ParkingSpot,
  ZoneAvailability,
  SimulatorConfig,
  SensorUpdatePayload,
  UserAlertSubscription,
  TelemetryLogItem,
} from '../types';
import { playSpotNotificationSound } from '../utils/audio';

export function useParkingData() {
  /** Array of all 4 campus parking zones with aggregated occupancy metrics */
  const [zones, setZones] = useState<ZoneAvailability[]>([]);
  /** Array of all 112 individual parking spots campus-wide */
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  /** Currently selected zone in map view (default: 'zone-a') */
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone-a');
  /** Currently inspected spot for modal inspector */
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  /** Live connection status indicator (WebSocket or SSE connected) */
  const [isConnected, setIsConnected] = useState<boolean>(false);
  /** Real-time simulator engine settings */
  const [simulatorConfig, setSimulatorConfig] = useState<SimulatorConfig>({
    active: true,
    intervalMs: 4000,
    rushMode: 'off',
    changeProbability: 0.45,
  });
  /** In-memory ring buffer of the last 50 telemetry arrival/departure events */
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLogItem[]>([]);
  /** User-configured parking spot availability alert subscriptions stored in localStorage */
  const [userAlerts, setUserAlerts] = useState<UserAlertSubscription[]>(() => {
    try {
      const saved = localStorage.getItem('parkcampus_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  /** Active banner notification shown when an alert condition is satisfied */
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    message: string;
    zoneName: string;
    time: string;
  } | null>(null);

  /** WebSocket and EventSource persistent refs */
  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const userAlertsRef = useRef(userAlerts);
  userAlertsRef.current = userAlerts;

  /**
   * Persist user alerts to browser local storage.
   */
  useEffect(() => {
    try {
      localStorage.setItem('parkcampus_alerts', JSON.stringify(userAlerts));
    } catch (e) {
      console.error('[useParkingData] Failed to save alerts to local storage:', e);
    }
  }, [userAlerts]);

  /**
   * Loads initial state snapshot from REST API endpoints.
   */
  const loadInitialData = useCallback(async () => {
    try {
      const [zonesRes, spotsRes] = await Promise.all([
        fetch('/api/zones'),
        fetch('/api/spots'),
      ]);
      if (zonesRes.ok && spotsRes.ok) {
        const zonesData = await zonesRes.json();
        const spotsData = await spotsRes.json();
        setZones(zonesData.zones || []);
        setSpots(spotsData.spots || []);
      }
    } catch (err) {
      console.warn('[useParkingData] Initial fetch warning (server starting):', err);
    }
  }, []);

  /**
   * Processes incoming real-time events from either WebSocket or SSE.
   */
  const handleIncomingEvent = useCallback((event: any) => {
    if (!event || !event.type) return;

    if (event.type === 'INITIAL_SYNC') {
      if (event.payload?.zones) setZones(event.payload.zones);
      if (event.payload?.spots) setSpots(event.payload.spots);
      if (event.payload?.simulatorConfig) setSimulatorConfig(event.payload.simulatorConfig);
    } else if (event.type === 'SPOT_UPDATE') {
      const { spot, previousStatus, zoneSummary, source } = event.payload;
      if (!spot) return;

      // Update spot in state
      setSpots((prev) => prev.map((s) => (s.id === spot.id ? spot : s)));

      // If this spot is currently selected in inspector modal, keep it fresh
      setSelectedSpot((curr) => (curr && curr.id === spot.id ? spot : curr));

      // Update zone summary if provided
      if (zoneSummary) {
        setZones((prev) => prev.map((z) => (z.zoneId === zoneSummary.zoneId ? zoneSummary : z)));
      }

      // Append to telemetry audit log
      const actionType = spot.status === 'occupied' ? 'arrived' : spot.status === 'free' ? 'departed' : 'manual';
      const logItem: TelemetryLogItem = {
        id: `${spot.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        spotId: spot.code,
        zoneCode: spot.zoneId.toUpperCase().replace('ZONE-', 'ZONE '),
        action: actionType,
        status: spot.status,
        source: source || 'sensor',
        battery: spot.batteryLevel,
      };

      setTelemetryLogs((prev) => [logItem, ...prev.slice(0, 49)]);

      // Check if user has an alert for this zone and a spot just opened up!
      if (previousStatus === 'occupied' && spot.status === 'free') {
        const matchedAlert = userAlertsRef.current.find(
          (a) => a.zoneId === spot.zoneId && (!a.spotType || a.spotType === spot.type)
        );

        if (matchedAlert) {
          playSpotNotificationSound();
          const zoneName = zoneSummary?.name || spot.zoneId;
          setActiveNotification({
            id: `alert-${Date.now()}`,
            message: `Spot ${spot.code} (${spot.type.toUpperCase()}) just opened up!`,
            zoneName,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      }
    } else if (event.type === 'BATCH_UPDATE') {
      if (event.payload?.zones) setZones(event.payload.zones);
      if (event.payload?.spots) setSpots(event.payload.spots);
    } else if (event.type === 'SIMULATOR_STATE') {
      setSimulatorConfig(event.payload);
    }
  }, []);

  /**
   * Dual-transport streaming setup: WebSocket with automated Server-Sent Events fallback.
   */
  useEffect(() => {
    loadInitialData();

    let isMounted = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
        };

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            handleIncomingEvent(data);
          } catch (e) {
            console.error('[useParkingData] Failed to parse WS message:', e);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          // Try fallback to SSE if WS drops
          setupSSEFallback();
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setupSSEFallback();
      }
    };

    const setupSSEFallback = () => {
      if (sseRef.current) return;
      try {
        const sse = new EventSource('/api/stream');
        sseRef.current = sse;

        sse.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
        };

        sse.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleIncomingEvent(data);
          } catch {
            // Ignore keepalive comment lines
          }
        };

        sse.onerror = () => {
          setIsConnected(false);
        };
      } catch (e) {
        console.error('[useParkingData] SSE fallback error:', e);
      }
    };

    connectWebSocket();

    // Periodic safety poll every 10s to guard against connection silent drops
    const pollTimer = setInterval(() => {
      loadInitialData();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [loadInitialData, handleIncomingEvent]);

  // ==========================================
  // Public Client Actions
  // ==========================================

  /**
   * Updates spot status via POST /api/update.
   */
  const updateSpotStatus = async (payload: SensorUpdatePayload) => {
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      console.error('[useParkingData] Failed to update spot:', err);
      return { success: false, error: err };
    }
  };

  /**
   * Toggles the server-side traffic simulator on/off.
   */
  const toggleSimulator = async () => {
    try {
      const res = await fetch('/api/simulator/toggle', { method: 'POST' });
      const data = await res.json();
      if (data.config) {
        setSimulatorConfig(data.config);
      }
    } catch (err) {
      console.error('[useParkingData] Failed to toggle simulator:', err);
    }
  };

  /**
   * Updates simulator speed, rush mode, or transition probability.
   */
  const updateSimulatorConfig = async (newConfig: Partial<SimulatorConfig>) => {
    try {
      const res = await fetch('/api/simulator/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      const data = await res.json();
      if (data.config) {
        setSimulatorConfig(data.config);
      }
    } catch (err) {
      console.error('[useParkingData] Failed to update simulator config:', err);
    }
  };

  /**
   * Triggers a manual single step (vehicle arrival or departure).
   */
  const triggerSimulatorStep = async (zoneId?: string, action?: 'arrive' | 'depart') => {
    try {
      await fetch('/api/simulator/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId, action }),
      });
    } catch (err) {
      console.error('[useParkingData] Failed to step simulator:', err);
    }
  };

  /**
   * Resets all spots to standard baseline.
   */
  const resetToBaseline = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      await loadInitialData();
    } catch (err) {
      console.error('[useParkingData] Failed to reset to baseline:', err);
    }
  };

  /**
   * Subscribes user to a parking zone availability alert.
   */
  const addAlert = (zoneId: string, spotType?: any, label?: string) => {
    const newAlert: UserAlertSubscription = {
      id: `alert-${Date.now()}`,
      zoneId,
      spotType,
      createdAt: new Date().toISOString(),
      userLabel: label || `Alert for ${zoneId.toUpperCase()}`,
    };
    setUserAlerts((prev) => [...prev, newAlert]);
  };

  /**
   * Removes an alert subscription.
   */
  const removeAlert = (alertId: string) => {
    setUserAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  /**
   * Closes active notification banner.
   */
  const dismissActiveNotification = () => {
    setActiveNotification(null);
  };

  const currentZone = zones.find((z) => z.zoneId === selectedZoneId) || zones[0];
  const spotsInSelectedZone = spots.filter((s) => s.zoneId === selectedZoneId);

  return {
    zones,
    spots,
    selectedZoneId,
    setSelectedZoneId,
    currentZone,
    spotsInSelectedZone,
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
    refresh: loadInitialData,
  };
}
