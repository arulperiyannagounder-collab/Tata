import React from 'react';
import { SensorTelemetry, HardwareComponentMeta } from '../../types/simulation';
import { useTheme } from '../../context/ThemeContext';

interface TelemetryDashboardProps {
  telemetry: SensorTelemetry;
  onInspectComponent: (comp: HardwareComponentMeta | null) => void;
  components: HardwareComponentMeta[];
}

export const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({
  telemetry,
  onInspectComponent,
  components,
}) => {
  const { isDark } = useTheme();

  const getStatusBadge = () => {
    switch (telemetry.systemStatus) {
      case 'NORMAL':
        return (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs border ${
              isDark
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">STATUS: NORMAL</span>
            <span className={isDark ? 'text-emerald-500/80' : 'text-emerald-700'}>
              · Structural Integrity Nominal
            </span>
          </div>
        );
      case 'WARNING':
        return (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs border ${
              isDark
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-400'
                : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="font-bold">STATUS: WARNING</span>
            <span className={isDark ? 'text-amber-500/80' : 'text-amber-700'}>
              · Dynamic Shock Threshold Exceeded
            </span>
          </div>
        );
      case 'CRITICAL':
        return (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs animate-pulse border ${
              isDark
                ? 'bg-rose-950/80 border-rose-500/80 text-rose-300'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="font-bold">STATUS: CRITICAL</span>
            <span className={isDark ? 'text-rose-400' : 'text-rose-700'}>
              · Structural Plastic Deformation Alert
            </span>
          </div>
        );
    }
  };

  const cardBg = isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs';
  const innerBoxBg = isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200';
  const headingColor = isDark ? 'text-slate-300' : 'text-slate-700';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';
  const valColor = isDark ? 'text-white' : 'text-slate-900';

  return (
    <div
      className={`w-96 h-full flex flex-col border-l overflow-y-auto shrink-0 select-none font-['Plus_Jakarta_Sans'] transition-colors duration-200 ${
        isDark ? 'bg-[#0b0f19] border-slate-800 text-slate-200' : 'bg-slate-100/70 border-slate-200 text-slate-800'
      }`}
    >
      {/* Top Telemetry Header */}
      <div
        className={`p-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-bold tracking-wider uppercase font-mono ${mutedText}`}>
            Live Engineering Telemetry
          </span>
          <span className={`text-[10px] font-mono tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            RATE: 25 Hz · 40ms
          </span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="p-4 space-y-4">
        {/* 1. CHASSIS STRUCTURAL STRAIN (HX711 & Load Cells) */}
        <section className={`rounded-lg p-3.5 border ${cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-cyan-400" />
              <h3 className={`text-xs font-bold tracking-wide uppercase font-mono ${headingColor}`}>
                Structural Strain & Load (HX711)
              </h3>
            </div>
            <button
              onClick={() => onInspectComponent(components.find((c) => c.id === 'hx711') || null)}
              className="text-[11px] text-cyan-500 hover:underline cursor-pointer font-medium"
            >
              Inspect
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className={`p-2.5 rounded border ${innerBoxBg}`}>
              <span className={`text-[11px] block font-mono ${mutedText}`}>Micro-Strain (με)</span>
              <span
                className={`text-xl font-bold font-mono tabular-nums ${
                  telemetry.strainMicroStrain > 1000
                    ? isDark ? 'text-rose-400' : 'text-rose-600'
                    : telemetry.strainMicroStrain > 300
                    ? isDark ? 'text-amber-400' : 'text-amber-600'
                    : isDark ? 'text-cyan-300' : 'text-cyan-700'
                }`}
              >
                {telemetry.strainMicroStrain} <span className={`text-xs font-normal ${mutedText}`}>με</span>
              </span>
            </div>
            <div className={`p-2.5 rounded border ${innerBoxBg}`}>
              <span className={`text-[11px] block font-mono ${mutedText}`}>Dynamic Load</span>
              <span className={`text-xl font-bold font-mono tabular-nums ${valColor}`}>
                {telemetry.loadKg} <span className={`text-xs font-normal ${mutedText}`}>kg</span>
              </span>
            </div>
          </div>

          <div className={`space-y-1.5 text-xs font-mono ${mutedText}`}>
            <div className="flex justify-between">
              <span>Deflection (Δz):</span>
              <span className={`font-semibold tabular-nums ${valColor}`}>{telemetry.strainDeformationMm} mm</span>
            </div>
            <div className={`grid grid-cols-2 gap-x-2 gap-y-1 pt-1 border-t text-[11px] ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
              <div className="flex justify-between">
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>LC1 (FL):</span>
                <span className={`tabular-nums ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{(telemetry.loadCell1Raw).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>LC2 (FR):</span>
                <span className={`tabular-nums ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{(telemetry.loadCell2Raw).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>LC3 (RL):</span>
                <span className={`tabular-nums ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{(telemetry.loadCell1Raw - 80).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>LC4 (RR):</span>
                <span className={`tabular-nums ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{(telemetry.loadCell2Raw + 65).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Strain Bar Visualizer */}
          <div className="mt-3">
            <div className={`w-full h-2 rounded-full overflow-hidden border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
              <div
                className={`h-full transition-all duration-100 ${
                  telemetry.strainMicroStrain > 1000
                    ? 'bg-rose-500'
                    : telemetry.strainMicroStrain > 300
                    ? 'bg-amber-400'
                    : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(100, (telemetry.strainMicroStrain / 1500) * 100)}%` }}
              />
            </div>
            <div className={`flex justify-between text-[10px] font-mono mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>0 με (Nominal)</span>
              <span>300 με (Warn)</span>
              <span>1000+ με (Crit)</span>
            </div>
          </div>
        </section>

        {/* 2. MPU6050 6-DoF IMU KINETICS */}
        <section className={`rounded-lg p-3.5 border ${cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-blue-400" />
              <h3 className={`text-xs font-bold tracking-wide uppercase font-mono ${headingColor}`}>
                Chassis Kinetics (MPU6050)
              </h3>
            </div>
            <button
              onClick={() => onInspectComponent(components.find((c) => c.id === 'mpu6050') || null)}
              className="text-[11px] text-cyan-500 hover:underline cursor-pointer font-medium"
            >
              Inspect
            </button>
          </div>

          {/* Acceleration Tri-Axis */}
          <div className="mb-2.5">
            <span className={`text-[11px] font-mono block mb-1 ${mutedText}`}>
              Linear Acceleration (g):
            </span>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
              <div className={`p-2 rounded border text-center ${innerBoxBg}`}>
                <span className={`block text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>AX</span>
                <span className={`font-bold tabular-nums ${valColor}`}>{telemetry.accel.x > 0 ? `+${telemetry.accel.x}` : telemetry.accel.x}</span>
              </div>
              <div className={`p-2 rounded border text-center ${innerBoxBg}`}>
                <span className={`block text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>AY</span>
                <span className={`font-bold tabular-nums ${valColor}`}>{telemetry.accel.y > 0 ? `+${telemetry.accel.y}` : telemetry.accel.y}</span>
              </div>
              <div className={`p-2 rounded border text-center ${innerBoxBg}`}>
                <span className={`block text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>AZ</span>
                <span className={`font-bold tabular-nums ${valColor}`}>{telemetry.accel.z > 0 ? `+${telemetry.accel.z}` : telemetry.accel.z}</span>
              </div>
            </div>
          </div>

          {/* Gyroscope Tri-Axis */}
          <div className="mb-2.5">
            <span className={`text-[11px] font-mono block mb-1 ${mutedText}`}>
              Angular Velocity (°/s):
            </span>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
              <div className={`p-1.5 rounded border text-center ${innerBoxBg}`}>
                <span className={`block text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>GX</span>
                <span className={`tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{telemetry.gyro.x}</span>
              </div>
              <div className={`p-1.5 rounded border text-center ${innerBoxBg}`}>
                <span className={`block text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>GY</span>
                <span className={`tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{telemetry.gyro.y}</span>
              </div>
              <div className={`p-1.5 rounded border text-center ${innerBoxBg}`}>
                <span className={`block text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>GZ</span>
                <span className={`tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{telemetry.gyro.z}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Attitude */}
          <div className={`flex justify-between items-center text-xs font-mono pt-1 border-t ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
            <span>Attitude:</span>
            <span className={`tabular-nums font-semibold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
              Roll: {telemetry.roll}° · Pitch: {telemetry.pitch}°
            </span>
          </div>
        </section>

        {/* 3. SW-420 DIGITAL VIBRATION & SHOCK SENSOR */}
        <section className={`rounded-lg p-3.5 border ${cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded ${telemetry.vibrationSensorDetected ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
              <h3 className={`text-xs font-bold tracking-wide uppercase font-mono ${headingColor}`}>
                Vibration &amp; Shock (SW-420)
              </h3>
            </div>
            <button
              onClick={() => onInspectComponent(components.find((c) => c.id === 'sw420') || null)}
              className="text-[11px] text-cyan-500 hover:underline cursor-pointer font-medium"
            >
              Inspect
            </button>
          </div>

          {/* Trigger State Banner */}
          <div className="mb-2.5">
            <div
              className={`p-2.5 rounded border font-mono text-xs flex items-center justify-between transition-colors ${
                telemetry.vibrationSensorDetected
                  ? isDark
                    ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 animate-pulse'
                    : 'bg-rose-50 border-rose-300 text-rose-800 animate-pulse'
                  : isDark
                  ? 'bg-slate-950/80 border-slate-800 text-emerald-400'
                  : 'bg-slate-50 border-slate-200 text-emerald-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{telemetry.vibrationSensorDetected ? '⚡' : '🛡'}</span>
                <div>
                  <span className="font-bold block text-[11px]">
                    {telemetry.vibrationSensorDetected ? 'SHOCK / VIBRATION DETECTED!' : 'IDLE (NOMINAL)'}
                  </span>
                  <span className={`text-[10px] block ${mutedText}`}>
                    {telemetry.vibrationSensorDetected ? 'Mechanical impulse breach' : 'Resting spring contact stable'}
                  </span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  telemetry.vibrationSensorDetected
                    ? isDark
                      ? 'bg-rose-900/90 text-rose-200 border-rose-400'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                    : isDark
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                {telemetry.vibrationSensorDetected ? 'TRIGGERED' : 'NORMAL'}
              </span>
            </div>
          </div>

          {/* Digital Pin & Comparator Specs */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className={`p-2 rounded border ${innerBoxBg}`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>GPIO 2 (DO):</span>
              <span
                className={`font-bold ${
                  telemetry.vibrationSensorDetected
                    ? isDark ? 'text-amber-300' : 'text-amber-700'
                    : isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {telemetry.vibrationSensorDetected ? 'HIGH (3.3V)' : 'LOW (0.0V)'}
              </span>
            </div>
            <div className={`p-2 rounded border ${innerBoxBg}`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>LM393 Comparator:</span>
              <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>10kΩ Calibrated</span>
            </div>
          </div>
        </section>

        {/* 4. TEMPERATURE SENSOR (DS18B20) */}
        <section className={`rounded-lg p-3.5 border ${cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-purple-400" />
              <h3 className={`text-xs font-bold tracking-wide uppercase font-mono ${headingColor}`}>
                Chassis Rail Temp (DS18B20)
              </h3>
            </div>
            <button
              onClick={() => onInspectComponent(components.find((c) => c.id === 'ds18b20') || null)}
              className="text-[11px] text-cyan-500 hover:underline cursor-pointer font-medium"
            >
              Inspect
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-mono tabular-nums ${valColor}`}>
                {telemetry.temperatureC}
              </span>
              <span className={`text-sm font-mono ${mutedText}`}>°C</span>
            </div>
            <div className={`text-right text-[11px] font-mono ${mutedText}`}>
              <span className={`block ${isDark ? 'text-emerald-400' : 'text-emerald-700 font-semibold'}`}>4.7kΩ Pull-up Active</span>
              <span>1-Wire GPIO 5</span>
            </div>
          </div>
        </section>

        {/* 5. ACTUATORS & ALERT SYSTEM */}
        <section className={`rounded-lg p-3.5 border ${cardBg}`}>
          <h3 className={`text-xs font-bold tracking-wide uppercase font-mono mb-2 ${headingColor}`}>
            Actuators & Indicator Status
          </h3>

          <div className="space-y-2">
            {/* Piezo Buzzer */}
            <div className={`flex items-center justify-between p-2 rounded border text-xs font-mono ${innerBoxBg}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    telemetry.buzzerActive ? 'bg-amber-400 animate-ping' : 'bg-slate-400'
                  }`}
                />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Active Buzzer (GPIO 3)</span>
              </div>
              <span
                className={`font-semibold ${
                  telemetry.buzzerActive ? (isDark ? 'text-amber-400' : 'text-amber-600') : mutedText
                }`}
              >
                {telemetry.buzzerActive ? `ON (${telemetry.buzzerFrequency} Hz)` : 'OFF'}
              </span>
            </div>

            {/* Coin Vibration Motor */}
            <div className={`flex items-center justify-between p-2 rounded border text-xs font-mono ${innerBoxBg}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    telemetry.vibrationMotorActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Haptic Motor (L298N OUT3/4)</span>
              </div>
              <span
                className={`font-semibold ${
                  telemetry.vibrationMotorActive ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : mutedText
                }`}
              >
                {telemetry.vibrationMotorActive
                  ? `ACTIVE (${Math.round((telemetry.vibrationDutyCycle / 255) * 100)}% PWM)`
                  : 'OFF'}
              </span>
            </div>

            {/* Traffic Status LEDs */}
            <div className={`p-2.5 rounded border ${innerBoxBg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-mono ${mutedText}`}>Traffic Status Array:</span>
                <span className={`text-[11px] font-mono font-semibold ${valColor}`}>
                  {telemetry.systemStatus}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                {/* Green LED */}
                <div
                  className={`p-1.5 rounded border transition-all ${
                    telemetry.ledGreen
                      ? isDark
                        ? 'bg-emerald-950 border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-emerald-100 border-emerald-400 text-emerald-800 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-600'
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="block text-[10px]">GPIO 0</span>
                  <span className="font-bold">GREEN</span>
                </div>
                {/* Yellow LED */}
                <div
                  className={`p-1.5 rounded border transition-all ${
                    telemetry.ledYellow
                      ? isDark
                        ? 'bg-amber-950 border-amber-500/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-amber-100 border-amber-400 text-amber-800 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-600'
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="block text-[10px]">GPIO 1</span>
                  <span className="font-bold">YELLOW</span>
                </div>
                {/* Red LED */}
                <div
                  className={`p-1.5 rounded border transition-all ${
                    telemetry.ledRed
                      ? isDark
                        ? 'bg-rose-950 border-rose-500/80 text-rose-300 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                        : 'bg-rose-100 border-rose-400 text-rose-800 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-600'
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="block text-[10px]">GPIO 10</span>
                  <span className="font-bold">RED</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. GPIO STATUS PIN MATRIX */}
        <section className={`rounded-lg p-3.5 border ${cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-xs font-bold tracking-wide uppercase font-mono ${headingColor}`}>
              ESP32-C3 Pin Logic Matrix
            </h3>
            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>10 GPIOs</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            <div className={`flex justify-between p-1.5 rounded border ${innerBoxBg}`}>
              <span className={mutedText}>GPIO 0 (Grn LED):</span>
              <span className={telemetry.ledGreen ? (isDark ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold') : mutedText}>
                {telemetry.ledGreen ? 'HIGH (3.3V)' : 'LOW (0V)'}
              </span>
            </div>
            <div className={`flex justify-between p-1.5 rounded border ${innerBoxBg}`}>
              <span className={mutedText}>GPIO 1 (Yel LED):</span>
              <span className={telemetry.ledYellow ? (isDark ? 'text-amber-400 font-bold' : 'text-amber-700 font-bold') : mutedText}>
                {telemetry.ledYellow ? 'HIGH (3.3V)' : 'LOW (0V)'}
              </span>
            </div>
            <div className={`flex justify-between p-1.5 rounded border ${innerBoxBg}`}>
              <span className={mutedText}>GPIO 3 (Buzzer):</span>
              <span className={telemetry.buzzerActive ? (isDark ? 'text-amber-400 font-bold' : 'text-amber-700 font-bold') : mutedText}>
                {telemetry.buzzerActive ? 'HIGH (TONE)' : 'LOW (0V)'}
              </span>
            </div>
            <div className={`flex justify-between p-1.5 rounded border ${innerBoxBg}`}>
              <span className={mutedText}>GPIO 4 (IN3 PWM):</span>
              <span className={telemetry.vibrationMotorActive ? (isDark ? 'text-cyan-400 font-bold' : 'text-cyan-700 font-bold') : mutedText}>
                {telemetry.vibrationMotorActive ? `${telemetry.vibrationDutyCycle} PWM` : '0 PWM'}
              </span>
            </div>
            <div className={`flex justify-between p-1.5 rounded border ${innerBoxBg}`}>
              <span className={mutedText}>GPIO 5 (DS18B20):</span>
              <span className={`font-bold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>1-WIRE BUS</span>
            </div>
            <div className={`flex justify-between p-1.5 rounded border ${innerBoxBg}`}>
              <span className={mutedText}>GPIO 6 (HX711 DT):</span>
              <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>24-BIT DOUT</span>
            </div>
            <div className={`flex justify-between p-1.5 rounded border ${innerBoxBg}`}>
              <span className={mutedText}>GPIO 7 (HX SCK):</span>
              <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>10Hz CLK</span>
            </div>
            <div className={`flex justify-between p-1.5 rounded border ${innerBoxBg}`}>
              <span className={mutedText}>GPIO 8 (MPU SDA):</span>
              <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>I2C DATA</span>
            </div>
            <div className={`flex justify-between p-1.5 rounded border ${innerBoxBg}`}>
              <span className={mutedText}>GPIO 9 (MPU SCL):</span>
              <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>400kHz CLK</span>
            </div>
            <div className={`flex justify-between p-1.5 rounded border ${innerBoxBg}`}>
              <span className={mutedText}>GPIO 10 (Red LED):</span>
              <span className={telemetry.ledRed ? (isDark ? 'text-rose-400 font-bold' : 'text-rose-700 font-bold') : mutedText}>
                {telemetry.ledRed ? 'HIGH (3.3V)' : 'LOW (0V)'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
