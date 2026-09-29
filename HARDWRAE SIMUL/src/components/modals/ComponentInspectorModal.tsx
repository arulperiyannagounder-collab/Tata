import React from 'react';
import { HardwareComponentMeta, SensorTelemetry } from '../../types/simulation';
import { useTheme } from '../../context/ThemeContext';

interface ComponentInspectorModalProps {
  component: HardwareComponentMeta | null;
  telemetry: SensorTelemetry;
  onClose: () => void;
}

export const ComponentInspectorModal: React.FC<ComponentInspectorModalProps> = ({
  component,
  telemetry,
  onClose,
}) => {
  const { isDark } = useTheme();
  if (!component) return null;

  const boxBg = isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200';
  const labelText = isDark ? 'text-slate-400' : 'text-slate-500';
  const valText = isDark ? 'text-white' : 'text-slate-900';

  const renderLiveStatus = () => {
    switch (component.id) {
      case 'esp32-c3':
        return (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className={`p-2 rounded border ${boxBg}`}>
              <span className={`${labelText} block text-[10px]`}>CPU Frequency:</span>
              <span className="text-cyan-500 font-bold">160 MHz RISC-V</span>
            </div>
            <div className={`p-2 rounded border ${boxBg}`}>
              <span className={`${labelText} block text-[10px]`}>System Health:</span>
              <span
                className={`font-bold ${
                  telemetry.systemStatus === 'CRITICAL'
                    ? 'text-rose-500'
                    : telemetry.systemStatus === 'WARNING'
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                }`}
              >
                {telemetry.systemStatus}
              </span>
            </div>
          </div>
        );

      case 'hx711':
        return (
          <div className="space-y-1.5 text-xs font-mono">
            <div className={`flex justify-between p-1.5 rounded border ${boxBg}`}>
              <span className={labelText}>Measured Microstrain:</span>
              <span className="text-cyan-500 font-bold">{telemetry.strainMicroStrain} με</span>
            </div>
            <div className={`flex justify-between p-1.5 rounded border ${boxBg}`}>
              <span className={labelText}>Dynamic Load:</span>
              <span className={`${valText} font-bold`}>{telemetry.loadKg} kg</span>
            </div>
            <div className={`flex justify-between p-1.5 rounded border ${boxBg}`}>
              <span className={labelText}>Raw 24-bit Output:</span>
              <span className="text-cyan-600 font-bold">{telemetry.loadCell1Raw.toLocaleString()}</span>
            </div>
          </div>
        );

      case 'mpu6050':
        return (
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Linear Accel (X/Y/Z):</span>
              <span className="text-white font-bold">
                {telemetry.accel.x}g, {telemetry.accel.y}g, {telemetry.accel.z}g
              </span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Angular Rate (X/Y/Z):</span>
              <span className="text-white font-bold">
                {telemetry.gyro.x}°/s, {telemetry.gyro.y}°/s, {telemetry.gyro.z}°/s
              </span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Vehicle Roll / Pitch:</span>
              <span className="text-cyan-400 font-bold">
                Roll: {telemetry.roll}° · Pitch: {telemetry.pitch}°
              </span>
            </div>
          </div>
        );

      case 'sw420':
        return (
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Vibration Status:</span>
              <span
                className={`font-bold ${
                  telemetry.vibrationSensorDetected ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {telemetry.vibrationSensorDetected ? 'SHOCK TRIGGER ACTIVE' : 'IDLE (RESTING)'}
              </span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Digital DO (GPIO 2):</span>
              <span className="text-cyan-400 font-bold">
                {telemetry.vibrationSensorDetected ? 'LOGIC HIGH (3.3V)' : 'LOGIC LOW (0.0V)'}
              </span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Internal Switch:</span>
              <span className="text-white font-bold">Normally Closed Roller Spring Tube</span>
            </div>
          </div>
        );

      case 'ds18b20':
        return (
          <div className="flex justify-between items-center p-2 bg-slate-950/80 rounded border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">Chassis Temperature:</span>
              <span className="text-xl font-bold text-white">{telemetry.temperatureC} °C</span>
            </div>
            <div className="text-right">
              <span className="text-emerald-400 font-bold block">PULL-UP: 4.7kΩ</span>
              <span className="text-slate-400">Status: OK</span>
            </div>
          </div>
        );

      case 'l298n':
        return (
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">IN3 Signal (GPIO 4):</span>
              <span className="text-cyan-400 font-bold">
                {telemetry.vibrationMotorActive ? 'PWM ACTIVE' : 'LOW (0V)'}
              </span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">OUT3 / OUT4 Motor Drive:</span>
              <span className="text-cyan-400 font-bold">
                {telemetry.vibrationDutyCycle} / 255 Duty ({Math.round((telemetry.vibrationDutyCycle / 255) * 100)}%)
              </span>
            </div>
          </div>
        );

      case 'coin-motor':
        return (
          <div className="p-2 bg-slate-950/80 rounded border border-slate-800 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Vibration State:</span>
              <span
                className={`font-bold ${
                  telemetry.vibrationMotorActive ? 'text-cyan-400 animate-pulse' : 'text-slate-500'
                }`}
              >
                {telemetry.vibrationMotorActive ? 'VIBRATING (ACTIVE)' : 'OFF (IDLE)'}
              </span>
            </div>
          </div>
        );

      case 'buzzer':
        return (
          <div className="p-2 bg-slate-950/80 rounded border border-slate-800 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Acoustic State:</span>
              <span
                className={`font-bold ${
                  telemetry.buzzerActive ? 'text-amber-400 animate-ping' : 'text-slate-500'
                }`}
              >
                {telemetry.buzzerActive ? `SOUNDING (${telemetry.buzzerFrequency} Hz)` : 'SILENT'}
              </span>
            </div>
          </div>
        );

      case 'load-cell-1':
      case 'load-cell-2':
      case 'load-cell-3':
      case 'load-cell-4':
        return (
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Localized Strain:</span>
              <span className="text-cyan-400 font-bold">{telemetry.strainMicroStrain} με</span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Quarter Load Fraction:</span>
              <span className="text-white font-bold">{(telemetry.loadKg / 4).toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Pigtail Wire Status:</span>
              <span className="text-emerald-400 font-bold">PRUNED &amp; SLEEVED (NO EXCESS)</span>
            </div>
          </div>
        );

      case 'load-cell-combiner':
        return (
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Bridge Balance:</span>
              <span className="text-emerald-400 font-bold">BALANCED WHEATSTONE QUAD</span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Active Inputs:</span>
              <span className="text-cyan-300 font-bold">4x 50kg Cells (LC1, LC2, LC3, LC4)</span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Differential Output:</span>
              <span className="text-white font-bold">E+/E- (Excitation) · A+/A- (mV Signal)</span>
            </div>
          </div>
        );

      case 'traffic-leds':
        return (
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className={`p-1.5 rounded border ${telemetry.ledGreen ? 'bg-emerald-950 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
              GREEN: {telemetry.ledGreen ? 'ON' : 'OFF'}
            </div>
            <div className={`p-1.5 rounded border ${telemetry.ledYellow ? 'bg-amber-950 border-amber-500 text-amber-400 font-bold' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
              YELLOW: {telemetry.ledYellow ? 'ON' : 'OFF'}
            </div>
            <div className={`p-1.5 rounded border ${telemetry.ledRed ? 'bg-rose-950 border-rose-500 text-rose-400 font-bold' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
              RED: {telemetry.ledRed ? 'ON' : 'OFF'}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none ${
      isDark ? 'bg-black/75' : 'bg-slate-900/40'
    }`}>
      <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border ${
        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
                isDark
                  ? 'bg-blue-900/60 border-blue-500/40 text-blue-300'
                  : 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
              }`}>
                {component.category}
              </span>
              <h2 className={`text-base font-bold font-['Chakra_Petch'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {component.name}
              </h2>
            </div>
            <p className={`text-xs mt-0.5 ${labelText}`}>{component.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-['Plus_Jakarta_Sans']">
          {/* Operating Specifications */}
          <div className={`grid grid-cols-2 gap-3 p-3 rounded-xl border ${boxBg}`}>
            <div>
              <span className={`${labelText} block text-[11px]`}>Operating Voltage:</span>
              <span className={`font-semibold font-mono ${valText}`}>{component.operatingVoltage}</span>
            </div>
            <div>
              <span className={`${labelText} block text-[11px]`}>Subsystem Role:</span>
              <span className="font-semibold text-cyan-500">{component.currentRole}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className={`text-[11px] font-mono uppercase tracking-wider mb-1 ${labelText}`}>
              Engineering Function & Purpose
            </h4>
            <p className={`leading-relaxed p-3 rounded-xl border ${
              isDark ? 'bg-slate-950/40 border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              {component.description}
            </p>
          </div>

          {/* Live Telemetry / Dynamic Values */}
          <div>
            <h4 className={`text-[11px] font-mono uppercase tracking-wider mb-1.5 ${labelText}`}>
              Live State & Current Value
            </h4>
            {renderLiveStatus()}
          </div>

          {/* Pin Connections Map */}
          {component.pins.length > 0 && (
            <div>
              <h4 className={`text-[11px] font-mono uppercase tracking-wider mb-2 ${labelText}`}>
                Pinout & Schematic Connection Map
              </h4>
              <div className={`border rounded-xl overflow-hidden ${
                isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white shadow-xs'
              }`}>
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className={`border-b ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    <tr>
                      <th className="p-2">Pin Name</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Connected To</th>
                      <th className="p-2">Active Signal</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                    {component.pins.map((pin, i) => (
                      <tr key={i} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                        <td className={`p-2 font-bold ${valText}`}>{pin.pinName}</td>
                        <td className={`p-2 ${labelText}`}>{pin.pinType}</td>
                        <td className="p-2 text-cyan-500 font-semibold">{pin.connectedTo}</td>
                        <td className={`p-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{pin.currentVal || 'Live'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex justify-end ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer border ${
              isDark
                ? 'text-white bg-slate-800 hover:bg-slate-700 border-slate-700'
                : 'text-slate-800 bg-white hover:bg-slate-100 border-slate-300 shadow-xs'
            }`}
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
