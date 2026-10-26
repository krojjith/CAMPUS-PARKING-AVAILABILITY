# STUDENT PHASE REPORT: REAL-TIME CAMPUS PARKING AVAILABILITY SYSTEM
**Evaluation Milestone:** Phase 2 / Review 2 Milestone Report (70%+ Completion)  
**Project Title:** ParkCampus: Real-Time IoT Campus Parking Availability & Guidance System  
**Student Name:** Rojjith K  
**Student ID / Reg No:** STU-2026-IOT-8812  
**Student Email:** krojjith@gmail.com  
**Course & Department:** CS 492: Senior Capstone / IoT & Real-Time Distributed Systems  
**GitHub Repository:** [https://github.com/krojjith/realtime-parking-availability-system](https://github.com/krojjith/realtime-parking-availability-system)  
**Live Production Applet:** [https://ais-pre-4f6iknn2mdzfsrdis7sqqg-617239220030.asia-southeast1.run.app](https://ais-pre-4f6iknn2mdzfsrdis7sqqg-617239220030.asia-southeast1.run.app)  
**Date of Submission:** September 29, 2026

---

## 1. Executive Summary & Project Abstract
The **ParkCampus Real-Time Parking Availability System** addresses acute college campus parking congestion, entry-gate bottlenecks, and fuel-wasting cruising delays by providing instantaneous, authoritative occupancy telemetry across campus lots. Designed as a flexible, hybrid edge-cloud solution, ParkCampus ingests live sensor signals from per-stall microcontrollers (ESP32 with HC-SR04 ultrasonic / IR sensors), row-level edge cameras (Raspberry Pi running lightweight OpenCV contour centroid detection or YOLOv8-nano), or an integrated stochastic traffic simulator.

An authoritative Node.js/Express ingestion backend maintains the single source of truth and multicasts live updates over **WebSockets** and **Server-Sent Events (SSE)**. Commuters and campus security interact through two purpose-built interfaces:
1. **Roadside Entrance Display Board (Kiosk)**: Ultra-high-contrast, color-coded signage (Green > 35%, Yellow 12–35%, Red $\le$ 12%) with directional arrows that drivers view before entering lot gates.
2. **Mobile-Friendly Web App**: An interactive 112-stall campus lot map with real-time stall reserve/toggle actions, ADA/EV/Faculty filters, audio chime alert subscriptions (*"Notify me when Zone B has an open spot"*), and historical peak-fill predictive curves.

---

## 2. Review 1 Feedback & Review 2 Remediation Matrix
In the **Review 1 Evaluation (35% completion)**, the evaluation committee commended the functional architecture but noted specific areas for improvement before Review 2:

| Review 1 Evaluation Point | Committee Feedback | Review 2 / Phase 2 Implemented Resolution | Review 2 Status |
| :--- | :--- | :--- | :---: |
| **Functional Components** | Commended clear scope and deliverable definition. | Maintained 100% of required functional deliverables across both client modes. | **Verified** |
| **Repository Structure** | Noted established public repository with foundational structure. | Organized clean full-stack monorepo: `/src`, `/server`, `/test`, `README.md`. | **Verified** |
| **Unit Testing Documentation** | *"Provide more granular technical documentation on unit testing."* | **Engineered 49 automated test assertions** (`npm test`) covering store math, thresholds, API schemas, and React hooks. | **100% Resolved** |
| **Error Boundaries** | *"Provide more granular technical documentation on error boundaries."* | **Implemented React 19 class Error Boundary** with section-level fault containment and live in-app fault injection sandbox. | **100% Resolved** |
| **API & Database Docs** | *"Expand code comments and document API endpoints / database schema in README."* | **Comprehensive JSDoc comments**, full OpenAPI reference for 8 endpoints, and normalized PostgreSQL DDL schema. | **100% Resolved** |

---

## 3. End-to-End System Architecture

```
   ┌─────────────────────────────────────────────────────────────┐
   │                   EDGE INGESTION LAYER                      │
   │  ┌────────────────────────┐      ┌───────────────────────┐  │
   │  │   ESP32 Microcontroller│      │ Raspberry Pi 4 + CV   │  │
   │  │  HC-SR04 Ultrasonic    │      │ YOLOv8-nano / OpenCV  │  │
   │  └───────────┬────────────┘      └───────────┬───────────┘  │
   │              │                               │              │
   │              │ HTTP POST /api/update         │ HTTP POST    │
   │              │                               │              │
   │              ▼                               ▼              │
   │  ┌───────────────────────────────────────────────────────┐  │
   │  │  In-Memory Stochastic Simulator (Burst/Rush-Hour/Step)│  │
   │  └───────────────────────────┬───────────────────────────┘  │
   └──────────────────────────────┼──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                 BACKEND TELEMETRY ENGINE                    │
   │  Node.js + Express (Port 3000)                              │
   │  • Authoritative State Machine (112 Stalls, 4 Campus Zones)  │
   │  • Occupancy Thresholds: Plenty (>35%), Filling, Full(≤12%) │
   │  • Circular Audit Ring Buffer (Latest 50 Telemetry Logs)    │
   │  • WebSocket Multiplexer (ws://host/ws)                     │
   │  • Server-Sent Events Broadcast (/api/stream)               │
   │  • Relational Schema Model (PostgreSQL DDL Migration Ready) │
   └──────────────┬───────────────────────────────┬──────────────┘
                  │                               │
         WebSocket / SSE                 WebSocket / SSE
                  │                               │
                  ▼                               ▼
   ┌─────────────────────────────┐ ┌─────────────────────────────┐
   │    ENTRANCE DISPLAY BOARD   │ │    MOBILE DRIVER WEB APP    │
   │  • Kiosk Full-Screen Mode   │ │  • Interactive SVG Lot Map  │
   │  • Dynamic Color Badges     │ │  • Spot Status Detail Modal │
   │  • Directional Arrows       │ │  • Audio Chime Alert Center │
   │  • High-Contrast Luminance  │ │  • Predictive Peak Fill Time│
   └─────────────────────────────┘ └─────────────────────────────┘
```

---

## 4. Phase 2 Completed Deliverables & Functional Progress (70% Milestone)

| Milestone Component | Requirement Specification | Implementation Details | Completion |
| :--- | :--- | :--- | :---: |
| **Occupancy Detection** | Microcontroller sensors, camera CV, or simulator | ESP32 C++ driver, Raspberry Pi YOLO script, and stochastic background traffic generator with burst & departure controls. | **100%** |
| **Backend REST Ingestion** | State store & REST API | Express server with `GET /api/zones`, `GET /api/zones/:id/availability`, `POST /api/update`, `POST /api/simulator/step`. | **100%** |
| **Live Push Transport** | WebSockets & SSE | Dual-transport multiplexing (`ws://` + `/api/stream`) with auto-reconnection and seamless fallback. | **100%** |
| **Roadside Entrance Kiosk** | Public signage board | Fullscreen entrance board displaying all 4 campus zones with color-coded density cards, live counts, and directional arrows. | **100%** |
| **Student / Driver Map** | Mobile-friendly lot visualizer | Interactive lot map with 112 individual stalls, filterable by Accessible (ADA), EV Charging, Faculty, and Standard. | **100%** |
| **Proactive Spot Alerts** | User notification engine | "Notify me when Zone B has an open spot" with Web Audio chime synthesis and animated in-app toast notices. | **100%** |
| **Peak-Hour Analytics** | Historical logging & charts | Hourly occupancy distribution, peak fill-time graphs, and predictive notes ("Zone B usually fills by 9:15 AM"). | **100%** |
| **Admin Facilities PIN** | Role-based controls | Security PIN authentication for facilities staff to reset baselines or configure rush-hour simulation parameters. | **100%** |
| **Quality Verification** | Unit tests & error handling | Automated 49-assertion test suite (`npm test`) and React 19 class Error Boundary fault-containment sandbox. | **100%** |

---

## 5. Granular Unit Testing Suite Verification
To address Review 1 feedback, the project includes an automated test runner (`npm test` via `tsx test/run-tests.ts`). All **49 test assertions** run and pass synchronously with zero failures.

### Suite Breakdown
1. **`test/parkingStore.test.ts` (29 Assertions Passed)**:
   - Initial spot distribution across Zone A (32), Zone B (24), Zone C (40), and Zone D (16).
   - Zone availability calculations: `occupiedSpots`, `freeSpots`, `occupancyPercentage`.
   - Threshold transitions: `plenty` (> 35% free), `filling` (12–35% free), and `full` ($\le$ 12% free).
   - Telemetry audit logging and 50-item circular ring-buffer boundary conditions.
   - Event pub/sub listener registration, execution, and unsubscription.
2. **`test/apiEndpoints.test.ts` (11 Assertions Passed)**:
   - HTTP route schema verification and status code correctness.
   - Rejection of malformed requests with missing `spotId` or `status` (400 Bad Request).
   - Rejection of invalid status strings outside the allowed enum (`free`, `occupied`, `reserved`).
   - Rejection of unsafe simulator interval (< 500ms) and probability bounds check.
   - Case-insensitive zone identifier normalization (`ZONE-B` $\rightarrow$ `zone-b`) and 404 handling.
3. **`test/errorBoundary.test.ts` (9 Assertions Passed)**:
   - Pure state transition validation (`hasError: false` $\rightarrow$ `hasError: true`).
   - Error message and class type extraction and retention.
   - Component error boundary recovery reset (`handleResetState()`).
   - Sub-view blast-radius isolation: verifying that an internal crash in `AnalyticsView` does not impair `CampusLotMap` or `EntranceBoard`.

---

## 6. Error Boundary & Fault Tolerance Strategy
The application employs React 19 class-based Error Boundaries (`src/components/ErrorBoundary.tsx`):
- **Root-Level Error Boundary**: Catches fatal uncaught rendering exceptions, prevents blank screens, and offers a full system reboot button.
- **Section-Level Error Boundaries**: Each primary sub-view (`CampusLotMap`, `EntranceBoard`, `AnalyticsView`, `HardwareSimulatorDrawer`) is wrapped in a dedicated `SectionErrorBoundary`.
- **Fault Containment**: If a third-party charting calculation fails in the Analytics tab, the roadside Entrance Board and Driver Map remain 100% operational without interruption to live telemetry streams.
- **In-App Fault Injection**: Evaluators can trigger simulated runtime errors directly inside the "Tech Docs" modal to witness automatic recovery.

---

## 7. Database Schema & Relational DDL Reference
The system utilizes an in-memory high-throughput state store with an authoritative schema, along with a production-ready PostgreSQL relational DDL specification:

```sql
-- 1. Campus Zones Table
CREATE TABLE zones (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    total_spots INT NOT NULL CHECK (total_spots > 0),
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    direction_hint VARCHAR(64) NOT NULL,
    color_theme VARCHAR(32) DEFAULT 'emerald'
);

-- 2. Parking Spots Table
CREATE TABLE parking_spots (
    id VARCHAR(32) PRIMARY KEY,
    zone_id VARCHAR(32) NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    spot_number INT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'accessible', 'ev', 'faculty')),
    status VARCHAR(32) NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved')),
    battery INT CHECK (battery >= 0 AND battery <= 100),
    occupied_since TIMESTAMP WITH TIME ZONE,
    last_status_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_zone_spot UNIQUE (zone_id, spot_number)
);

-- 3. Telemetry Event Audit Log
CREATE TABLE sensor_telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    spot_id VARCHAR(32) NOT NULL REFERENCES parking_spots(id) ON DELETE CASCADE,
    zone_id VARCHAR(32) NOT NULL REFERENCES zones(id),
    status VARCHAR(32) NOT NULL,
    battery INT,
    source VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Historical Hourly Occupancy Rollups
CREATE TABLE historical_occupancy_snapshots (
    id BIGSERIAL PRIMARY KEY,
    zone_id VARCHAR(32) NOT NULL REFERENCES zones(id),
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    hour_of_day INT NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
    avg_occupancy_percentage NUMERIC(5,2) NOT NULL CHECK (avg_occupancy_percentage BETWEEN 0 AND 100)
);
```

---

## 8. REST & Real-Time API Endpoint Specification

| Method | Endpoint | Query / Payload Parameters | Response Status | Functional Description |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/zones` | None | `200 OK` | Retrieves all 4 campus zones with aggregate free/occupied counts and status. |
| `GET` | `/api/zones/:id` | Route param `:id` | `200 OK` / `404` | Retrieves zone metadata and full array of associated stalls. |
| `GET` | `/api/zones/:id/availability` | Route param `:id` | `200 OK` / `404` | Lightweight endpoint returning free count, percentage, and density badge. |
| `POST` | `/api/update` | `{ spotId, status, battery, source }` | `200 OK` / `400` | Ingests sensor/camera telemetry and multicasts to WebSocket/SSE clients. |
| `POST` | `/api/simulator/toggle` | None | `200 OK` | Pauses or resumes the internal background traffic generation loop. |
| `POST` | `/api/simulator/step` | `{ zoneId, action }` | `200 OK` / `400` | Forces immediate vehicle arrival or departure in the target zone. |
| `GET` | `/api/stream` | None | `200 OK (text/event-stream)` | Server-Sent Events push feed streaming `SPOT_UPDATE` events. |
| `WS` | `/ws` | None | `101 Switching Protocols` | Bi-directional WebSocket stream for instant sub-millisecond updates. |

---

## 9. Hardware & Edge Vision Ingestion Specification

### Option A: Per-Spot Microcontroller (ESP32 DevKit V1)
- **Sensor:** HC-SR04 Ultrasonic Distance Sensor or Sharp GP2Y0A21YK0F IR Sensor.
- **Pinout:** `VCC` $\rightarrow$ 5V, `GND` $\rightarrow$ GND, `TRIG` $\rightarrow$ GPIO 5, `ECHO` $\rightarrow$ GPIO 18 (with voltage divider to 3.3V).
- **Firmware Logic:** Measures distance every 500ms; if distance is $< 150\text{ cm}$ continuously for 1.5 seconds, transmits HTTP POST to `/api/update` with `status: "occupied"`. Deep-sleep enabled when free to conserve battery.

### Option B: Zone-Level Edge Vision (Raspberry Pi 4 + Camera)
- **Hardware:** Raspberry Pi 4 Model B (4GB) + Raspberry Pi Camera Module 3 (Wide FOV).
- **Processing:** Lightweight Python script using OpenCV contour detection or YOLOv8-nano (`yolov8n.pt`) with pre-defined bounding boxes for each stall in the camera's field of view.
- **Ingestion:** Evaluates parking stall polygons at 2 FPS and emits JSON payloads to `POST /api/update` only when occupancy state changes.

---

## 10. Repository Submission & Execution Instructions

### Repository Details
- **GitHub URL:** [https://github.com/krojjith/realtime-parking-availability-system](https://github.com/krojjith/realtime-parking-availability-system)
- **Branch:** `main`
- **License:** Apache-2.0

### Local Reproduction & Evaluation Steps
```bash
# 1. Clone the repository
git clone https://github.com/krojjith/realtime-parking-availability-system.git
cd realtime-parking-availability-system

# 2. Install dependencies
npm install

# 3. Run the automated unit test suite (49 assertions)
npm test

# 4. Start the full-stack development server
npm run dev

# 5. Access the application
# Web App:          http://localhost:3000
# Entrance Kiosk:   http://localhost:3000 (Switch to 'Entrance Kiosk' tab)
# Tech Docs & Spec: http://localhost:3000 (Click 'Phase Report & Repo' in header)
```

---

## 11. Phase 3 (100% Final Review) Next Steps
1. **Weatherproof 3D-Printed Enclosures:** Fabrication of IP65-rated enclosures for solar-backed ESP32 units.
2. **Automated License Plate Recognition (ALPR):** Prototype camera-based permit authorization integration for staff stalls.
3. **Campus Push & SMS Service:** Integration with Twilio / Web Push API for SMS spot availability alerts when approaching campus geofences.
4. **Relational PostgreSQL Deployment:** Provisioning Cloud SQL / Supabase with Drizzle ORM matching the documented DDL schema.

---
*Report prepared and submitted for academic project review.*
