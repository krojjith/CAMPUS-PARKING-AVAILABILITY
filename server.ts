/**
 * @file server.ts
 * @description Main Express & WebSocket server for ParkCampus Real-Time Parking Availability System.
 *
 * System Architecture:
 * 1. Multiplexed Server: Shares a single HTTP server on port 3000 between Express (REST APIs &
 *    Vite dev middleware/static assets) and WebSocketServer (/ws).
 * 2. Real-Time Telemetry Broadcasting: Hooked directly into the ParkingStore event emitter to push
 *    spot status updates simultaneously over WebSocket and Server-Sent Events (SSE).
 * 3. IoT Ingestion: Receives HTTP POST updates from physical ESP32 microcontrollers, camera edge
 *    nodes, or the built-in simulator engine.
 *
 * API Endpoints:
 * - GET  /api/zones                  : Returns live occupancy summaries across all zones
 * - GET  /api/zones/:id/availability : Detailed zone breakdown including individual spots
 * - GET  /api/spots                  : Catalog of all parking spots across campus
 * - POST /api/update                 : Core sensor/camera ingestion endpoint
 * - POST /api/simulator/toggle       : Starts/pauses automated traffic generation
 * - POST /api/simulator/config       : Configures simulation frequency, rush mode, probability
 * - POST /api/simulator/step         : Forces a single manual arrival or departure step
 * - POST /api/reset                  : Resets all spots to baseline configuration
 * - GET  /api/stream                 : Server-Sent Events (SSE) push stream
 * - WS   /ws                         : Bi-directional WebSocket endpoint
 */

import http from 'http';
import path from 'path';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { parkingStore } from './server/store';
import { SensorUpdatePayload } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser for incoming sensor telemetry payloads
  app.use(express.json());

  /**
   * Create a standard Node.js HTTP server.
   * Both Express REST routes and the WebSocketServer will attach to this server instance.
   */
  const server = http.createServer(app);

  /**
   * WebSocket Server mounted on path '/ws'.
   * Handles real-time bi-directional messaging with client applications.
   */
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    // 1. Immediately send full snapshot to newly connected client
    const initialPayload = {
      type: 'INITIAL_SYNC',
      timestamp: new Date().toISOString(),
      payload: {
        zones: parkingStore.getAllZones(),
        spots: parkingStore.getAllSpots(),
        simulatorConfig: parkingStore.simulatorConfig,
      },
    };
    ws.send(JSON.stringify(initialPayload));

    // 2. Listen for incoming client messages (e.g. manual status changes, simulation triggers)
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'UPDATE_SPOT') {
          parkingStore.updateSpot(data.payload);
        } else if (data.type === 'SIMULATOR_STEP') {
          parkingStore.triggerSimulatorStep(data.payload?.zoneId, data.payload?.action);
        }
      } catch (err) {
        console.error('[WebSocket] Error parsing incoming client message:', err);
      }
    });

    ws.on('error', (err) => {
      console.warn('[WebSocket] Client connection error:', err);
    });
  });

  /**
   * SSE (Server-Sent Events) active response connections pool.
   * Provides streaming push capability for clients where WebSockets may be restricted.
   */
  const sseClients: Response[] = [];

  /**
   * Subscribe to ParkingStore event bus.
   * Whenever a spot state changes (sensor update, arrival, departure, or manual toggle),
   * broadcast the delta payload to all active WebSockets and SSE streams.
   */
  parkingStore.subscribe((event) => {
    const serialized = JSON.stringify(event);

    // Broadcast to open WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });

    // Broadcast to connected SSE response streams
    for (let i = sseClients.length - 1; i >= 0; i--) {
      const res = sseClients[i];
      try {
        res.write(`data: ${serialized}\n\n`);
      } catch {
        // Remove dead connections from pool
        sseClients.splice(i, 1);
      }
    }
  });

  // ==========================================
  // REST API Routes
  // ==========================================

  /**
   * GET /api/zones
   * @description Returns live availability metrics across all campus parking zones.
   * Consumed by the Roadside Entrance Display Board kiosk and the Student Mobile App.
   * @route GET /api/zones
   * @returns 200 OK with array of ZoneAvailability and server ISO timestamp
   */
  app.get('/api/zones', (_req: Request, res: Response) => {
    const zones = parkingStore.getAllZones();
    res.json({ zones, timestamp: new Date().toISOString() });
  });

  /**
   * GET /api/zones/:id
   * @description Returns summary metrics and capacity breakdown for a specific zone.
   * Normalizes case and trims whitespace from the input parameter.
   * @route GET /api/zones/:id
   * @param id Zone identifier string (e.g., 'zone-a', 'zone-b', 'zone-c', 'zone-d')
   * @returns 200 OK with ZoneAvailability object
   * @returns 404 Not Found if zone ID does not match any zone on campus
   */
  app.get('/api/zones/:id', (req: Request, res: Response) => {
    const rawId = req.params.id || '';
    const zoneId = rawId.toLowerCase().trim();
    const summary = parkingStore.calculateZoneSummary(zoneId);
    if (!summary) {
      return res.status(404).json({ error: `Zone with ID '${rawId}' not found.` });
    }
    res.json(summary);
  });

  /**
   * GET /api/zones/:id/availability
   * @description Returns detailed availability metrics along with the complete spot array for a zone.
   * Ideal for rendering localized lot layout diagrams and stall grids.
   * @route GET /api/zones/:id/availability
   * @param id The zone identifier (e.g. 'zone-a', 'zone-b')
   * @returns 200 OK with ParkingZoneDetail object containing `spots: ParkingSpot[]`
   * @returns 404 Not Found if zone ID is unknown
   */
  app.get('/api/zones/:id/availability', (req: Request, res: Response) => {
    const rawId = req.params.id || '';
    const zoneId = rawId.toLowerCase().trim();
    const detail = parkingStore.getZoneDetail(zoneId);
    if (!detail) {
      return res.status(404).json({ error: `Zone with ID '${rawId}' not found.` });
    }
    res.json(detail);
  });

  /**
   * GET /api/spots
   * @description Returns the complete list of all 112 parking spots campus-wide.
   * Supports optional query filtering by zone via `?zone=zone-a`.
   * @route GET /api/spots
   * @query zone Optional zoneId to filter results
   * @returns 200 OK with array of ParkingSpot objects
   */
  app.get('/api/spots', (req: Request, res: Response) => {
    const zoneQuery = req.query.zone as string | undefined;
    let allSpots = parkingStore.getAllSpots();
    if (zoneQuery) {
      const normalizedZone = zoneQuery.toLowerCase().trim();
      allSpots = allSpots.filter((s) => s.zoneId === normalizedZone);
    }
    res.json({ spots: allSpots });
  });

  /**
   * POST /api/update
   * @description Core ingestion endpoint for ultrasonic sensors, IR sensors, camera nodes,
   * and the simulated traffic generator.
   *
   * Request Body:
   * - spotId (required): string (e.g., "A-1A1")
   * - status (required): 'free' | 'occupied' | 'reserved' | 'maintenance'
   * - sensorId (optional): string identifier for physical device
   * - battery (optional): integer 0-100 representing battery percentage
   * - source (optional): 'sensor' | 'camera' | 'simulator' | 'manual'
   * - vehicleType (optional): string describing vehicle class
   */
  app.post('/api/update', (req: Request, res: Response) => {
    const { spotId, status, sensorId, battery, source, vehicleType } = req.body as SensorUpdatePayload;

    // Validate required fields
    if (!spotId || !status) {
      return res.status(400).json({ error: 'Missing required fields: spotId and status are required.' });
    }

    // Validate enum constraints
    if (!['free', 'occupied', 'reserved', 'maintenance'].includes(status)) {
      return res.status(400).json({
        error: `Invalid status '${status}'. Must be 'free', 'occupied', 'reserved', or 'maintenance'.`,
      });
    }

    // Update spot in authoritative data store
    const result = parkingStore.updateSpot({
      spotId,
      status,
      sensorId,
      battery,
      source: source || 'sensor',
      vehicleType,
    });

    if (!result.success) {
      return res.status(404).json({ error: `Spot '${spotId}' not found.` });
    }

    res.json({
      success: true,
      message: `Spot ${spotId} set to ${status}`,
      spot: result.spot,
      zone: result.zoneSummary,
    });
  });

  /**
   * POST /api/simulator/toggle
   * @description Starts or pauses the automated traffic generation loop.
   */
  app.post('/api/simulator/toggle', (_req: Request, res: Response) => {
    const current = parkingStore.simulatorConfig.active;
    const updated = parkingStore.setSimulatorConfig({ active: !current });
    res.json({ success: true, config: updated });
  });

  /**
   * POST /api/simulator/config
   * @description Adjusts simulation parameters: cycle interval, rush hour mode, transition probability.
   */
  app.post('/api/simulator/config', (req: Request, res: Response) => {
    const { intervalMs, rushMode, changeProbability } = req.body;
    const updated = parkingStore.setSimulatorConfig({
      ...(intervalMs !== undefined && { intervalMs: Number(intervalMs) }),
      ...(rushMode !== undefined && { rushMode }),
      ...(changeProbability !== undefined && { changeProbability: Number(changeProbability) }),
    });
    res.json({ success: true, config: updated });
  });

  /**
   * POST /api/simulator/step
   * @description Triggers an immediate single vehicle arrival or departure on demand.
   */
  app.post('/api/simulator/step', (req: Request, res: Response) => {
    const { zoneId, action } = req.body || {};
    const result = parkingStore.triggerSimulatorStep(zoneId, action);
    res.json({ success: true, result });
  });

  /**
   * POST /api/reset
   * @description Resets all spots and zones to standard baseline configuration.
   */
  app.post('/api/reset', (_req: Request, res: Response) => {
    const result = parkingStore.resetBaseline();
    res.json(result);
  });

  /**
   * GET /api/stream
   * @description Server-Sent Events (SSE) push endpoint.
   * Kept open for persistent server-to-client event streaming.
   */
  app.get('/api/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial snapshot
    const initialPayload = {
      type: 'INITIAL_SYNC',
      timestamp: new Date().toISOString(),
      payload: {
        zones: parkingStore.getAllZones(),
        spots: parkingStore.getAllSpots(),
        simulatorConfig: parkingStore.simulatorConfig,
      },
    };
    res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);

    sseClients.push(res);

    // Keepalive heartbeat ping every 15s to prevent intermediary proxy timeouts
    const pingTimer = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(pingTimer);
      const index = sseClients.indexOf(res);
      if (index !== -1) {
        sseClients.splice(index, 1);
      }
    });
  });

  // ==========================================
  // Vite Integration / Production Serving
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start HTTP and WebSocket listener on 0.0.0.0:3000
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ParkCampus] Real-time server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ParkCampus] Fatal server startup error:', err);
  process.exit(1);
});
