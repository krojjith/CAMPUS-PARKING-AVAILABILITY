/**
 * @file server/store.ts
 * @description In-memory Authoritative Data Store & Traffic Simulator for ParkCampus.
 *
 * Design & Architecture:
 * - Thread-Safe & In-Memory: Operates within Node.js single-threaded event loop, avoiding external
 *   database latency for instant real-time telemetry processing (<5ms response).
 * - Multi-Zone Hierarchy: Manages 4 campus zones (Zone A, B, C, D) totaling 112 parking spots.
 * - Reactive Event Bus: Dispatches granular delta events ('SPOT_UPDATE', 'SIMULATOR_STATE',
 *   'BATCH_UPDATE') to subscribers (WebSocket and SSE endpoints).
 * - Algorithmic Thresholds:
 *     - 'plenty'  : Free spots > 35% of zone total (Green)
 *     - 'filling' : Free spots between 12% and 35% (Amber/Yellow)
 *     - 'full'    : Free spots <= 12% of zone total (Red)
 * - Realistic Simulation Engine: Models peak campus traffic dynamics (morning arrival rush,
 *   evening departures, turnover intervals) with stochastic Markov-like transitions.
 */

import {
  ParkingSpot,
  ZoneAvailability,
  ParkingZoneDetail,
  SpotStatus,
  ZoneStatus,
  SimulatorConfig,
  SensorUpdatePayload,
} from '../src/types';

/**
 * Seed structure for initial zone bootstrapping.
 */
interface ZoneSeed {
  id: string;
  name: string;
  shortCode: string;
  location: string;
  description: string;
  gateDistanceMinutes: number;
  predictiveFillNote: string;
  totalSpots: number;
  floors: number;
  hourlyOccupancyBase: number[];
  spots: Array<{
    code: string;
    floorLevel: number;
    row: string;
    type: 'standard' | 'ev' | 'accessible' | 'faculty' | 'motorcycle';
    initialStatus: SpotStatus;
    sensorType: 'ultrasonic' | 'ir' | 'camera';
  }>;
}

/**
 * Campus Zone Seed Definitions:
 * - Zone A: North Multi-Level Garage (32 spots, 2 floors, EV fast chargers)
 * - Zone B: Science & Technology Lot (24 spots, surface lot, fast turnover)
 * - Zone C: Arts & Humanities Quad Lot (20 spots, surface lot, moderate fill)
 * - Zone D: Stadium West & Commuter Lot (36 spots, high capacity backup lot)
 */
const ZONE_SEEDS: ZoneSeed[] = [
  {
    id: 'zone-a',
    name: 'North Multi-Level Garage',
    shortCode: 'Zone A',
    location: 'North Gate, near STEM & Engineering Complex',
    description: 'Covered multi-story garage with Level 2 EV Fast Chargers and covered pedestrian walkway.',
    gateDistanceMinutes: 3,
    predictiveFillNote: 'Usually fills by 9:15 AM on weekdays during semester rush.',
    totalSpots: 32,
    floors: 2,
    hourlyOccupancyBase: [15, 25, 60, 92, 95, 88, 78, 65, 45, 20],
    spots: Array.from({ length: 32 }, (_, i) => {
      const floor = i < 16 ? 1 : 2;
      const row = floor === 1 ? (i < 8 ? 'A' : 'B') : (i < 24 ? 'C' : 'D');
      const num = (i % 8) + 1;
      const code = `A-${floor}${row}${num}`;
      let type: 'standard' | 'ev' | 'accessible' | 'faculty' | 'motorcycle' = 'standard';
      if (i < 4) type = 'accessible';
      else if (i < 10) type = 'ev';
      else if (i < 14) type = 'faculty';
      else if (i === 30 || i === 31) type = 'motorcycle';

      const initialStatus: SpotStatus = (i % 3 === 0 || i % 7 === 0) ? 'occupied' : 'free';
      return {
        code,
        floorLevel: floor,
        row,
        type,
        initialStatus,
        sensorType: i < 16 ? 'ultrasonic' : 'camera',
      };
    }),
  },
  {
    id: 'zone-b',
    name: 'Science & Technology Lot',
    shortCode: 'Zone B',
    location: 'Central Campus, adjacent to Library & Science Quad',
    description: 'High-turnover surface lot ideal for short lectures and lab visits.',
    gateDistanceMinutes: 1,
    predictiveFillNote: 'Peak occupancy 10:30 AM - 1:30 PM; fast turnover at :50 past the hour.',
    totalSpots: 24,
    floors: 1,
    hourlyOccupancyBase: [10, 35, 75, 88, 85, 90, 80, 50, 30, 10],
    spots: Array.from({ length: 24 }, (_, i) => {
      const row = i < 12 ? 'R1' : 'R2';
      const num = (i % 12) + 1;
      const code = `B-${row}-${num < 10 ? '0' + num : num}`;
      let type: 'standard' | 'ev' | 'accessible' | 'faculty' | 'motorcycle' = 'standard';
      if (i < 2) type = 'accessible';
      else if (i < 6) type = 'ev';
      else if (i < 9) type = 'faculty';

      const initialStatus: SpotStatus = (i % 2 === 0 || i === 5 || i === 11) ? 'occupied' : 'free';
      return {
        code,
        floorLevel: 1,
        row,
        type,
        initialStatus,
        sensorType: 'camera',
      };
    }),
  },
  {
    id: 'zone-c',
    name: 'Arts & Humanities Quad Lot',
    shortCode: 'Zone C',
    location: 'South Campus, behind Student Union & Performing Arts Center',
    description: 'Surface lot with generous stall spacing and direct path to Main Quad.',
    gateDistanceMinutes: 4,
    predictiveFillNote: 'Moderate fill rate; usually reaches ~70% capacity by midday.',
    totalSpots: 20,
    floors: 1,
    hourlyOccupancyBase: [8, 18, 42, 65, 72, 70, 60, 40, 22, 12],
    spots: Array.from({ length: 20 }, (_, i) => {
      const row = i < 10 ? 'West' : 'East';
      const num = (i % 10) + 1;
      const code = `C-${row[0]}${num < 10 ? '0' + num : num}`;
      let type: 'standard' | 'ev' | 'accessible' | 'faculty' | 'motorcycle' = 'standard';
      if (i === 0 || i === 1) type = 'accessible';
      else if (i === 2 || i === 3) type = 'ev';
      else if (i === 4 || i === 5) type = 'faculty';

      const initialStatus: SpotStatus = (i % 4 === 0) ? 'occupied' : 'free';
      return {
        code,
        floorLevel: 1,
        row,
        type,
        initialStatus,
        sensorType: 'ultrasonic',
      };
    }),
  },
  {
    id: 'zone-d',
    name: 'Stadium West & Commuter Lot',
    shortCode: 'Zone D',
    location: 'West Campus perimeter, adjacent to Athletic Arena',
    description: 'Large surface lot with guaranteed availability and free campus shuttle every 6 mins.',
    gateDistanceMinutes: 8,
    predictiveFillNote: 'Consistently has 40+ free spots throughout the day. Ideal backup for late arrivals.',
    totalSpots: 36,
    floors: 1,
    hourlyOccupancyBase: [5, 12, 28, 45, 52, 48, 40, 32, 18, 8],
    spots: Array.from({ length: 36 }, (_, i) => {
      const row = i < 18 ? 'North' : 'South';
      const num = (i % 18) + 1;
      const code = `D-${row[0]}${num < 10 ? '0' + num : num}`;
      let type: 'standard' | 'ev' | 'accessible' | 'faculty' | 'motorcycle' = 'standard';
      if (i < 3) type = 'accessible';
      else if (i < 9) type = 'ev';
      else if (i < 12) type = 'motorcycle';

      const initialStatus: SpotStatus = (i % 5 === 0) ? 'occupied' : 'free';
      return {
        code,
        floorLevel: 1,
        row,
        type,
        initialStatus,
        sensorType: 'ir',
      };
    }),
  },
];

/**
 * Authoritative in-memory state manager for parking spots, zones, and live telemetry.
 */
export class ParkingStore {
  /** Fast indexed spot lookups by spot ID */
  private spots: Map<string, ParkingSpot> = new Map();
  /** Static and dynamic metadata per zone */
  private zones: Map<string, ZoneSeed> = new Map();
  /** Active event listeners for real-time broadcasts */
  private eventSubscribers: Array<(event: any) => void> = [];
  /** NodeJS timer handle for background traffic simulation */
  private simulatorTimer: NodeJS.Timeout | null = null;

  /** Active simulation settings */
  public simulatorConfig: SimulatorConfig = {
    active: true,
    intervalMs: 4000,
    rushMode: 'off',
    changeProbability: 0.45,
  };

  constructor() {
    this.init();
    this.startSimulator();
  }

  /**
   * Initializes or resets spots and zones from seeds.
   */
  private init(): void {
    const now = new Date().toISOString();
    for (const z of ZONE_SEEDS) {
      this.zones.set(z.id, z);
      for (const s of z.spots) {
        const spotId = s.code;
        const vehicleTypes = ['Sedan', 'SUV', 'Compact EV', 'Hatchback', 'Pickup', 'Coupe'];
        const randomVehicle = s.initialStatus === 'occupied' ? vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)] : undefined;
        const spot: ParkingSpot = {
          id: spotId,
          zoneId: z.id,
          code: s.code,
          type: s.type,
          status: s.initialStatus,
          floorLevel: s.floorLevel,
          row: s.row,
          sensorId: `ESP32-${spotId.replace(/[^A-Za-z0-9]/g, '')}`,
          batteryLevel: Math.floor(75 + Math.random() * 25),
          signalQuality: Math.random() > 0.15 ? 'strong' : 'good',
          lastStatusChange: now,
          occupiedSince: s.initialStatus === 'occupied' ? new Date(Date.now() - Math.floor(Math.random() * 7200000)).toISOString() : undefined,
          occupiedVehicleType: randomVehicle,
        };
        this.spots.set(spotId, spot);
      }
    }
  }

  /**
   * Registers a subscriber callback to receive live telemetry events.
   * @returns Unsubscribe function
   */
  public subscribe(callback: (event: any) => void): () => void {
    this.eventSubscribers.push(callback);
    return () => {
      this.eventSubscribers = this.eventSubscribers.filter((cb) => cb !== callback);
    };
  }

  /**
   * Dispatches events to all registered WebSocket and SSE subscribers.
   */
  private broadcast(event: any): void {
    for (const cb of this.eventSubscribers) {
      try {
        cb(event);
      } catch (err) {
        console.error('[ParkingStore] Error in event subscriber callback:', err);
      }
    }
  }

  /**
   * Computes authoritative zone availability, occupancy rates, and visual status colors.
   *
   * Threshold Formula:
   * - freePercent > 35%  => 'plenty' (Green)
   * - 12% < freePercent <= 35% => 'filling' (Yellow/Amber)
   * - freePercent <= 12% => 'full' (Red)
   */
  public calculateZoneSummary(zoneId: string): ZoneAvailability | null {
    const seed = this.zones.get(zoneId);
    if (!seed) return null;

    const spotsInZone = Array.from(this.spots.values()).filter((s) => s.zoneId === zoneId);
    const totalSpots = spotsInZone.length;
    const freeSpots = spotsInZone.filter((s) => s.status === 'free').length;
    const occupiedSpots = spotsInZone.filter((s) => s.status === 'occupied').length;
    const reservedSpots = spotsInZone.filter((s) => s.status === 'reserved').length;
    const maintenanceSpots = spotsInZone.filter((s) => s.status === 'maintenance').length;

    const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;
    const freePercent = totalSpots > 0 ? (freeSpots / totalSpots) * 100 : 0;

    let status: ZoneStatus = 'plenty';
    if (freePercent <= 12) {
      status = 'full';
    } else if (freePercent <= 35) {
      status = 'filling';
    }

    const evSpots = spotsInZone.filter((s) => s.type === 'ev');
    const accessibleSpots = spotsInZone.filter((s) => s.type === 'accessible');
    const facultySpots = spotsInZone.filter((s) => s.type === 'faculty');

    const hours = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'];
    const hourlyTrends = hours.map((hour, idx) => {
      const base = seed.hourlyOccupancyBase[idx] || 50;
      const adjusted = Math.min(100, Math.max(5, base + ((idx === 3 && zoneId === 'zone-a') ? 2 : 0)));
      return { hour, occupancyPercent: adjusted };
    });

    return {
      zoneId: seed.id,
      name: seed.name,
      shortCode: seed.shortCode,
      location: seed.location,
      description: seed.description,
      totalSpots,
      freeSpots,
      occupiedSpots,
      reservedSpots,
      maintenanceSpots,
      occupancyRate,
      status,
      evTotal: evSpots.length,
      evFree: evSpots.filter((s) => s.status === 'free').length,
      accessibleTotal: accessibleSpots.length,
      accessibleFree: accessibleSpots.filter((s) => s.status === 'free').length,
      facultyTotal: facultySpots.length,
      facultyFree: facultySpots.filter((s) => s.status === 'free').length,
      predictiveFillNote: seed.predictiveFillNote,
      estimatedFillTime: status === 'full' ? 'Currently at capacity' : status === 'filling' ? 'Estimated full in ~25 mins' : undefined,
      gateDistanceMinutes: seed.gateDistanceMinutes,
      hourlyTrends,
    };
  }

  /**
   * Returns list of all zones with their calculated availability metrics.
   */
  public getAllZones(): ZoneAvailability[] {
    const list: ZoneAvailability[] = [];
    for (const z of this.zones.values()) {
      const summary = this.calculateZoneSummary(z.id);
      if (summary) list.push(summary);
    }
    return list;
  }

  /**
   * Returns zone availability along with all individual parking spots in that zone.
   */
  public getZoneDetail(zoneId: string): ParkingZoneDetail | null {
    const summary = this.calculateZoneSummary(zoneId);
    if (!summary) return null;
    const spots = Array.from(this.spots.values()).filter((s) => s.zoneId === zoneId);
    return {
      ...summary,
      spots,
    };
  }

  /**
   * Returns all 112 parking spots campus-wide.
   */
  public getAllSpots(): ParkingSpot[] {
    return Array.from(this.spots.values());
  }

  /**
   * Looks up a single spot by its unique code/ID.
   */
  public getSpotById(spotId: string): ParkingSpot | undefined {
    return this.spots.get(spotId);
  }

  /**
   * Updates spot occupancy status, battery telemetry, or vehicle classification.
   * Immediately re-calculates the enclosing zone summary and broadcasts a SPOT_UPDATE event.
   */
  public updateSpot(payload: SensorUpdatePayload): { success: boolean; spot?: ParkingSpot; zoneSummary?: ZoneAvailability } {
    let spot = this.spots.get(payload.spotId);
    if (!spot) {
      // Fallback: try case-insensitive code search
      const found = Array.from(this.spots.values()).find(
        (s) => s.id.toLowerCase() === payload.spotId.toLowerCase() || s.code.toLowerCase() === payload.spotId.toLowerCase()
      );
      if (found) spot = found;
    }

    if (!spot) {
      return { success: false };
    }

    const previousStatus = spot.status;
    spot.status = payload.status;
    spot.lastStatusChange = new Date().toISOString();

    if (payload.battery !== undefined) {
      spot.batteryLevel = Math.max(0, Math.min(100, payload.battery));
    }

    if (payload.status === 'occupied') {
      spot.occupiedSince = new Date().toISOString();
      if (payload.vehicleType) {
        spot.occupiedVehicleType = payload.vehicleType;
      }
    } else {
      spot.occupiedSince = undefined;
      spot.occupiedVehicleType = undefined;
    }

    const zoneSummary = this.calculateZoneSummary(spot.zoneId);

    // Broadcast granular update
    this.broadcast({
      type: 'SPOT_UPDATE',
      timestamp: new Date().toISOString(),
      payload: {
        spot,
        previousStatus,
        zoneSummary,
        source: payload.source || 'sensor',
      },
    });

    return { success: true, spot, zoneSummary: zoneSummary || undefined };
  }

  /**
   * Updates simulator parameters (speed, rush mode, probability).
   */
  public setSimulatorConfig(config: Partial<SimulatorConfig>): SimulatorConfig {
    this.simulatorConfig = { ...this.simulatorConfig, ...config };
    if (this.simulatorConfig.active && !this.simulatorTimer) {
      this.startSimulator();
    } else if (!this.simulatorConfig.active && this.simulatorTimer) {
      clearInterval(this.simulatorTimer);
      this.simulatorTimer = null;
    }
    this.broadcast({
      type: 'SIMULATOR_STATE',
      timestamp: new Date().toISOString(),
      payload: this.simulatorConfig,
    });
    return this.simulatorConfig;
  }

  /**
   * Executes a single simulated step (one vehicle arrives or departs).
   * @param targetZoneId Optional zone restriction
   * @param forceAction Optional forced action: 'arrive' or 'depart'
   */
  public triggerSimulatorStep(targetZoneId?: string, forceAction?: 'arrive' | 'depart') {
    const spotsArray = Array.from(this.spots.values()).filter((s) => (targetZoneId ? s.zoneId === targetZoneId : true));
    if (spotsArray.length === 0) return null;

    const action = forceAction || (Math.random() > 0.48 ? 'arrive' : 'depart');

    if (action === 'arrive') {
      const freeSpots = spotsArray.filter((s) => s.status === 'free');
      if (freeSpots.length === 0) return null;
      const spotToFill = freeSpots[Math.floor(Math.random() * freeSpots.length)];
      return this.updateSpot({
        spotId: spotToFill.id,
        status: 'occupied',
        source: 'simulator',
        vehicleType: ['Sedan', 'SUV', 'EV Hatchback', 'Hybrid'][Math.floor(Math.random() * 4)],
      });
    } else {
      const occupiedSpots = spotsArray.filter((s) => s.status === 'occupied');
      if (occupiedSpots.length === 0) return null;
      const spotToFree = occupiedSpots[Math.floor(Math.random() * occupiedSpots.length)];
      return this.updateSpot({
        spotId: spotToFree.id,
        status: 'free',
        source: 'simulator',
      });
    }
  }

  /**
   * Starts background recurring traffic generation.
   */
  public startSimulator(): void {
    if (this.simulatorTimer) clearInterval(this.simulatorTimer);
    this.simulatorTimer = setInterval(() => {
      if (!this.simulatorConfig.active) return;
      if (Math.random() < this.simulatorConfig.changeProbability) {
        let action: 'arrive' | 'depart' | undefined;
        if (this.simulatorConfig.rushMode === 'morning_arrival') {
          action = Math.random() > 0.2 ? 'arrive' : 'depart';
        } else if (this.simulatorConfig.rushMode === 'evening_departure') {
          action = Math.random() > 0.2 ? 'depart' : 'arrive';
        }
        this.triggerSimulatorStep(undefined, action);
      }
    }, this.simulatorConfig.intervalMs);
  }

  /**
   * Resets all spots and zones to baseline demo state.
   */
  public resetBaseline() {
    this.init();
    const zones = this.getAllZones();
    this.broadcast({
      type: 'BATCH_UPDATE',
      timestamp: new Date().toISOString(),
      payload: {
        zones,
        spots: this.getAllSpots(),
      },
    });
    return { success: true };
  }
}

/**
 * Singleton instance shared across server routes and unit test harnesses.
 */
export const parkingStore = new ParkingStore();
