import React, { useState, useEffect, useRef } from 'react';
import { RealESP32SensorDataProvider } from '../../services/SensorDataProvider';
import { useTheme } from '../../context/ThemeContext';

interface RealHardwareModalProps {
  realProvider: RealESP32SensorDataProvider;
  onConnected: () => void;
  onDisconnected: () => void;
  onClose: () => void;
}

export const RealHardwareModal: React.FC<RealHardwareModalProps> = ({
  realProvider,
  onConnected,
  onDisconnected,
  onClose,
}) => {
  const { isDark } = useTheme();
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'SERIAL' | 'MONITOR' | 'FIRMWARE'>('SERIAL');
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [mockInput, setMockInput] = useState<string>(
    'DATA: [LOAD] W: 0.50 kg | F: 4.90 N | [STRESS] Dyn: 0.045 MPa | Peak: 0.120 MPa | [G-FORCE] 1.15 G (Shock: 11.2 m/s2) | [WARP] ΔR: 28.5° | ΔP: 14.2° | [GYRO] 2.4 °/s | [TEMP] Chassis: 26.5 C (IMU: 42.0 C) --> FRAME TORSION TWIST!'
  );

  // Subscribe to live log stream
  useEffect(() => {
    const unsub = realProvider.subscribeLogs((line) => {
      setLogs((prev) => [...prev.slice(-60), line]);
    });
    return () => unsub();
  }, [realProvider]);

  useEffect(() => {
    if (activeTab === 'MONITOR' && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  const handleConnectSerial = async () => {
    setStatusMsg('Requesting Serial Port via Web Serial API (with DTR/RTS)...');
    const res = await realProvider.connectSerial(baudRate);
    setStatusMsg(res.message);
    if (res.success) {
      onConnected();
    }
  };

  const handleDisconnectSerial = async () => {
    await realProvider.disconnectSerial();
    setStatusMsg('Disconnected from Serial Port.');
    onDisconnected();
  };

  const handleInjectMock = () => {
    const ok = realProvider.parseSerialLine(mockInput);
    if (ok) {
      setStatusMsg('✓ Telemetry line parsed and streamed to 3D scene!');
      onConnected();
    } else {
      setStatusMsg('⚠ Failed to parse telemetry line.');
    }
  };

  const sampleCppCode = `// =================================================================
// SHIELD — ESP32 Structural Health Monitoring Firmware
// Outputs formatted text & JSON telemetry over USB-Serial at 115200 baud
// =================================================================
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "HX711.h"

// Pin Definitions
#define PIN_LED_GREEN   0   // Normal Status LED
#define PIN_LED_YELLOW  1   // Warning Status LED
#define PIN_BUZZER      3   // Piezo Buzzer
#define PIN_L298N_IN3   4   // Vibration Motor
#define PIN_DS18B20     5   // 1-Wire Temp Sensor
#define PIN_HX711_DT    6   // HX711 Serial Data
#define PIN_HX711_SCK   7   // HX711 Serial Clock
#define PIN_I2C_SDA     8   // MPU6050 SDA
#define PIN_I2C_SCL     9   // MPU6050 SCL
#define PIN_LED_RED     10  // Critical Status LED

Adafruit_MPU6050 mpu;
OneWire oneWire(PIN_DS18B20);
DallasTemperature tempSensor(&oneWire);
HX711 scale;

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_L298N_IN3, OUTPUT);

  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  mpu.begin();
  tempSensor.begin();
  scale.begin(PIN_HX711_DT, PIN_HX711_SCK);
}

void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  tempSensor.requestTemperatures();
  float chassisTemp = tempSensor.getTempCByIndex(0);

  long rawStrain = scale.is_ready() ? scale.read() : 0;
  float microStrain = (rawStrain - 842000) / 18.4;
  float loadKg = microStrain * 0.125;
  float dynMpa = microStrain / 500.0;

  float roll = atan2(a.acceleration.y, a.acceleration.z) * 180.0 / PI;
  float pitch = atan2(-a.acceleration.x, sqrt(a.acceleration.y * a.acceleration.y + a.acceleration.z * a.acceleration.z)) * 180.0 / PI;

  bool twist = abs(roll) > 25.0 || microStrain > 800.0;

  digitalWrite(PIN_LED_GREEN, !twist);
  digitalWrite(PIN_LED_RED, twist);
  digitalWrite(PIN_BUZZER, twist);
  analogWrite(PIN_L298N_IN3, twist ? 255 : 0);

  // Stream formatted output over Serial
  Serial.printf("DATA: [LOAD] W: %.2f kg | F: %.2f N | [STRESS] Dyn: %.3f MPa | Peak: %.3f MPa | [G-FORCE] %.2f G (Shock: %.1f m/s2) | [WARP] ΔR: %.1f° | ΔP: %.1f° | [GYRO] %.1f °/s | [TEMP] Chassis: %.1f C (IMU: %.1f C)%s\\n",
    loadKg, loadKg * 9.81, dynMpa, dynMpa * 1.2,
    sqrt(a.acceleration.x*a.acceleration.x + a.acceleration.y*a.acceleration.y + a.acceleration.z*a.acceleration.z) / 9.81,
    sqrt(a.acceleration.x*a.acceleration.x + a.acceleration.y*a.acceleration.y + a.acceleration.z*a.acceleration.z),
    roll, pitch, g.gyro.z * 57.3,
    chassisTemp, temp.temperature,
    twist ? " --> FRAME TORSION TWIST!" : ""
  );

  delay(40); // 25 Hz
}
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className={`w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] border transition-colors ${
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold font-['Chakra_Petch'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Real Hardware Serial &amp; WebSocket Bridge
              </h2>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                  realProvider.isConnected
                    ? isDark ? 'bg-emerald-950 border border-emerald-500/80 text-emerald-300 animate-pulse' : 'bg-emerald-100 border border-emerald-400 text-emerald-800'
                    : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {realProvider.isConnected ? '● LIVE CONNECTED' : '○ DISCONNECTED'}
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Streams real sensor telemetry from COM5 into the 3D hardware bench in real-time
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={`flex border-b px-4 pt-2 gap-1 ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-100/70'
        }`}>
          <button
            onClick={() => setActiveTab('SERIAL')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'SERIAL'
                ? isDark ? 'border-blue-500 text-blue-400' : 'border-blue-600 text-blue-600 font-bold'
                : isDark ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            🔌 Connection Options
          </button>
          <button
            onClick={() => setActiveTab('MONITOR')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'MONITOR'
                ? isDark ? 'border-cyan-500 text-cyan-400' : 'border-cyan-600 text-cyan-700 font-bold'
                : isDark ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📟 Live Serial Monitor</span>
            {logs.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('FIRMWARE')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'FIRMWARE'
                ? isDark ? 'border-blue-500 text-blue-400' : 'border-blue-600 text-blue-600 font-bold'
                : isDark ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            💻 C++ Firmware Sketch
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-['Plus_Jakarta_Sans'] flex-1">
          {activeTab === 'SERIAL' && (
            <>
              {/* Method 1: Python Bridge */}
              <div className={`p-3.5 border rounded-lg space-y-2 ${
                isDark ? 'bg-slate-950/80 border-blue-500/30' : 'bg-blue-50/60 border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Method 1:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Python Serial Bridge (Recommended)</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
                    isDark ? 'bg-blue-950/80 border-blue-500/50 text-blue-300' : 'bg-blue-100 border-blue-300 text-blue-800'
                  }`}>
                    ws://localhost:8765
                  </span>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Run the background bridge script in your terminal. The 3D web simulation connects automatically with zero browser popups:
                </p>
                <div className={`p-2 border rounded font-mono flex items-center justify-between ${
                  isDark ? 'bg-slate-900 border-slate-800 text-cyan-300' : 'bg-white border-slate-300 text-slate-900'
                }`}>
                  <code>python serial_bridge.py</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('python serial_bridge.py');
                      setStatusMsg('✓ Copied "python serial_bridge.py" to clipboard!');
                    }}
                    className={`px-2 py-1 text-[10px] rounded cursor-pointer ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Method 2: Direct Web Serial API */}
              <div className={`p-3.5 border rounded-lg space-y-3 font-mono ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>Method 2:</span>
                    <span className={`font-semibold font-['Plus_Jakarta_Sans'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Direct Browser USB Serial (Chrome / Edge)
                    </span>
                  </div>
                  <span
                    className={`font-bold text-xs ${
                      realProvider.isConnected
                        ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                        : isDark ? 'text-slate-500' : 'text-slate-500'
                    }`}
                  >
                    {realProvider.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Baud Rate:</span>
                  <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    disabled={realProvider.isConnected}
                    className={`rounded px-2 py-1 text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value={115200}>115200 baud (Standard)</option>
                    <option value={9600}>9600 baud</option>
                    <option value={57600}>57600 baud</option>
                    <option value={230400}>230400 baud (High Speed)</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  {!realProvider.isConnected ? (
                    <button
                      onClick={handleConnectSerial}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      Connect USB Port (Web Serial)
                    </button>
                  ) : (
                    <button
                      onClick={handleDisconnectSerial}
                      className="px-4 py-2 text-xs font-semibold text-rose-300 bg-rose-950/80 hover:bg-rose-900 border border-rose-600 rounded-lg transition-colors cursor-pointer"
                    >
                      Disconnect Port
                    </button>
                  )}
                </div>
              </div>

              {statusMsg && (
                <div className={`p-2.5 border rounded font-mono text-xs ${
                  isDark ? 'bg-slate-950 border-slate-800 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-900'
                }`}>
                  {statusMsg}
                </div>
              )}

              {/* Packet Injection / Manual Testing */}
              <div className={`p-3 border rounded-lg space-y-2 ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[11px] font-mono uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Manual Telemetry Line Injector (Test Packet)
                </span>
                <textarea
                  value={mockInput}
                  onChange={(e) => setMockInput(e.target.value)}
                  rows={2}
                  className={`w-full rounded p-2 text-xs font-mono resize-none border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
                <button
                  onClick={handleInjectMock}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer border ${
                    isDark
                      ? 'text-cyan-300 bg-cyan-950 hover:bg-cyan-900 border-cyan-500/50'
                      : 'text-cyan-900 bg-cyan-100 hover:bg-cyan-200 border-cyan-300'
                  }`}
                >
                  Send Line to 3D Simulator
                </button>
              </div>
            </>
          )}

          {activeTab === 'MONITOR' && (
            <div className="space-y-2 flex flex-col h-full">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Live Serial Telemetry Stream from Hardware:
                </span>
                <button
                  onClick={() => setLogs([])}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer border ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  Clear Log
                </button>
              </div>
              <div className={`p-3 border rounded-lg font-mono text-[11px] h-72 overflow-y-auto space-y-1 select-text ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-800'
              }`}>
                {logs.length === 0 ? (
                  <div className="text-slate-500 italic">
                    Waiting for serial packets from COM5 / WebSocket bridge...
                  </div>
                ) : (
                  logs.map((line, idx) => (
                    <div
                      key={idx}
                      className={
                        line.includes('TWIST') || line.includes('CRITICAL') || line.includes('TORSION')
                          ? 'text-rose-400 font-semibold'
                          : line.includes('WARN')
                          ? 'text-amber-400'
                          : 'text-cyan-300'
                      }
                    >
                      {line}
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {activeTab === 'FIRMWARE' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Ready-to-flash C++ sketch for Arduino IDE / PlatformIO:
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sampleCppCode);
                    setStatusMsg('✓ Copied firmware code to clipboard!');
                  }}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors cursor-pointer border ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  Copy Code
                </button>
              </div>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[50vh] leading-relaxed">
                {sampleCppCode}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex justify-end ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-100'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer border ${
              isDark ? 'text-white bg-slate-800 hover:bg-slate-700 border-slate-700' : 'text-slate-800 bg-white hover:bg-slate-100 border-slate-300 shadow-sm'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

