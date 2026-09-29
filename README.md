# 🚗 ParkCampus: Real-Time Parking Availability & Guidance System

> **College Campus Smart Mobility & IoT Infrastructure**  
> **Project Review 2 Technical Submission Report (65%+ Completion)**  
> *Authoritative IoT Telemetry &bull; Real-Time WebSockets/SSE &bull; Entrance Kiosk Display &bull; Unit Test Suite &bull; React Error Boundaries &bull; Relational Schema*

---

## 📋 Executive Summary & Review 2 Milestone Status

This repository contains the working prototype of the **Real-Time Parking Availability System** for a college campus. It replaces manual search and guard-directed parking with automated occupancy detection, streaming real-time availability to arriving drivers and digital entrance boards.

### Review 1 Feedback Addressed in This Milestone:
1. **Granular Technical Documentation on Unit Testing**: 
   - Built a 49-assertion automated unit testing suite across 3 core domain files (`test/parkingStore.test.ts`, `test/apiEndpoints.test.ts`, `test/errorBoundary.test.ts`).
   - Added `npm test` script to `package.json` with formatted terminal test execution reporting.
   - Documented edge cases, mathematical threshold testing, and state transition matrices in this README.
2. **Granular Technical Documentation on Error Boundaries**:
   - Implemented a multi-tier React Error Boundary architecture (`src/components/ErrorBoundary.tsx`).
   - Added section-level blast-radius isolation (`SectionErrorBoundary`) around the Campus Map, Entrance Board, Analytics, and Hardware Simulator.
   - Added diagnostic stack trace capture, clipboard export, user-driven retry recovery, and an interactive **Live Fault Injector** for evaluators.
3. **Database Schema & Relational DDL**:
   - Fully documented the authoritative in-memory data store alongside the production PostgreSQL / Cloud SQL DDL table schema.
4. **Comprehensive API Endpoint Documentation**:
   - Documented all REST endpoints, WebSocket protocols, and Server-Sent Events (SSE) contracts with request/response payloads and curl commands.
5. **Expanded Code Comments**:
   - Added comprehensive JSDoc annotations and inline technical commentary across `server.ts`, `server/store.ts`, `src/hooks/useParkingData.ts`, `src/components/ErrorBoundary.tsx`, `src/components/Header.tsx`, and `src/App.tsx`.

---

## 🏛️ System Architecture & Data Flow

```
                      +---------------------------------------+
                      |       IoT Occupancy Data Sources      |
                      +---------------------------------------+
                         |                 |               |
        ESP32 Ultrasonic |    Edge Camera  |    Automated  |
        Microcontrollers |    Contour/YOLO |    Simulator  |
        (HTTP POST)      |    (HTTP POST)  |    (In-Process)
                         v                 v               v
                      +---------------------------------------+
                      |         POST /api/update              |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |   Authoritative Node.js Data Store    |
                      |   - Zone Availability Math Engine     |
                      |   - Event Bus & Telemetry Logs        |
                      +---------------------------------------+
                                    |           |
            WebSocket ('/ws')       |           | Server-Sent Events ('/api/stream')
            Bi-directional push     |           | Unidirectional fallback push
                                    v           v
                      +---------------------------------------+
                      |       Client Real-Time Consumer       |
                      |        (useParkingData Hook)          |
                      +---------------------------------------+
                                          |
              +---------------------------+---------------------------+
              |                           |                           |
              v                           v                           v
  +-----------------------+   +-----------------------+   +-----------------------+
  |  Student / Driver UI  |   | Entrance Display Board|   | Analytics & Facility  |
  |  - Interactive Map    |   | - High-contrast Kiosk |   | - Peak Fill Curves    |
  |  - Spot Reservation   |   | - Dynamic Color-Code  |   | - Advisory Engine     |
  |  - Spot Availability  |   | - Entry Wayfinding    |   | - PIN Protection      |
  |    Audio Chime Alerts |   |   (Green/Yellow/Red)  |   +-----------------------+
  +-----------------------+   +-----------------------+
```

---

## 🗄️ Database Schema & Data Models

The system is architected around 4 core entities: **Zones**, **Spots**, **Telemetry Logs**, and **User Alerts**. In the prototype, an authoritative in-memory store (`server/store.ts`) provides sub-5ms latency and zero-dependency execution. Below is both the runtime TypeScript model and the production PostgreSQL / Cloud SQL DDL schema.

### 1. TypeScript Entity Models

```typescript
export type SpotType = 'standard' | 'ev' | 'accessible' | 'faculty' | 'motorcycle';
export type SpotStatus = 'free' | 'occupied' | 'reserved' | 'maintenance';
export type ZoneStatus = 'plenty' | 'filling' | 'full';

export interface ParkingSpot {
  id: string;                  // Unique Spot ID, e.g. "A-1A1"
  zoneId: string;              // Foreign Key -> "zone-a"
  code: string;                // Stall designation, e.g. "A-1A1"
  type: SpotType;              // 'standard' | 'ev' | 'accessible' | 'faculty' | 'motorcycle'
  status: SpotStatus;          // 'free' | 'occupied' | 'reserved' | 'maintenance'
  floorLevel: number;          // Floor level (1, 2)
  row: string;                 // Row designation ("A", "B", "West", "East")
  sensorId: string;            // Physical hardware device ID, e.g. "ESP32-A1A1"
  batteryLevel: number;        // Sensor battery percentage (0 - 100)
  signalQuality: 'strong' | 'good' | 'weak';
  lastStatusChange: string;    // ISO 8601 Timestamp
  occupiedSince?: string;      // ISO 8601 Timestamp when vehicle arrived
  occupiedVehicleType?: string;// Vehicle classification (e.g. "EV Sedan", "SUV")
}

export interface ZoneAvailability {
  zoneId: string;              // "zone-a", "zone-b", "zone-c", "zone-d"
  name: string;                // "North Multi-Level Garage"
  shortCode: string;           // "Zone A"
  location: string;            // Physical campus landmark
  description: string;
  totalSpots: number;          // Total stalls in lot
  freeSpots: number;           // Free stalls available right now
  occupiedSpots: number;       // Occupied stalls
  reservedSpots: number;
  maintenanceSpots: number;
  occupancyRate: number;       // Percentage (0 - 100)
  status: ZoneStatus;          // 'plenty' (>35%), 'filling' (12-35%), 'full' (<=12%)
  evTotal: number;
  evFree: number;
  accessibleTotal: number;
  accessibleFree: number;
  facultyTotal: number;
  facultyFree: number;
  predictiveFillNote: string;  // e.g. "Usually fills by 9:15 AM on weekdays"
  estimatedFillTime?: string;
  gateDistanceMinutes: number;
  hourlyTrends: { hour: string; occupancyPercent: number }[];
}
```

### 2. Target Production PostgreSQL / Cloud SQL DDL

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Parking Zones Table
CREATE TABLE zones (
  zone_id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  short_code VARCHAR(16) NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  total_spots INT NOT NULL DEFAULT 0,
  floors INT NOT NULL DEFAULT 1,
  gate_distance_minutes INT NOT NULL DEFAULT 0,
  predictive_fill_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Parking Spots Table
CREATE TABLE spots (
  id VARCHAR(32) PRIMARY KEY,
  zone_id VARCHAR(32) NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
  code VARCHAR(16) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('standard', 'ev', 'accessible', 'faculty', 'motorcycle')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('free', 'occupied', 'reserved', 'maintenance')),
  floor_level INT NOT NULL DEFAULT 1,
  row VARCHAR(16) NOT NULL,
  sensor_id VARCHAR(64),
  battery_level INT CHECK (battery_level BETWEEN 0 AND 100),
  signal_quality VARCHAR(16) CHECK (signal_quality IN ('strong', 'good', 'weak')),
  last_status_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  occupied_since TIMESTAMP WITH TIME ZONE,
  occupied_vehicle_type VARCHAR(64)
);

CREATE INDEX idx_spots_zone_status ON spots(zone_id, status);
CREATE INDEX idx_spots_type ON spots(type);

-- 3. Telemetry Event Logs (Audit Trail)
CREATE TABLE telemetry_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id VARCHAR(32) NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL, -- 'arrived', 'departed', 'manual'
  status VARCHAR(20) NOT NULL,
  source VARCHAR(32) NOT NULL, -- 'sensor', 'camera', 'simulator'
  battery INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telemetry_created_at ON telemetry_logs(created_at DESC);

-- 4. User Notification Alerts
CREATE TABLE user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id VARCHAR(32) NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
  spot_type VARCHAR(20),
  user_label VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔌 API Endpoints Reference

### 1. `GET /api/zones`
- **Description**: Returns live availability metrics across all campus parking zones.
- **Response `200 OK`**:
```json
{
  "zones": [
    {
      "zoneId": "zone-a",
      "name": "North Multi-Level Garage",
      "shortCode": "Zone A",
      "totalSpots": 32,
      "freeSpots": 18,
      "occupiedSpots": 14,
      "occupancyRate": 44,
      "status": "plenty",
      "evTotal": 6,
      "evFree": 4,
      "accessibleTotal": 4,
      "accessibleFree": 2,
      "predictiveFillNote": "Usually fills by 9:15 AM on weekdays during semester rush.",
      "gateDistanceMinutes": 3
    }
  ],
  "timestamp": "2026-09-29T04:45:00.000Z"
}
```

### 2. `GET /api/zones/:id/availability`
- **Description**: Returns detailed availability for a specific zone including all parking spot records.
- **Parameters**: `id` - Path parameter (e.g. `zone-a`, `zone-b`, `zone-c`, `zone-d`).
- **Response `200 OK`**: Zone object containing `spots: ParkingSpot[]`.
- **Response `404 Not Found`**: `{"error": "Zone with ID 'xyz' not found."}`

### 3. `POST /api/update` (Sensor & Camera Ingestion)
- **Description**: Ingestion webhook called by ESP32 sensors, OpenCV camera nodes, or manual overrides.
- **Headers**: `Content-Type: application/json`
- **Payload Schema**:
```json
{
  "spotId": "A-1A1",
  "status": "occupied",
  "sensorId": "ESP32-A1A1",
  "battery": 94,
  "source": "sensor",
  "vehicleType": "EV Sedan"
}
```
- **Validation Rules**:
  - `spotId` (required, string). Returns `400` if missing.
  - `status` (required, must be one of `['free', 'occupied', 'reserved', 'maintenance']`). Returns `400` if invalid.
  - Returns `404` if spot ID does not match any stall on campus.
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Spot A-1A1 set to occupied",
  "spot": { ... },
  "zone": { ... }
}
```
- **Test with cURL**:
```bash
curl -X POST http://localhost:3000/api/update \
  -H "Content-Type: application/json" \
  -d '{"spotId":"A-1A1","status":"occupied","source":"sensor","battery":94,"vehicleType":"EV Sedan"}'
```

### 4. Simulator Endpoints
- `POST /api/simulator/toggle`: Starts or pauses background traffic generation.
- `POST /api/simulator/config`: Body `{"intervalMs": 3000, "rushMode": "morning_arrival", "changeProbability": 0.6}`.
- `POST /api/simulator/step`: Body `{"zoneId": "zone-a", "action": "arrive"}` triggers a single vehicle step.
- `POST /api/reset`: Resets all spots and zones to clean initial demo state.

### 5. Real-Time Streaming Endpoints
- `WS /ws`: Bi-directional WebSocket endpoint on port 3000. Immediately sends `INITIAL_SYNC` on connection, then pushes `SPOT_UPDATE` events.
- `GET /api/stream`: Server-Sent Events (SSE) fallback endpoint with automatic keep-alive pings every 15 seconds.

---

## 🧪 Granular Technical Documentation on Unit Testing

### Test Architecture
Unit tests are implemented in TypeScript under `/test` using a deterministic assertion suite. The test runner is executable via:

```bash
npm test
```

### Test Suite Catalog (49 Passing Assertions)

| Suite File | Scope | Test Count | Key Scenarios Covered |
| :--- | :--- | :---: | :--- |
| `test/parkingStore.test.ts` | Store & Occupancy Engine | **29 Tests** | &bull; Zone initialization (4 zones, 112 spots total)<br>&bull; Occupancy percentage calculation<br>&bull; Status threshold boundaries (`plenty` &gt; 35%, `filling` 12-35%, `full` &le; 12%)<br>&bull; Free &rarr; Occupied transition metadata (`occupiedSince`, `batteryLevel`, `occupiedVehicleType`)<br>&bull; Occupied &rarr; Free transition cleanups<br>&bull; Edge case: Rejection of non-existent spot IDs<br>&bull; Event subscriber dispatch & unsubscribe cleanup<br>&bull; Simulator arrival/departure forced step execution |
| `test/apiEndpoints.test.ts` | API Contracts & Validation | **11 Tests** | &bull; Payload validation (rejection of missing `spotId` or `status` with HTTP 400)<br>&bull; Validation of allowed status enum values<br>&bull; Simulator interval safety clamping (&ge; 500ms)<br>&bull; Probability bounds validation (0.0 to 1.0)<br>&bull; Zone ID route parameter parsing & normalization |
| `test/errorBoundary.test.ts` | Error Boundary State Logic | **9 Tests** | &bull; Initial state validation (`hasError: false`)<br>&bull; `getDerivedStateFromError` transition to `hasError: true`<br>&bull; Error name and message retention<br>&bull; Recovery transition: Resetting boundary restores operational state<br>&bull; Blast-radius containment: Verification that an error in Analytics does not affect Map View or Entrance Board |

### Test Run Output Log
```text
===========================================================
🚀 ParkCampus System - Unit Test Suite Runner
   Review 2 Technical Verification & Validation Suite
===========================================================

📦 Suite: ParkingStore & Occupancy Engine
   Passed: 29 | Failed: 0
   ✅ PASS: Store initializes 4 campus parking zones
   ✅ PASS: Store initializes all 112 campus parking spots across zones
   ✅ PASS: Zone A (North Garage) contains exactly 32 spots
   ✅ PASS: All spots free yields 32 free spots
   ✅ PASS: Occupancy rate is 0% when empty
   ✅ PASS: Zone status is "plenty" when > 35% free
   ✅ PASS: Zone status transitions to "filling" when free spots are <= 35%
   ✅ PASS: Zone status transitions to "full" when free spots are <= 12%
   ...

📦 Suite: API Payload Validation & Contracts
   Passed: 11 | Failed: 0
   ✅ PASS: Rejects payload with missing spotId (HTTP 400)
   ✅ PASS: Rejects payload with missing status (HTTP 400)
   ✅ PASS: Rejects invalid status string outside allowed enum
   ...

📦 Suite: Error Boundary State Transitions & Containment
   Passed: 9 | Failed: 0
   ✅ PASS: Initial error boundary state has no error
   ✅ PASS: Boundary transitions to hasError: true
   ✅ PASS: Resetting boundary restores hasError: false
   ✅ PASS: Analytics boundary catches its internal crash
   ✅ PASS: Map View remains healthy and operational
   ✅ PASS: Entrance Board remains healthy and operational

-----------------------------------------------------------
📊 FINAL RESULTS: 49 PASSED, 0 FAILED (Total: 49)
===========================================================
✨ All unit test suites executed with 100% pass rate!
```

---

## 🛡️ React Error Boundary Architecture & Fault Tolerance

### The Problem
In modern React single-page applications, an uncaught JavaScript error in any child component (such as an SVG coordinate calculation error or malformed JSON from an edge camera) unmounts the entire React component tree, leaving the user with an empty white screen. In a campus parking facility, an entrance board screen going white presents a major operational failure.

### Multi-Tier Boundary Hierarchy
To prevent total application crashes, ParkCampus implements a **hierarchical containment strategy**:

```
                       +---------------------------------------+
                       |    Root ErrorBoundary (src/App.tsx)   |
                       |    - Captures global crashes          |
                       |    - Offers 'Reload Application'      |
                       +---------------------------------------+
                                           |
     +-------------------+-----------------+-------------------+-------------------+
     |                   |                 |                   |                   |
     v                   v                 v                   v                   v
+-----------------+ +-----------------+ +-----------------+ +-----------------+ +-----------------+
| Section Boundary| | Section Boundary| | Section Boundary| | Section Boundary| | Section Boundary|
| Campus Lot Map  | | Entrance Board  | | Hardware Sim    | | Analytics Trends| | Tech Docs Modal |
| (Fault Isolated)| | (Fault Isolated)| | (Fault Isolated)| | (Fault Isolated)| | (Fault Isolated)|
+-----------------+ +-----------------+ +-----------------+ +-----------------+ +-----------------+
```

### Key Technical Capabilities
1. **Component-Level Blast Radius Isolation**: If a rendering fault occurs in the historical analytics chart, the **Entrance Display Board** and **Campus Lot Map** continue operating normally without interruption.
2. **Diagnostic Capture**: Extracts `error.name`, `error.message`, JavaScript stack trace, and the React `componentStack`.
3. **One-Click Clipboard Export**: Users or facility managers can click **"Copy Stack Trace"** to quickly send diagnostic reports.
4. **State Recovery**: Includes a **"Retry Component"** action that resets the boundary state and re-attempts rendering without losing WebSocket connections or unsaved configurations.
5. **Interactive Fault Injector**: Located inside the in-app **Tech Docs & Review 2** modal. Evaluators can click **"Inject Runtime Exception"** to verify live error boundary catching and recovery in real time.

---

## 📡 Hardware & Edge Sensor Integration Guide

### 1. Sensor-Based Approach: ESP32 + Ultrasonic Sensor (HC-SR04)
- **Bill of Materials**: ESP32 DevKit V1 (~$4), HC-SR04 ultrasonic distance sensor (~$1.50), 3.3V/5V breadboard regulator.
- **Wiring Pinout**:
  - `VCC` &rarr; 5V External
  - `GND` &rarr; Common Ground
  - `TRIG` &rarr; ESP32 GPIO 5
  - `ECHO` &rarr; ESP32 GPIO 18 (via 1k/2k voltage divider for 3.3V logic)
- **Arduino C++ Code Snippet**:
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "Campus-IoT-WiFi";
const char* password = "CampusPassword";
const char* serverUrl = "http://campus-server-ip:3000/api/update";
const char* spotId = "A-1A1";

const int trigPin = 5;
const int echoPin = 18;

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(250); }
}

void loop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  float distanceCm = duration * 0.034 / 2.0;
  bool isOccupied = (distanceCm > 10 && distanceCm < 180);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<200> doc;
    doc["spotId"] = spotId;
    doc["status"] = isOccupied ? "occupied" : "free";
    doc["source"] = "sensor";
    doc["battery"] = 96;

    String jsonStr;
    serializeJson(doc, jsonStr);
    http.POST(jsonStr);
    http.end();
  }
  delay(3000); // 3-second heartbeat cycle
}
```

### 2. Camera-Based Approach: Raspberry Pi + OpenCV / YOLO Zone Counter
- **Hardware**: Raspberry Pi 4 / 5 with wide-angle camera module mounted overlooking a parking lane.
- **Python Script Outline**:
```python
import cv2
import requests
import time

SERVER_URL = "http://campus-server-ip:3000/api/update"

# Bounding box coordinates for spots in Zone B
SPOTS = [
    {"spotId": "B-R1-01", "bbox": [120, 80, 200, 220]},
    {"spotId": "B-R1-02", "bbox": [210, 80, 290, 220]},
]

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    for spot in SPOTS:
        x1, y1, x2, y2 = spot["bbox"]
        roi = gray[y1:y2, x1:x2]
        # Pixel intensity variance / edge count detection
        edges = cv2.Canny(roi, 50, 150)
        non_zero = cv2.countNonZero(edges)
        status = "occupied" if non_zero > 400 else "free"
        
        # Dispatch to backend
        try:
            requests.post(SERVER_URL, json={
                "spotId": spot["spotId"],
                "status": status,
                "source": "camera"
            }, timeout=2)
        except Exception as e:
            print("Sync error:", e)
            
    time.sleep(4)
```

---

## 🚀 Running the Project

### Development
```bash
# Start full-stack dev server (Express + WebSockets + Vite on Port 3000)
npm run dev
```

### Executing Unit Tests
```bash
# Execute unit testing suite with formatted terminal output
npm test
```

### Type Checking & Linting
```bash
# TypeScript compilation check
npm run lint
```

### Production Build
```bash
# Bundles React frontend and bundles server.ts into dist/server.cjs
npm run build
npm start
```

---

## 🎯 Review 2 Verification Checklist

- [x] **Unit Testing Granularity**: Comprehensive test documentation, 49 assertions passing, covering edge cases, math calculations, schema validations, and error states.
- [x] **React Error Boundaries**: Production error boundary component with fallback UI, stack trace export, retry recovery, and live fault injection sandbox.
- [x] **Expanded Code Comments**: JSDoc annotations and explanatory architecture comments added to `server.ts`, `server/store.ts`, `useParkingData.ts`, `ErrorBoundary.tsx`, and `App.tsx`.
- [x] **Database Schema Documentation**: In-memory models and production PostgreSQL / Cloud SQL DDL table creation scripts documented in README and in-app viewer.
- [x] **API Endpoint Documentation**: Full endpoint documentation with request/response schemas, error codes, and curl examples.
- [x] **In-App Interactive Reviewer Hub**: Interactive **"Tech Docs & Review 2"** modal directly accessible from the navigation header.
