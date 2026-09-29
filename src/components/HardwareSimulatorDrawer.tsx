import React, { useState } from 'react';
import {
  Cpu,
  Play,
  Pause,
  RefreshCw,
  Send,
  Code2,
  Terminal,
  Activity,
  Sliders,
  Sparkles,
  Copy,
  Check,
  Zap,
  Camera,
  Layers,
} from 'lucide-react';
import { SimulatorConfig, TelemetryLogItem, ParkingSpot } from '../types';

interface HardwareSimulatorDrawerProps {
  simulatorConfig: SimulatorConfig;
  onToggleSimulator: () => void;
  onUpdateConfig: (config: Partial<SimulatorConfig>) => void;
  onTriggerStep: (zoneId?: string, action?: 'arrive' | 'depart') => void;
  onResetBaseline: () => void;
  telemetryLogs: TelemetryLogItem[];
  spots: ParkingSpot[];
  onManualSensorUpdate: (payload: any) => Promise<any>;
}

export const HardwareSimulatorDrawer: React.FC<HardwareSimulatorDrawerProps> = ({
  simulatorConfig,
  onToggleSimulator,
  onUpdateConfig,
  onTriggerStep,
  onResetBaseline,
  telemetryLogs,
  spots,
  onManualSensorUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'tester' | 'code' | 'logs'>('simulator');
  const [testSpotId, setTestSpotId] = useState<string>(spots[0]?.id || 'A-1A1');
  const [testStatus, setTestStatus] = useState<string>('occupied');
  const [testBattery, setTestBattery] = useState<number>(94);
  const [testSource, setTestSource] = useState<string>('sensor');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [codeType, setCodeType] = useState<'curl' | 'esp32' | 'python'>('curl');

  const handleSendTestPayload = async () => {
    setIsSending(true);
    setTestResponse(null);
    try {
      const res = await onManualSensorUpdate({
        spotId: testSpotId,
        status: testStatus,
        battery: testBattery,
        source: testSource,
        vehicleType: testStatus === 'occupied' ? 'Test Compact' : undefined,
      });
      setTestResponse(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setTestResponse(`Error: ${e?.message || e}`);
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const curlSnippet = `curl -X POST "${currentHost}/api/update" \\
  -H "Content-Type: application/json" \\
  -d '{
    "spotId": "${testSpotId}",
    "status": "${testStatus}",
    "sensorId": "ESP32-${testSpotId.replace(/[^A-Za-z0-9]/g, '')}",
    "battery": ${testBattery},
    "source": "sensor"
  }'`;

  const esp32Snippet = `// ESP32 Ultrasonic Parking Spot Sensor Client
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "CAMPUS_WIFI";
const char* password = "WIFI_PASSWORD";
const char* serverUrl = "${currentHost}/api/update";

const int trigPin = 5;
const int echoPin = 18;

void setup() {
  Serial.begin(115200);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void loop() {
  digitalWrite(trigPin, LOW); delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  float distanceCm = duration * 0.034 / 2;

  bool isOccupied = (distanceCm < 150.0); // Car closer than 1.5m

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    String payload = "{\\"spotId\\":\\"${testSpotId}\\",\\"status\\":\\"" + 
                     String(isOccupied ? "occupied" : "free") + 
                     "\\",\\"battery\\":95,\\"source\\":\\"sensor\\"}";
    int httpResponseCode = http.POST(payload);
    http.end();
  }
  delay(3000); // Sample every 3s
}`;

  const pythonCvSnippet = `# Raspberry Pi / Laptop Camera Zone Detector (OpenCV / YOLO)
import cv2
import requests
import time

SERVER_URL = "${currentHost}/api/update"
SPOT_ID = "${testSpotId}"

cap = cv2.VideoCapture(0) # USB Camera / RTSP stream

while True:
    ret, frame = cap.read()
    if not ret: break
    
    # Process ROI / Contour detection for spot occupancy
    # (Thresholding bounding box area for vehicle presence)
    occupied = False # Replace with cv2.countNonZero(mask) > threshold
    
    payload = {
        "spotId": SPOT_ID,
        "status": "occupied" if occupied else "free",
        "sensorId": "CAM-AI-01",
        "source": "camera"
    }
    
    try:
        r = requests.post(SERVER_URL, json=payload, timeout=2.0)
        print(f"Updated {SPOT_ID}: {r.status_code}")
    except Exception as e:
        print("Telemetry error:", e)
        
    time.sleep(5.0)`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-0">
      {/* Top Banner */}
      <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white">
              Hardware Sensor Integration & Simulator Bench
            </h2>
            <p className="text-xs text-slate-400">
              Test ultrasonic sensors, camera CV inputs, or automated campus simulation
            </p>
          </div>
        </div>

        {/* Simulator Master Switch */}
        <div className="flex items-center gap-3">
          <button
            id="sim-master-toggle"
            onClick={onToggleSimulator}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              simulatorConfig.active
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {simulatorConfig.active ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Auto-Sim</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Auto-Sim</span>
              </>
            )}
          </button>

          <button
            id="sim-reset-baseline"
            onClick={onResetBaseline}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            title="Reset campus lots to morning baseline state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Baseline</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 px-5 flex items-center gap-2 bg-slate-50/70">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`py-3 px-3 border-b-2 text-xs font-bold transition-all ${
            activeTab === 'simulator'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Simulation Controls
        </button>

        <button
          onClick={() => setActiveTab('tester')}
          className={`py-3 px-3 border-b-2 text-xs font-bold transition-all ${
            activeTab === 'tester'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Sensor API Tester (POST /api/update)
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`py-3 px-3 border-b-2 text-xs font-bold transition-all ${
            activeTab === 'code'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Hardware Code (ESP32 / Camera)
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`py-3 px-3 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Live Telemetry</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Tab 1: Simulator */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Configuration */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5" /> Simulation Dynamics
                </h3>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Event Interval: {simulatorConfig.intervalMs / 1000}s
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="10000"
                    step="1000"
                    value={simulatorConfig.intervalMs}
                    onChange={(e) => onUpdateConfig({ intervalMs: Number(e.target.value) })}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>1s (Rapid)</span>
                    <span>4s (Default)</span>
                    <span>10s (Slow)</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Campus Rush Scenario
                  </label>
                  <select
                    value={simulatorConfig.rushMode}
                    onChange={(e) => onUpdateConfig({ rushMode: e.target.value as any })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="off">Balanced Turnover (Standard Day)</option>
                    <option value="morning_arrival">🚗 Morning Rush (80% Arrivals)</option>
                    <option value="evening_departure">🚙 Evening Class End (80% Departures)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Change Probability: {Math.round(simulatorConfig.changeProbability * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={simulatorConfig.changeProbability}
                    onChange={(e) => onUpdateConfig({ changeProbability: Number(e.target.value) })}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Right: Manual Triggers */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Instant Step Triggers
                </h3>

                <p className="text-xs text-slate-600">
                  Trigger isolated vehicle events to verify instant WebSocket state propagation and student alert sound notifications.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-trigger-arrive"
                    onClick={() => onTriggerStep(undefined, 'arrive')}
                    className="p-3 bg-white hover:bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 shadow-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Simulate Car Arrival</span>
                    <span className="text-[10px] text-slate-400 font-normal">Fills 1 random spot</span>
                  </button>

                  <button
                    id="btn-trigger-depart"
                    onClick={() => onTriggerStep(undefined, 'depart')}
                    className="p-3 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 shadow-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Simulate Car Departure</span>
                    <span className="text-[10px] text-slate-400 font-normal">Frees 1 random spot</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-xs font-semibold text-slate-700 block mb-2">
                    Target Specific Zone:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {['zone-a', 'zone-b', 'zone-c', 'zone-d'].map((zId) => (
                      <button
                        key={zId}
                        onClick={() => onTriggerStep(zId, 'depart')}
                        className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-mono font-bold text-slate-700"
                      >
                        Free {zId.replace('zone-', '').toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive API Tester */}
        {activeTab === 'tester' && (
          <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-600 mb-4">
                Simulate an HTTP request from an IoT microcontroller or smart camera to the backend endpoint <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono font-bold">POST /api/update</code>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Spot ID</label>
                  <select
                    value={testSpotId}
                    onChange={(e) => setTestSpotId(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-mono font-semibold"
                  >
                    {spots.slice(0, 32).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Status</label>
                  <select
                    value={testStatus}
                    onChange={(e) => setTestStatus(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-semibold"
                  >
                    <option value="occupied">Occupied (Car detected)</option>
                    <option value="free">Free (Vacant)</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Battery Level (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={testBattery}
                    onChange={(e) => setTestBattery(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Source Interface</label>
                  <select
                    value={testSource}
                    onChange={(e) => setTestSource(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-semibold"
                  >
                    <option value="sensor">Ultrasonic Sensor (ESP32)</option>
                    <option value="camera">Computer Vision Camera (YOLO)</option>
                    <option value="manual">Manual Admin Override</option>
                  </select>
                </div>
              </div>

              <button
                id="btn-dispatch-test-ping"
                onClick={handleSendTestPayload}
                disabled={isSending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending HTTP Request...' : 'Dispatch Sensor Ping (POST /api/update)'}</span>
              </button>
            </div>

            {testResponse && (
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-white">
                <div className="text-[11px] font-mono text-emerald-400 mb-2 font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Backend Ingestion Response (HTTP 200 OK):
                </div>
                <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 bg-slate-950 rounded-lg">
                  {testResponse}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Hardware Code Generator */}
        {activeTab === 'code' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCodeType('curl')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  codeType === 'curl' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                cURL Webhook
              </button>
              <button
                onClick={() => setCodeType('esp32')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  codeType === 'esp32' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                ESP32 (Arduino C++)
              </button>
              <button
                onClick={() => setCodeType('python')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  codeType === 'python' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Python (Camera OpenCV)
              </button>
            </div>

            <div className="relative bg-slate-950 rounded-xl p-4 border border-slate-800 text-slate-300 font-mono text-xs">
              <button
                onClick={() =>
                  copyToClipboard(
                    codeType === 'curl' ? curlSnippet : codeType === 'esp32' ? esp32Snippet : pythonCvSnippet,
                    codeType
                  )
                }
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                {copiedCode === codeType ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>

              <pre className="overflow-x-auto pt-4 leading-relaxed">
                {codeType === 'curl' && curlSnippet}
                {codeType === 'esp32' && esp32Snippet}
                {codeType === 'python' && pythonCvSnippet}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: Live Telemetry Logs */}
        {activeTab === 'logs' && (
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-slate-300 font-mono text-xs max-h-96 overflow-y-auto space-y-1.5">
            <div className="text-[11px] text-slate-500 pb-2 border-b border-slate-800 flex justify-between">
              <span>REAL-TIME SENSOR TELEMETRY LOG</span>
              <span>BUFFER: {telemetryLogs.length} EVENTS</span>
            </div>

            {telemetryLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-600">Waiting for live sensor event data...</div>
            ) : (
              telemetryLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between hover:bg-slate-900/50 px-1 py-0.5 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">[{log.time}]</span>
                    <span className="text-slate-300 font-bold">{log.spotId}</span>
                    <span className="text-slate-500">({log.zoneCode})</span>
                    <span
                      className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                        log.action === 'arrived'
                          ? 'bg-rose-950 text-rose-400'
                          : log.action === 'departed'
                          ? 'bg-emerald-950 text-emerald-400'
                          : 'bg-amber-950 text-amber-400'
                      }`}
                    >
                      {log.action.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-slate-500 text-[11px] flex items-center gap-3">
                    <span>via {log.source}</span>
                    {log.battery && <span>{log.battery}% batt</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
