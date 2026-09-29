export type SpotType = 'standard' | 'ev' | 'accessible' | 'faculty' | 'motorcycle';
export type SpotStatus = 'free' | 'occupied' | 'reserved' | 'maintenance';
export type ZoneStatus = 'plenty' | 'filling' | 'full';

export interface ParkingSpot {
  id: string; // e.g. "A-01"
  zoneId: string; // e.g. "zone-a"
  code: string; // e.g. "A-01"
  type: SpotType;
  status: SpotStatus;
  floorLevel: number;
  row: string;
  sensorId: string;
  batteryLevel: number; // 0-100%
  signalQuality: 'strong' | 'good' | 'weak';
  lastStatusChange: string;
  occupiedSince?: string;
  occupiedVehicleType?: string;
}

export interface ZoneAvailability {
  zoneId: string;
  name: string;
  shortCode: string;
  location: string;
  description: string;
  totalSpots: number;
  freeSpots: number;
  occupiedSpots: number;
  reservedSpots: number;
  maintenanceSpots: number;
  occupancyRate: number; // 0 - 100 percentage
  status: ZoneStatus;
  evTotal: number;
  evFree: number;
  accessibleTotal: number;
  accessibleFree: number;
  facultyTotal: number;
  facultyFree: number;
  predictiveFillNote: string;
  estimatedFillTime?: string;
  gateDistanceMinutes: number;
  hourlyTrends: { hour: string; occupancyPercent: number }[];
}

export interface ParkingZoneDetail extends ZoneAvailability {
  spots: ParkingSpot[];
}

export interface SensorUpdatePayload {
  spotId: string;
  status: SpotStatus;
  sensorId?: string;
  battery?: number;
  source?: 'sensor' | 'camera' | 'simulator' | 'manual';
  vehicleType?: string;
  timestamp?: string;
}

export interface RealtimeEvent {
  type: 'SPOT_UPDATE' | 'ZONE_UPDATE' | 'BATCH_UPDATE' | 'SIMULATOR_STATE' | 'INITIAL_SYNC';
  timestamp: string;
  payload: any;
}

export interface SimulatorConfig {
  active: boolean;
  intervalMs: number;
  rushMode: 'off' | 'morning_arrival' | 'evening_departure' | 'lunch_turnover';
  changeProbability: number; // 0.1 to 0.9
}

export interface UserAlertSubscription {
  id: string;
  zoneId: string;
  spotType?: SpotType;
  targetCount?: number;
  createdAt: string;
  userLabel: string;
}

export interface TelemetryLogItem {
  id: string;
  time: string;
  spotId: string;
  zoneCode: string;
  action: 'arrived' | 'departed' | 'manual' | 'override';
  status: string;
  source: string;
  battery?: number;
}

