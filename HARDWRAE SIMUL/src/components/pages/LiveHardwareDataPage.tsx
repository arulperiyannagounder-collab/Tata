import React, { useState, useEffect, useRef } from 'react';
import { SensorTelemetry, HardwareParameters } from '../../types/simulation';
import { useTheme } from '../../context/ThemeContext';

interface LiveHardwareDataPageProps {
  telemetry: SensorTelemetry;
  hardwareParams: HardwareParameters;
  onNavigateToControl: () => void;
  onHardwareControl: (command: string) => Promise<void>;
  onOpenRealHardwareModal: () => void;
  logs: string[];
}

export const LiveHardwareDataPage: React.FC<LiveHardwareDataPageProps> = ({
  telemetry,
  hardwareParams,
  onNavigateToControl,
  onHardwareControl,
  onOpenRealHardwareModal,
  logs,
}) => {
  const { isDark } = useTheme();
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Historical telemetry points for live sparkline graphs (rolling 40 points)
  const [history, setHistory] = useState<
    Array<{ time: number; weight: number; temp: number; stress: number; roll: number }>
  >([]);

  useEffect(() => {
    const dynStress = +(telemetry.strainMicroStrain / 500.0).toFixed(3);
    setHistory((prev) => [
      ...prev.slice(-39),
      {
        time: Date.now(),
        weight: telemetry.loadKg,
        temp: telemetry.temperatureC,
        stress: dynStress,
        roll: telemetry.roll,
      },
    ]);
  }, [telemetry.timestamp]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = filterQuery
    ? logs.filter((l) => l.toLowerCase().includes(filterQuery.toLowerCase()))
    : logs;

  const isCritical = telemetry.systemStatus === 'CRITICAL';
  const isWarning = telemetry.systemStatus === 'WARNING';

  // SVG mini-graph helper
  const renderSparkline = (
    data: number[],
    color: string,
    minVal?: number,
    maxVal?: number,
    unit = ''
  ) => {
    if (data.length < 2) return <div className="h-10 text-xs text-slate-500 flex items-center">Streaming data...</div>;
    const min = minVal ?? Math.min(...data);
    const max = maxVal ?? Math.max(...data, min + 0.01);
    const range = max - min || 1;
    const width = 280;
    const height = 44;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-11 overflow-visible">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
        <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
          <span>Min: {min.toFixed(1)}{unit}</span>
          <span>Max: {max.toFixed(1)}{unit}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-6 select-none transition-colors duration-200 ${
      isDark ? 'bg-[#0a0e13] text-[#E6EDF5]' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Banner / Hardware Status Header */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border mb-6 ${
        isCritical
          ? 'bg-rose-950/40 border-rose-500/70 shadow-lg shadow-rose-950/30'
          : isWarning
          ? 'bg-amber-950/40 border-amber-500/70 shadow-lg shadow-amber-950/30'
          : isDark
          ? 'bg-[#10151c] border-[#1d2631]'
          : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl border font-bold text-xl ${
            isCritical
              ? 'bg-rose-600/20 border-rose-500 text-rose-400'
              : isWarning
              ? 'bg-amber-600/20 border-amber-500 text-amber-400'
              : 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
          }`}>
            <span>{isCritical ? '🚨' : isWarning ? '⚠️' : '⚡'}</span>
            <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 ${
              isDark ? 'border-slate-900' : 'border-white'
            } ${
              isCritical
                ? 'bg-rose-500 animate-ping'
                : isWarning
                ? 'bg-amber-500 animate-pulse'
                : 'bg-emerald-500 animate-pulse'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold font-['Chakra_Petch'] tracking-wide">
                Live Hardware Telemetry Stream
              </h2>
              <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded-md uppercase border ${
                telemetry.dataSource === 'REAL_HARDWARE'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              }`}>
                {telemetry.dataSource === 'REAL_HARDWARE' ? 'COM Port Active' : 'Physics Simulation'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time multi-sensor telemetry feed streaming from physical ESP32 load cells, IMU &amp; thermal probes.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onHardwareControl('CMD:TARE')}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
            title="Zero out load cell tare offset"
          >
            <span>⚖️ Zero Tare</span>
          </button>

          <button
            onClick={onOpenRealHardwareModal}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              isDark
                ? 'bg-blue-950/80 hover:bg-blue-900 text-blue-300 border-blue-500/50'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300'
            }`}
          >
            <span>🔌 Connection Manager</span>
          </button>

          <button
            onClick={onNavigateToControl}
            className="px-3.5 py-1.5 text-xs font-bold font-['Chakra_Petch'] rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/40 border border-cyan-400 cursor-pointer flex items-center gap-1.5"
          >
            <span>🎛️ Configure Parameters &amp; Test</span>
            <span>➔</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 6 Key Hardware Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Card 1: Chassis Weight & Dynamic Force */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Chassis Weight &amp; Force
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                Warn: {hardwareParams.threshWeightWarnKg}kg | Crit: {hardwareParams.threshWeightCritKg}kg
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-black font-['Chakra_Petch'] text-cyan-400 tabular-nums">
                {telemetry.loadKg.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-slate-400">kg</span>
              <span className="text-xs font-mono text-slate-500 ml-auto">
                {(telemetry.loadKg * 9.81).toFixed(1)} N Force
              </span>
            </div>

            {/* Gauge progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  telemetry.loadKg >= hardwareParams.threshWeightCritKg
                    ? 'bg-rose-500'
                    : telemetry.loadKg >= hardwareParams.threshWeightWarnKg
                    ? 'bg-amber-400'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, (telemetry.loadKg / (hardwareParams.threshWeightCritKg * 1.25)) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Base Weight: <strong className="text-white">{hardwareParams.baseWeightKg} kg</strong></span>
              <span>Microstrain: <strong className="text-white">{telemetry.strainMicroStrain} με</strong></span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-500 block mb-1">LIVE WEIGHT HISTORY</span>
            {renderSparkline(history.map((h) => h.weight), '#22d3ee', 0, undefined, 'kg')}
          </div>
        </div>

        {/* Card 2: Structural Dynamic Stress & Deflection */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Structural Stress (MPa)
              </span>
              <span className="text-[11px] font-mono text-blue-400">Yield Limit: 0.450 MPa</span>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-black font-['Chakra_Petch'] text-blue-400 tabular-nums">
                {(telemetry.strainMicroStrain / 500.0).toFixed(3)}
              </span>
              <span className="text-sm font-bold text-slate-400">MPa</span>
              <span className="text-xs font-mono text-slate-500 ml-auto">
                Deflection: {telemetry.strainDeformationMm.toFixed(2)} mm
              </span>
            </div>

            {/* Gauge progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  telemetry.strainMicroStrain > 850 ? 'bg-rose-500' : telemetry.strainMicroStrain > 350 ? 'bg-amber-400' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, (telemetry.strainMicroStrain / 1000) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Peak Stress: <strong className="text-white">{((telemetry.strainMicroStrain / 500.0) * 1.25).toFixed(3)} MPa</strong></span>
              <span>LC Raw ADC: <strong className="text-white">{telemetry.loadCell1Raw}</strong></span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-500 block mb-1">LIVE STRESS HISTORY</span>
            {renderSparkline(history.map((h) => h.stress), '#60a5fa', 0, undefined, 'MPa')}
          </div>
        </div>

        {/* Card 3: Chassis Temperature */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Chassis Temperature
              </span>
              <span className="text-[11px] font-mono text-amber-400">
                Warn: {hardwareParams.threshTempWarnC}°C | Crit: {hardwareParams.threshTempCritC}°C
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className={`text-3xl font-black font-['Chakra_Petch'] tabular-nums ${
                telemetry.temperatureC >= hardwareParams.threshTempCritC
                  ? 'text-rose-400 animate-pulse'
                  : telemetry.temperatureC >= hardwareParams.threshTempWarnC
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {telemetry.temperatureC.toFixed(1)}
              </span>
              <span className="text-sm font-bold text-slate-400">°C</span>
              <span className="text-xs font-mono text-slate-500 ml-auto">
                {hardwareParams.tempOverrideC !== null ? '⚡ Overridden' : 'DS18B20 1-Wire'}
              </span>
            </div>

            {/* Gauge progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  telemetry.temperatureC >= hardwareParams.threshTempCritC
                    ? 'bg-rose-500'
                    : telemetry.temperatureC >= hardwareParams.threshTempWarnC
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (telemetry.temperatureC / (hardwareParams.threshTempCritC * 1.3)) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Status: <strong className={telemetry.temperatureC >= hardwareParams.threshTempCritC ? 'text-rose-400 font-bold' : telemetry.temperatureC >= hardwareParams.threshTempWarnC ? 'text-amber-400' : 'text-emerald-400'}>
                {telemetry.temperatureC >= hardwareParams.threshTempCritC ? 'OVERHEAT HAZARD' : telemetry.temperatureC >= hardwareParams.threshTempWarnC ? 'ELEVATED TEMP' : 'NOMINAL SAFE'}
              </strong></span>
              <span>Probe: <strong className="text-white">GPIO 5</strong></span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-500 block mb-1">LIVE THERMAL HISTORY</span>
            {renderSparkline(history.map((h) => h.temp), '#f59e0b', 20, 60, '°C')}
          </div>
        </div>

        {/* Card 4: Frame Warp & IMU Tilt (Roll / Pitch) */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Frame Warp &amp; Tilt (MPU6050)
              </span>
              <span className="text-[11px] font-mono text-purple-400">Limit: ±{hardwareParams.threshRollWarpDeg}°</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block">ROLL (ΔR TORSION)</span>
                <span className={`text-2xl font-bold font-['Chakra_Petch'] tabular-nums ${
                  Math.abs(telemetry.roll) > hardwareParams.threshRollWarpDeg ? 'text-rose-400 animate-pulse' : 'text-purple-300'
                }`}>
                  {telemetry.roll > 0 ? `+${telemetry.roll.toFixed(1)}` : telemetry.roll.toFixed(1)}°
                </span>
              </div>
              <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block">PITCH (ΔP SAG)</span>
                <span className="text-2xl font-bold font-['Chakra_Petch'] text-cyan-300 tabular-nums">
                  {telemetry.pitch > 0 ? `+${telemetry.pitch.toFixed(1)}` : telemetry.pitch.toFixed(1)}°
                </span>
              </div>
            </div>

            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Gyro Z: <strong className="text-white">{telemetry.gyro.z.toFixed(1)} °/s</strong></span>
              <span>Bus: <strong className="text-white">I2C (0x68)</strong></span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-500 block mb-1">ROLL TORSION HISTORY</span>
            {renderSparkline(history.map((h) => h.roll), '#c084fc', -35, 35, '°')}
          </div>
        </div>

        {/* Card 5: Road Shock & Vibration (SW-420) */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Vibration &amp; Shock (SW-420)
              </span>
              <span className="text-[11px] font-mono text-emerald-400">GPIO 2 (DO)</span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 mb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block">SPRING SENSOR STATE:</span>
                <span className={`text-base font-bold font-mono ${
                  telemetry.vibrationSensorDetected ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                }`}>
                  {telemetry.vibrationSensorDetected ? '⚡ ROAD IMPACT TRIGGERED' : '✓ IDLE (NOMINAL)'}
                </span>
              </div>
              <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded ${
                telemetry.vibrationSensorDetected ? 'bg-rose-950 border border-rose-500 text-rose-300' : 'bg-slate-900 text-slate-500'
              }`}>
                DO: {telemetry.vibrationSensorDetected ? 'HIGH (3.3V)' : 'LOW (0V)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
              <div className="p-1.5 bg-slate-950/50 rounded border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">G-FORCE</span>
                <span className="text-white font-bold">{telemetry.accel.z.toFixed(2)} G</span>
              </div>
              <div className="p-1.5 bg-slate-950/50 rounded border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">SHOCK ACCEL</span>
                <span className="text-white font-bold">{(telemetry.accel.z * 9.81).toFixed(1)} m/s²</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Trigger Mechanism:</span>
            <span className="text-cyan-300">Normally Closed Spring</span>
          </div>
        </div>

        {/* Card 6: Physical Actuators Live States */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Physical Actuators &amp; Alarms
              </span>
              <span className="text-[11px] font-mono text-slate-400">Live Outputs</span>
            </div>

            <div className="space-y-2 mb-3">
              {/* Traffic LEDs */}
              <div className="flex items-center justify-between p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                <span className="text-xs font-mono text-slate-400">Traffic Indicators:</span>
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    telemetry.ledGreen ? 'bg-emerald-500 shadow-md shadow-emerald-500/50 border-emerald-300' : 'bg-slate-800 border-slate-700'
                  }`} title="Green Safe LED" />
                  <span className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    telemetry.ledYellow ? 'bg-amber-400 shadow-md shadow-amber-400/50 border-amber-200' : 'bg-slate-800 border-slate-700'
                  }`} title="Yellow Warning LED" />
                  <span className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    telemetry.ledRed ? 'bg-rose-500 shadow-md shadow-rose-500/50 border-rose-300 animate-pulse' : 'bg-slate-800 border-slate-700'
                  }`} title="Red Hazard LED" />
                </div>
              </div>

              {/* Buzzer */}
              <div className="flex items-center justify-between p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                <span className="text-xs font-mono text-slate-400">Piezo Buzzer (GPIO 3):</span>
                <span className={`text-xs font-mono font-bold ${
                  telemetry.buzzerActive ? 'text-amber-400 animate-pulse' : 'text-slate-500'
                }`}>
                  {telemetry.buzzerActive ? `● SOUNDING (${telemetry.buzzerFrequency || 2800} Hz)` : '○ SILENT'}
                </span>
              </div>

              {/* Motor */}
              <div className="flex items-center justify-between p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                <span className="text-xs font-mono text-slate-400">Haptic Motor (GPIO 4):</span>
                <span className={`text-xs font-mono font-bold ${
                  telemetry.vibrationMotorActive ? 'text-cyan-400 animate-pulse' : 'text-slate-500'
                }`}>
                  {telemetry.vibrationMotorActive ? `● RUNNING (${telemetry.vibrationDutyCycle}/255 PWM)` : '○ STOPPED'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex gap-2">
            <button
              onClick={() => onHardwareControl(telemetry.buzzerActive ? 'CMD:BUZZER:0' : 'CMD:BUZZER:1')}
              className={`flex-1 py-1 text-[11px] font-mono font-bold rounded border cursor-pointer ${
                telemetry.buzzerActive ? 'bg-amber-600 text-white border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              🔔 {telemetry.buzzerActive ? 'Stop Buzzer' : 'Beep Buzzer'}
            </button>
            <button
              onClick={() => onHardwareControl('CMD:LED_TEST:1')}
              className="flex-1 py-1 text-[11px] font-mono font-bold rounded border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 cursor-pointer"
            >
              ✨ LED Cycle Test
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Serial Stream Terminal */}
      <div className={`p-4 rounded-xl border flex flex-col flex-1 min-h-[260px] ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Live Hardware Serial Stream Terminal (115200 Baud)
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              ({filteredLogs.length} packets logged)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter logs (e.g. LOAD, WARP, TEMP)..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="px-2 py-1 text-[11px] font-mono bg-slate-950 border border-slate-800 rounded text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 w-52"
            />
            <button
              onClick={() => setAutoScroll((prev) => !prev)}
              className={`px-2 py-1 text-[10px] font-mono rounded border cursor-pointer ${
                autoScroll ? 'bg-cyan-950 border-cyan-500/60 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {autoScroll ? '⬇ Auto-Scroll ON' : '⏸ Auto-Scroll OFF'}
            </button>
          </div>
        </div>

        {/* Scrollable Terminal Output */}
        <div
          ref={logContainerRef}
          className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-xs overflow-y-auto space-y-1 max-h-[300px]"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-8">
              Waiting for live hardware packets from USB-Serial or WebSocket bridge...
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const isAlert = log.includes('CRITICAL') || log.includes('TWIST') || log.includes('OVERLOAD') || log.includes('OVERHEAT');
              const isWarn = log.includes('WARN') || log.includes('SHOCK') || log.includes('BUMP');
              return (
                <div
                  key={idx}
                  className={`leading-relaxed whitespace-pre-wrap break-all ${
                    isAlert
                      ? 'text-rose-400 font-bold bg-rose-950/30 px-1 rounded'
                      : isWarn
                      ? 'text-amber-300 font-semibold'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 select-none mr-2">[{idx + 1}]</span>
                  {log}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
