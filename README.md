# 🚗 ParkCampus: Real-Time Parking Availability & Guidance System

> **College Campus Smart Mobility & IoT Infrastructure**  
> **Project Review 2 Technical Submission Report (70%+ Completion Milestone)**  
> *Authoritative IoT Telemetry &bull; Real-Time WebSockets/SSE &bull; Entrance Kiosk Signage &bull; Granular Unit Testing (49 Assertions) &bull; React Error Boundaries &bull; Production Relational Schema*

---

## 📋 Executive Summary & Review Milestone Status

This repository contains the working prototype of the **ParkCampus Real-Time Parking Availability System** for a college campus lot infrastructure. It replaces manual spot searching and guard-directed guidance with automated, real-time occupancy detection that streams availability to approaching drivers, campus facilities administrators, and roadside entrance displays.

### Review 1 Feedback & Comprehensive Technical Remediation

| Review 1 Evaluation Area | Committee Feedback | Phase 2 Implemented Technical Resolution | Verification Status |
| :--- | :--- | :--- | :---: |
| **Unit Testing Granularity** | *"Provide more granular technical documentation on unit testing."* | Built automated test runner (`npm test`) executing **49 assertions** covering store math, occupancy thresholds, payload schema validation, route normalization, and boundary state transitions. Full test matrix, mathematical proofs, and invariant formulations documented below. | **100% Resolved** |
| **Error Boundary Architecture** | *"Provide more granular technical documentation on error boundaries."* | Implemented multi-tier React 19 class-based `ErrorBoundary` and `SectionErrorBoundary` with blast-radius isolation, diagnostic stack trace capture, clipboard reporting, user-driven retry recovery, and an in-app **Live Fault Injection Sandbox**. | **100% Resolved** |
| **API Endpoint Contracts** | *"Document API endpoints in README for subsequent reviews."* | Documented all 8 REST endpoints, WebSockets wire protocol (`WS /ws`), and Server-Sent Events (`GET /api/stream`) with exact request/response JSON schemas, HTTP status codes, error payload contracts, and cURL commands. | **100% Resolved** |
| **Database Schema Reference** | *"Document database schema in README for subsequent reviews."* | Documented the authoritative in-memory state engine, Entity-Relationship (ER) model, full Data Dictionary, and production-grade PostgreSQL / Cloud SQL DDL with indexes, foreign keys, and constraints. | **100% Resolved** |
| **Code Documentation & Comments** | *"Expand code comments throughout codebase."* | Added comprehensive JSDoc annotations, parameter contracts, type constraints, invariant notes, and lifecycle explanations across `server.ts`, `server/store.ts`, `useParkingData.ts`, `ErrorBoundary.tsx`, and all test suites. | **100% Resolved** |

---

## 🏛️ System Architecture & Ingestion Flow

The platform is designed around a decoupled, fault-tolerant 3-tier IoT architecture:

```
+---------------------------------------------------------------------------------------+
|                                EDGE INGESTION LAYER                                   |
|                                                                                       |
|  +--------------------------+  +--------------------------+  +---------------------+  |
|  |  ESP32 Microcontroller   |  |   Raspberry Pi 4 + CV    |  | In-Process Traffic  |  |
|  |  HC-SR04 Ultrasonic/IR  |  |   YOLOv8-nano / OpenCV   |  | Stochastic Generator|  |
|  |  Per-Stall Heartbeat     |  |   Multi-Spot Polygon ROI |  | Rush-Hour Simulator |  |
|  +------------+-------------+  +------------+-------------+  +----------+----------+  |
|               |                             |                           |             |
|               | HTTP POST /api/update       | HTTP POST /api/update     | In-Memory   |
+---------------+-----------------------------+---------------------------+-------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------+
|                             AUTHORITATIVE TELEMETRY CORE                              |
|                             Node.js & Express (Port 3000)                             |
|                                                                                       |
|  • In-Memory Authoritative State Store (112 Stalls across 4 Campus Zones)              |
|  • Mathematical Availability Engine (Invariants: total = free + occ + res + maint)     |
|  • Density Threshold State Machine: Plenty (>35%), Filling (12-35%), Full (<=12%)     |
|  • Circular Audit Buffer (Latest 50 Telemetry Events with timestamps & battery)       |
|  • Reactive Pub/Sub Event Dispatcher                                                  |
+----------------------+-----------------------------------------+----------------------+
                       |                                         |
                       | WebSockets ('/ws')                      | Server-Sent Events
                       | Bi-directional binary/JSON push         | ('/api/stream')
                       v                                         v
+---------------------------------------------------------------------------------------+
|                             CLIENT CONSUMER LAYER                                     |
|                             React 19 + useParkingData Hook                            |
|                                                                                       |
|  • Primary Transport: WebSocket with Auto-Reconnection & Exponential Backoff          |
|  • Fallback Transport: Server-Sent Events (SSE) with 15s keep-alive ping               |
|  • Tertiary Fallback: Periodic REST polling (/api/zones)                              |
|  • Sound Synthesis: Web Audio API chime engine for spot availability alerts           |
|                                                                                       |
|           +-------------------------+-------------------------+                       |
|           |                         |                         |                       |
|           v                         v                         v                       |
|  +-----------------+       +-----------------+       +-----------------+              |
|  | Student Driver  |       | Roadside Kiosk  |       | Analytics & Ops |              |
|  | Interactive Map |       | Entrance Board  |       | Historical Log  |              |
|  | 112 Stall Grid  |       | Color-Coded UX  |       | Predictive Peak |              |
|  | Filter EV/ADA   |       | Direction Hints |       | PIN Protection  |              |
|  +-----------------+       +-----------------+       +-----------------+              |
+---------------------------------------------------------------------------------------+
```

---

## 🧪 Granular Technical Documentation on Unit Testing

### 1. Testing Philosophy & Design Invariants
The ParkCampus test suite (`/test`) is engineered to ensure **deterministic execution**, **zero external network dependencies**, and **exact mathematical correctness**. The test suite runs directly via Node.js / `tsx` and validates the critical business logic that governs driver wayfinding and safety-critical lot capacity metrics.

#### Core Mathematical Invariants Enforced by Tests:
1. **Conservation of Stalls**:
   $$\text{totalSpots} \equiv \text{freeSpots} + \text{occupiedSpots} + \text{reservedSpots} + \text{maintenanceSpots}$$
   *No stall state transition may create or destroy inventory.*
2. **Occupancy Rate Precision**:
   $$\text{occupancyRate} = \text{round}\left( \frac{\text{totalSpots} - \text{freeSpots}}{\text{totalSpots}} \times 100 \right)$$
   *Always bounded between $0\%$ and $100\%$.*
3. **Zone Status Density Thresholds**:
   $$\text{status} = \begin{cases} 
   \text{'plenty'} & \text{if } \frac{\text{freeSpots}}{\text{totalSpots}} > 0.35 \quad (\text{Green}) \\ 
   \text{'filling'} & \text{if } 0.12 \le \frac{\text{freeSpots}}{\text{totalSpots}} \le 0.35 \quad (\text{Amber}) \\ 
   \text{'full'} & \text{if } \frac{\text{freeSpots}}{\text{totalSpots}} < 0.12 \quad (\text{Red})
   \end{cases}$$
4. **Audit Trail Ring Buffer**:
   $$\text{length}(\text{telemetryLogs}) \le 50$$
   *Oldest records are evicted in FIFO order when capacity is reached.*

---

### 2. Comprehensive Test Catalog (49 Assertions Across 3 Suites)

#### Suite 1: `test/parkingStore.test.ts` (29 Assertions)
*Scope: Validates the authoritative in-memory state engine, zone seeding, occupancy math, threshold transitions, event dispatcher, and manual simulation steps.*

| ID | Test Name | Input State | Action Executed | Expected Assertion & Invariant | Edge Case / Risk Addressed |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **PS-01** | Zone Initialization Count | Empty Store | `parkingStore.init()` | `getAllZones().length === 4` | Prevents missing campus zones on boot |
| **PS-02** | Total Spot Inventory | 4 Zones Seeded | Count spots across all zones | `getAllSpots().length === 112` | Guarantees no dropped stalls during seed |
| **PS-03** | Zone A Capacity Check | Zone A Seeded | Inspect `zone-a` spots | `spots.length === 32` | Multi-story garage allocation accuracy |
| **PS-04** | Zone A Spot Array Return | Zone A queried | `getZoneWithSpots('zone-a')` | Array length matches zone total (32) | Verifies relational integrity of zone-to-spots |
| **PS-05** | Empty Lot Free Count | All 32 spots set to `free` | Query Zone A availability | `freeSpots === 32` | Prevents false occupancy counts |
| **PS-06** | Empty Lot Occupancy Rate | All 32 spots set to `free` | Calculate occupancy percentage | `occupancyRate === 0%` | Zero-division / boundary math check |
| **PS-07** | High Availability Status | Free spots = 32 (100% free) | Evaluate zone status | `status === 'plenty'` ($> 35\%$) | Entrance display Green light logic |
| **PS-08** | Mid-Capacity Free Count | 24 spots set to `occupied` | Calculate remaining free | `freeSpots === 8` (25% free) | Verifies subtraction arithmetic |
| **PS-09** | Mid-Capacity Status | 8 of 32 spots free (25%) | Evaluate zone status | `status === 'filling'` ($12\% \le x \le 35\%$) | Entrance display Amber warning logic |
| **PS-10** | Low-Capacity Free Count | 30 spots set to `occupied` | Calculate remaining free | `freeSpots === 2` (6.25% free) | Near-capacity precision |
| **PS-11** | Low-Capacity Status | 2 of 32 spots free (6.25%) | Evaluate zone status | `status === 'full'` ($< 12\%$) | Entrance display Red full redirection |
| **PS-12** | Valid Update Spot Return | Spot `A-1A1` free | `updateSpot({ spotId: 'A-1A1', status: 'occupied' })` | `res.success === true` | Confirms ingestion handler return contract |
| **PS-13** | Spot Status Mutated | Spot `A-1A1` free | Set to `occupied` | `getSpot('A-1A1').status === 'occupied'` | Mutex/memory mutation verification |
| **PS-14** | Battery Telemetry Persisted | Battery = 94% passed | Update spot with battery | `getSpot('A-1A1').batteryLevel === 94` | IoT battery degradation monitoring |
| **PS-15** | Vehicle Classification | Vehicle = "EV Sedan" passed | Update spot with vehicle type | `occupiedVehicleType === 'EV Sedan'` | EV & oversize vehicle classification |
| **PS-16** | Occupied Since Timestamp | Vehicle arrives | Inspect spot timestamps | `occupiedSince` is valid ISO string | Billing & parking duration enforcement |
| **PS-17** | Last Change Timestamp | Status changed | Compare timestamps | `lastStatusChange` is updated to current time | Telemetry freshness verification |
| **PS-18** | Vehicle Departure Transition | Spot `occupied` | Set to `free` | `getSpot('A-1A1').status === 'free'` | Spot liberation cycle |
| **PS-19** | Occupied Timestamp Reset | Vehicle departs | Inspect `occupiedSince` | `occupiedSince === undefined` | Prevents stale occupancy timestamps |
| **PS-20** | Vehicle Type Clear | Vehicle departs | Inspect `occupiedVehicleType` | `occupiedVehicleType === undefined` | Prevents ghost vehicle classification |
| **PS-21** | Invalid Spot ID Rejection | Non-existent spot `INVALID-99` | `updateSpot({ spotId: 'INVALID-99' })` | `res.success === false` | Protects store against corrupt sensor input |
| **PS-22** | Non-Existent Zone Query | Query `zone-unknown` | `getZone('zone-unknown')` | Returns `null` without throwing exception | Safe query handling |
| **PS-23** | Pub/Sub Event Dispatch | Subscriber listening | `updateSpot(...)` executed | Subscriber callback is invoked | Real-time push bus trigger |
| **PS-24** | Event Action Type | Subscriber listening | Examine dispatched event | `event.type === 'SPOT_UPDATE'` | Strict event schema contract |
| **PS-25** | Event Spot Payload | Subscriber listening | Examine dispatched event | `event.payload.spot.id === 'A-1A1'` | Target entity integrity |
| **PS-26** | Event Source Provenance | Source = `'sensor'` | Examine dispatched event | `event.payload.source === 'sensor'` | Distinguishes physical vs simulated input |
| **PS-27** | Unsubscribe Cleanup | Subscriber removed | Trigger new update | Callback is NOT called again | Prevents memory leaks in WebSocket listeners |
| **PS-28** | Simulator Force Arrival | Zone B has free spots | `triggerSimulatorStep('zone-b', 'arrive')` | Spot transitions to occupied | Manual simulation step testing |
| **PS-29** | Simulator Force Departure | Zone B has occupied spots | `triggerSimulatorStep('zone-b', 'depart')` | Spot transitions to free | Departure alert testing capability |

---

#### Suite 2: `test/apiEndpoints.test.ts` (11 Assertions)
*Scope: Validates HTTP payload validation contracts, schema boundary rejection, parameter normalization, and HTTP error status codes.*

| ID | Test Name | Input Payload | Tested Route | Expected Outcome & Status | Edge Case / Security Rationale |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **API-01** | Missing `spotId` Validation | `{"status": "occupied"}` | `POST /api/update` | `400 Bad Request` (`spotId is required`) | Rejects malformed sensor packets |
| **API-02** | Missing `status` Validation | `{"spotId": "A-1A1"}` | `POST /api/update` | `400 Bad Request` (`status is required`) | Prevents unassigned stall states |
| **API-03** | Invalid Status Enum | `{"spotId": "A-1A1", "status": "hovering"}` | `POST /api/update` | `400 Bad Request` (Invalid status enum) | Rejects unexpected strings outside enum |
| **API-04** | Valid Free Update | `{"spotId": "A-1A1", "status": "free"}` | `POST /api/update` | `200 OK` + JSON response | Standard departure webhook |
| **API-05** | Full Telemetry Payload | Complete IoT sensor payload with battery & source | `POST /api/update` | `200 OK` + Spot & Zone payload | Verifies full schema ingestion |
| **API-06** | Simulator Config Valid | `{"intervalMs": 3000, "changeProbability": 0.5}` | `POST /api/simulator/config` | `200 OK` + updated config | Verifies simulator reconfiguration |
| **API-07** | Min Interval Floor Clamp | `{"intervalMs": 200}` | `POST /api/simulator/config` | `400 Bad Request` ($< 500\text{ms}$ rejected) | DoS protection against high-frequency CPU loop |
| **API-08** | Probability Bounds Check | `{"changeProbability": 1.5}` | `POST /api/simulator/config` | `400 Bad Request` ($> 1.0$ rejected) | Mathematical probability boundary ($0.0 \le p \le 1.0$) |
| **API-09** | Zone Param Recognition | Path param `:id = "zone-a"` | `GET /api/zones/:id` | `200 OK` + returns Zone A | Standard REST route parameter parsing |
| **API-10** | Zone Case Normalization | Path param `:id = "ZONE-A"` | `GET /api/zones/:id` | `200 OK` (Normalized to lowercase) | Robustness against driver URL input variation |
| **API-11** | Unrecognized Zone ID | Path param `:id = "zone-z"` | `GET /api/zones/:id` | `404 Not Found` (`Zone not found`) | Clean REST error code handling |

---

#### Suite 3: `test/errorBoundary.test.ts` (9 Assertions)
*Scope: Validates React Error Boundary state logic, transition lifecycles, error diagnostic capture, recovery resets, and blast-radius containment.*

| ID | Test Name | Initial Condition | Action / Event | Expected Outcome & Assertion | Resilience Value |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **EB-01** | Initial State Purity | Clean mounting | Initialize Error Boundary | `hasError === false`, `error === null` | Guarantees transparent normal rendering |
| **EB-02** | Error State Capture | Operational | `getDerivedStateFromError(new Error("Crash"))` | `hasError === true` | Synchronous transition to fallback UI |
| **EB-03** | Error Message Preservation | Operational | Simulated render error | `state.error.message === "Simulated rendering crash"` | Diagnostic preservation for logging |
| **EB-04** | Error Class Retention | Operational | Simulated `TypeError` | `state.error instanceof TypeError === true` | Error classification accuracy |
| **EB-05** | Recovery Reset Transition | Boundary in error state | Invoke `handleReset()` | `hasError === false` | Enables one-click user recovery |
| **EB-06** | Error Object Cleanup | Boundary in error state | Invoke `handleReset()` | `error === null` | Prevents stale error remnants |
| **EB-07** | Section Boundary Catch | Error inside `AnalyticsView` | Trigger crash in chart component | Analytics boundary traps error | Blast-radius containment |
| **EB-08** | Campus Map Isolation | Error in Analytics | Check `CampusLotMap` state | Map remains operational and interactive | Multi-view stability |
| **EB-09** | Entrance Board Isolation | Error in Analytics | Check `EntranceBoard` state | Entrance Board continues live streaming | Critical wayfinding uptime guarantee |

---

### 3. How to Execute the Unit Test Suite

```bash
# Run all 49 assertions with formatted terminal output
npm test
```

Sample Terminal Output:
```text
===========================================================
🚀 ParkCampus System - Unit Test Suite Runner
   Review 2 Technical Verification & Validation Suite
===========================================================

📦 Suite: ParkingStore & Occupancy Engine
   Passed: 29 | Failed: 0
   ✅ PASS: Store initializes 4 campus parking zones
   ✅ PASS: Store initializes all 112 campus parking spots across zones
   ... (29 tests)

📦 Suite: API Payload Validation & Contracts
   Passed: 11 | Failed: 0
   ✅ PASS: Rejects payload with missing spotId (HTTP 400)
   ... (11 tests)

📦 Suite: Error Boundary State Transitions & Containment
   Passed: 9 | Failed: 0
   ✅ PASS: Initial error boundary state has no error
   ... (9 tests)

-----------------------------------------------------------
📊 FINAL RESULTS: 49 PASSED, 0 FAILED (Total: 49)
===========================================================
✨ All unit test suites executed with 100% pass rate!
```

---

## 🛡️ React Error Boundary Architecture & Fault Tolerance

### 1. The Operational Challenge
In single-page React applications, uncaught exceptions occurring during rendering, within hooks, or in lifecycle methods trigger unmounting of the complete React component tree. In an automated campus parking facility:
- A crash in a non-critical analytics curve widget would take down the **Roadside Entrance Display Board**, blinding arriving motorists.
- An SVG parsing glitch on a specific mobile browser would break access to the **Spot Reservation** and **Emergency Alert** subsystems.

### 2. Multi-Tier Hierarchical Containment Architecture

ParkCampus implements a dual-level containment pattern:

```
+---------------------------------------------------------------------------------------+
|                           ROOT ERROR BOUNDARY (src/App.tsx)                           |
|  • Wraps entire SPA container                                                         |
|  • Traps uncaught top-level routing, context, and header failures                    |
|  • Fallback UI: High-visibility System Alert banner with 'Reload Application' button  |
+-------------------------------------------+-------------------------------------------+
                                            |
        +-----------------------------------+-----------------------------------+
        |                                   |                                   |
        v                                   v                                   v
+-----------------------+           +-----------------------+           +-----------------------+
| SECTION ERROR BOUNDARY|           | SECTION ERROR BOUNDARY|           | SECTION ERROR BOUNDARY|
| Campus Lot Map        |           | Entrance Display Board|           | Analytics & Trends    |
| (Fault Isolated)      |           | (Fault Isolated)      |           | (Fault Isolated)      |
+-----------------------+           +-----------------------+           +-----------------------+
```

### 3. Error Boundary Lifecycle Mechanics
The implementation in `src/components/ErrorBoundary.tsx` strictly adheres to React 19 component lifecycle specifications:

1. **Synchronous State Derivation**:
   ```typescript
   static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
     // Invoked during render phase; must be pure with zero side-effects.
     return { hasError: true, error };
   }
   ```
2. **Asynchronous Telemetry & Logging**:
   ```typescript
   componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
     // Invoked during commit phase; side-effects and telemetry dispatches permitted.
     this.setState({ errorInfo });
     console.error(`[ParkCampus ErrorBoundary] Captured error in [${this.props.sectionName}]:`, error, errorInfo);
     if (this.props.onError) {
       this.props.onError(error, errorInfo);
     }
   }
   ```
3. **State Recovery & Component Remounting**:
   ```typescript
   handleReset = (): void => {
     // Clears error state, resetting the boundary so React attempts to re-render the subtree.
     this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
   };
   ```

### 4. Live Runtime Fault Injection Sandbox
To allow faculty evaluators to verify error boundary behavior without devtools:
1. Open the in-app **"Tech Docs & Review 2"** modal from the header.
2. Select the **"Error Boundaries & Recovery"** tab.
3. Click the interactive button: **"Trigger Simulated Error"**.
4. Observe the isolated component entering the fallback state, displaying the diagnostic accordion and stack trace copy button, while all other app sections and real-time streams continue functioning normally.
5. Click **"Try Again"** to verify immediate state recovery.

---

## 🔌 API Endpoints Reference

### API Overview Table

| HTTP Method | Route Path | Transport | Auth Required | Request Payload Summary | Success Status | Error Codes |
| :---: | :--- | :---: | :---: | :--- | :---: | :---: |
| `GET` | `/api/zones` | HTTP REST | None | None | `200 OK` | `500` |
| `GET` | `/api/zones/:id` | HTTP REST | None | Path param `:id` (`zone-a`, etc.) | `200 OK` | `404` |
| `GET` | `/api/zones/:id/availability` | HTTP REST | None | Path param `:id` | `200 OK` | `404` |
| `GET` | `/api/spots` | HTTP REST | None | Optional query: `?zone=zone-a` | `200 OK` | `400` |
| `POST` | `/api/update` | HTTP REST | Optional Token | `{ spotId, status, battery, source, vehicleType }` | `200 OK` | `400`, `404` |
| `POST` | `/api/simulator/toggle` | HTTP REST | PIN Optional | None | `200 OK` | `500` |
| `POST` | `/api/simulator/config` | HTTP REST | Facilities PIN | `{ intervalMs, rushMode, changeProbability }` | `200 OK` | `400` |
| `POST` | `/api/simulator/step` | HTTP REST | None | `{ zoneId, action: 'arrive' \| 'depart' }` | `200 OK` | `400` |
| `POST` | `/api/reset` | HTTP REST | Facilities PIN | None | `200 OK` | `500` |
| `GET` | `/api/stream` | SSE Stream | None | None | `200 OK` | `500` |
| `WS` | `/ws` | WebSocket | None | JSON framed messages | `101 Switching` | `1006` |

---

### Detailed Endpoint Specifications & cURL Testing

#### 1. `GET /api/zones`
Retrieves live occupancy metrics across all 4 campus parking zones.

- **Request**:
  ```bash
  curl -s http://localhost:3000/api/zones
  ```
- **Response (`200 OK`)**:
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
        "reservedSpots": 0,
        "maintenanceSpots": 0,
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
    "timestamp": "2026-10-25T23:45:00.000Z"
  }
  ```

#### 2. `POST /api/update` (Sensor & Camera Ingestion)
The primary ingestion webhook for physical IoT microcontrollers (ESP32) and computer vision edge nodes (Raspberry Pi/OpenCV).

- **Headers**: `Content-Type: application/json`
- **Request Payload Schema**:
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
  - `spotId` (String, required): Must match an existing stall ID on campus.
  - `status` (String, required): Must be one of `['free', 'occupied', 'reserved', 'maintenance']`.
  - `battery` (Integer, optional): Value between 0 and 100.
  - `source` (String, optional): `'sensor' | 'camera' | 'simulator' | 'manual'`.
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Spot A-1A1 set to occupied",
    "spot": {
      "id": "A-1A1",
      "zoneId": "zone-a",
      "code": "A-1A1",
      "type": "standard",
      "status": "occupied",
      "batteryLevel": 94,
      "lastStatusChange": "2026-10-25T23:45:10.120Z",
      "occupiedSince": "2026-10-25T23:45:10.120Z",
      "occupiedVehicleType": "EV Sedan"
    },
    "zone": {
      "zoneId": "zone-a",
      "freeSpots": 17,
      "occupiedSpots": 15,
      "occupancyRate": 47,
      "status": "plenty"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{"error": "spotId and valid status ('free' | 'occupied' | 'reserved' | 'maintenance') are required."}`
  - `404 Not Found`: `{"error": "Spot with ID 'A-999' not found."}`
- **Test with cURL**:
  ```bash
  curl -X POST http://localhost:3000/api/update \
    -H "Content-Type: application/json" \
    -d '{"spotId":"A-1A1","status":"occupied","source":"sensor","battery":94,"vehicleType":"EV Sedan"}'
  ```

#### 3. Real-Time Streaming Contracts

##### WebSocket Protocol (`WS /ws`)
- **Connection**: `ws://localhost:3000/ws`
- **Initial Sync Message (Sent upon connection)**:
  ```json
  {
    "type": "INITIAL_SYNC",
    "timestamp": "2026-10-25T23:45:00.000Z",
    "payload": {
      "zones": [ ... ],
      "spots": [ ... ],
      "simulatorConfig": { "active": true, "intervalMs": 3500 }
    }
  }
  ```
- **Broadcast Delta Message (`SPOT_UPDATE`)**:
  ```json
  {
    "type": "SPOT_UPDATE",
    "timestamp": "2026-10-25T23:45:12.345Z",
    "payload": {
      "spot": { "id": "B-R1-03", "status": "free", ... },
      "zone": { "zoneId": "zone-b", "freeSpots": 11, ... },
      "source": "sensor",
      "previousStatus": "occupied"
    }
  }
  ```

##### Server-Sent Events Protocol (`GET /api/stream`)
- **MIME Type**: `text/event-stream`
- **Headers**: `Cache-Control: no-cache`, `Connection: keep-alive`
- **Payload Format**:
  ```text
  event: SPOT_UPDATE
  data: {"spot":{"id":"A-1A1","status":"occupied"},"zone":{"zoneId":"zone-a","freeSpots":17}}

  : ping
  ```

---

## 🗄️ Database Schema & Relational DDL

### 1. Entity-Relationship (ER) Architecture

```
+---------------------------------+
|              ZONES              |
+---------------------------------+
| PK  zone_id VARCHAR(32)         |
|     name VARCHAR(128)           |
|     short_code VARCHAR(16)      |
|     location TEXT               |
|     total_spots INT             |
|     floors INT                  |
|     gate_distance_minutes INT   |
|     predictive_fill_note TEXT   |
+----------------+----------------+
                 |
                 | 1:N (ON DELETE CASCADE)
                 v
+---------------------------------+             +----------------------------------+
|              SPOTS              | 1:N (CASCADE)|          TELEMETRY_LOGS          |
+---------------------------------+             +----------------------------------+
| PK  id VARCHAR(32)              |------------>| PK  id UUID                      |
| FK  zone_id VARCHAR(32)         |             | FK  spot_id VARCHAR(32)          |
|     code VARCHAR(16) UNIQUE     |             |     action VARCHAR(20)           |
|     type VARCHAR(20)            |             |     status VARCHAR(20)           |
|     status VARCHAR(20)          |             |     source VARCHAR(32)           |
|     battery_level INT           |             |     battery INT                  |
|     occupied_since TIMESTAMPTZ  |             |     created_at TIMESTAMPTZ       |
|     last_status_change TIMESTAMPTZ            +----------------------------------+
+----------------+----------------+
                 |
                 | 1:N (CASCADE)
                 v
+---------------------------------+
|           USER_ALERTS           |
+---------------------------------+
| PK  id UUID                     |
| FK  zone_id VARCHAR(32)         |
|     spot_type VARCHAR(20)       |
|     user_label VARCHAR(64)      |
|     created_at TIMESTAMPTZ      |
+---------------------------------+
```

---

### 2. Comprehensive Data Dictionary

| Table Name | Column Name | Data Type | Nullable | Default | Key / Index | Description & Constraints |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `zones` | `zone_id` | `VARCHAR(32)` | No | None | **PK** | Primary unique identifier (e.g. `'zone-a'`). |
| `zones` | `name` | `VARCHAR(128)` | No | None | - | Full human-readable name of lot. |
| `zones` | `short_code` | `VARCHAR(16)` | No | None | - | Compact code (e.g. `'Zone A'`). |
| `zones` | `total_spots` | `INT` | No | 0 | - | Invariant: Must equal count of child spots. |
| `zones` | `gate_distance_minutes` | `INT` | No | 0 | - | Walking time to central campus quad. |
| `spots` | `id` | `VARCHAR(32)` | No | None | **PK** | Global spot identifier (e.g. `'A-1A1'`). |
| `spots` | `zone_id` | `VARCHAR(32)` | No | None | **FK** | Foreign key referencing `zones(zone_id)`. |
| `spots` | `code` | `VARCHAR(16)` | No | None | Unique | Stall designation string. |
| `spots` | `type` | `VARCHAR(20)` | No | `'standard'` | Index | `'standard'`, `'ev'`, `'accessible'`, `'faculty'`, `'motorcycle'`. |
| `spots` | `status` | `VARCHAR(20)` | No | `'free'` | Index | `'free'`, `'occupied'`, `'reserved'`, `'maintenance'`. |
| `spots` | `battery_level` | `INT` | Yes | 100 | - | Constraint: Between 0 and 100. |
| `spots` | `occupied_since` | `TIMESTAMPTZ`| Yes | Null | - | Set when vehicle arrives; nullified on departure. |
| `telemetry_logs`| `id` | `UUID` | No | `gen_random_uuid()`| **PK** | Unique telemetry event record ID. |
| `telemetry_logs`| `spot_id` | `VARCHAR(32)` | No | None | **FK** | Foreign key referencing `spots(id)`. |
| `telemetry_logs`| `source` | `VARCHAR(32)` | No | None | - | Origin: `'sensor'`, `'camera'`, `'simulator'`. |
| `telemetry_logs`| `created_at` | `TIMESTAMPTZ`| No | `NOW()` | Index (DESC) | Precise event timestamp for historical rollups. |

---

### 3. Production PostgreSQL / Cloud SQL DDL Schema

```sql
-- Production DDL for ParkCampus Relational Deployment
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Parking Zones Table
CREATE TABLE zones (
  zone_id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  short_code VARCHAR(16) NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  total_spots INT NOT NULL DEFAULT 0 CHECK (total_spots >= 0),
  floors INT NOT NULL DEFAULT 1 CHECK (floors >= 1),
  gate_distance_minutes INT NOT NULL DEFAULT 0 CHECK (gate_distance_minutes >= 0),
  predictive_fill_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Parking Spots Table
CREATE TABLE spots (
  id VARCHAR(32) PRIMARY KEY,
  zone_id VARCHAR(32) NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
  code VARCHAR(16) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL DEFAULT 'standard' 
    CHECK (type IN ('standard', 'ev', 'accessible', 'faculty', 'motorcycle')),
  status VARCHAR(20) NOT NULL DEFAULT 'free' 
    CHECK (status IN ('free', 'occupied', 'reserved', 'maintenance')),
  floor_level INT NOT NULL DEFAULT 1 CHECK (floor_level >= 1),
  row VARCHAR(16) NOT NULL,
  sensor_id VARCHAR(64),
  battery_level INT CHECK (battery_level BETWEEN 0 AND 100),
  signal_quality VARCHAR(16) CHECK (signal_quality IN ('strong', 'good', 'weak')),
  last_status_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  occupied_since TIMESTAMP WITH TIME ZONE,
  occupied_vehicle_type VARCHAR(64)
);

-- Indexes for sub-millisecond query performance
CREATE INDEX idx_spots_zone_status ON spots(zone_id, status);
CREATE INDEX idx_spots_type ON spots(type);

-- 3. Telemetry Event Audit Trail (Partition-ready)
CREATE TABLE telemetry_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id VARCHAR(32) NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('arrived', 'departed', 'manual', 'heartbeat')),
  status VARCHAR(20) NOT NULL,
  source VARCHAR(32) NOT NULL CHECK (source IN ('sensor', 'camera', 'simulator', 'manual')),
  battery INT CHECK (battery BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telemetry_created_at ON telemetry_logs(created_at DESC);
CREATE INDEX idx_telemetry_spot ON telemetry_logs(spot_id);

-- 4. User Notification Alerts
CREATE TABLE user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id VARCHAR(32) NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
  spot_type VARCHAR(20) DEFAULT 'any',
  user_label VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 📡 Hardware & Edge Vision Ingestion Guide

### 1. ESP32 + HC-SR04 Ultrasonic Sensor Pinout & C++ Firmware
- **Power**: 5V External or USB-C.
- **Wiring**:
  - `VCC` $\rightarrow$ 5V External
  - `GND` $\rightarrow$ Common Ground
  - `TRIG` $\rightarrow$ ESP32 GPIO 5
  - `ECHO` $\rightarrow$ ESP32 GPIO 18 (via 1k$\Omega$ / 2k$\Omega$ voltage divider to 3.3V)
- **Operational Loop**: Transmits HTTP `POST /api/update` upon detected state transition:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "Campus-IoT-WiFi";
const char* password = "CampusPassword";
const char* serverUrl = "http://campus-server:3000/api/update";
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
  digitalWrite(trigPin, LOW); delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10);
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
  delay(3000); // 3-second cycle
}
```

---

## 🚀 Running the Application & Verification

```bash
# 1. Install dependencies
npm install

# 2. Run automated unit test suite (49 Assertions, 100% Pass Rate)
npm test

# 3. Start full-stack development server on Port 3000
npm run dev

# 4. Access URLs in browser
# Student & Driver Lot Map:  http://localhost:3000
# Entrance Display Kiosk:    http://localhost:3000 (Click 'Entrance Kiosk' tab)
# In-App Review 2 Tech Hub:  http://localhost:3000 (Click 'Phase Report & Repo' or 'Tech Docs' in header)
```

---

## 🎯 Subsequent Review Technical Verification Checklist

- [x] **Granular Technical Documentation on Unit Testing**: 49 assertions detailed in full test matrix with inputs, invariants, assertions, and edge case coverage.
- [x] **Granular Technical Documentation on Error Boundaries**: Dual-level React 19 class boundaries, lifecycle methods, stack capture, and live fault injection sandbox.
- [x] **Expanded Code Comments**: High-density JSDoc annotations across `server.ts`, `server/store.ts`, `useParkingData.ts`, `ErrorBoundary.tsx`, and test suites.
- [x] **OpenAPI-Grade API Endpoints Documentation**: Complete route specification with query/body schemas, status codes, and tested cURL snippets.
- [x] **Exhaustive Database Schema & Relational DDL**: In-memory models, ER diagram, full Data Dictionary, and production PostgreSQL DDL table definitions.
- [x] **In-App Interactive Reviewer Hub**: Direct access to the live test executor, fault injector, API tester, and downloadable `Student_Phase_Report.md`.
