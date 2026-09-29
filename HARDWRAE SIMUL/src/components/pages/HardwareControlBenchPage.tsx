import React, { useState } from 'react';
import { SensorTelemetry, HardwareParameters } from '../../types/simulation';
import { useTheme } from '../../context/ThemeContext';

interface HardwareControlBenchPageProps {
  telemetry: SensorTelemetry;
  hardwareParams: HardwareParameters;
  onSetBaseWeight: (weightKg: number) => Promise<boolean>;
  onSetTemperature: (tempC: number | null) => Promise<boolean>;
  onSetThresholds: (params: Partial<HardwareParameters>) => Promise<boolean>;
  onResetParameters: () => Promise<boolean>;
  onSetSimulatedPressure: (pressureKg: number) => void;
  onHardwareControl: (command: string) => Promise<void>;
  onNavigateToLiveData: () => void;
}

export const HardwareControlBenchPage: React.FC<HardwareControlBenchPageProps> = ({
  telemetry,
  hardwareParams,
  onSetBaseWeight,
  onSetTemperature,
  onSetThresholds,
  onResetParameters,
  onSetSimulatedPressure,
  onHardwareControl,
  onNavigateToLiveData,
}) => {
  const { isDark } = useTheme();

  // Local form state
  const [baseWeightInput, setBaseWeightInput] = useState<number>(hardwareParams.baseWeightKg);
  const [appliedPressureInput, setAppliedPressureInput] = useState<number>(hardwareParams.simulatedAppliedPressureKg);
  const [useManualTemp, setUseManualTemp] = useState<boolean>(hardwareParams.tempOverrideC !== null);
  const [tempInput, setTempInput] = useState<number>(hardwareParams.tempOverrideC ?? 25.0);

  // Thresholds state
  const [weightWarn, setWeightWarn] = useState<number>(hardwareParams.threshWeightWarnKg);
  const [weightCrit, setWeightCrit] = useState<number>(hardwareParams.threshWeightCritKg);
  const [tempWarn, setTempWarn] = useState<number>(hardwareParams.threshTempWarnC);
  const [tempCrit, setTempCrit] = useState<number>(hardwareParams.threshTempCritC);
  const [rollLimit, setRollLimit] = useState<number>(hardwareParams.threshRollWarpDeg);

  // Feedback notifications
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Handlers
  const handleApplyBaseWeight = async (val: number) => {
    setBaseWeightInput(val);
    const ok = await onSetBaseWeight(val);
    if (ok) {
      showNotification(`✓ Base weight calibrated to ${val.toFixed(1)} kg. Physical sensor pressure will add on top.`);
    } else {
      showNotification(`⚠ Could not sync base weight to hardware.`);
    }
  };

  const handleApplyPressure = (val: number) => {
    setAppliedPressureInput(val);
    onSetSimulatedPressure(val);
    showNotification(`⚡ Applied +${val.toFixed(1)} kg additional force to the sensor.`);
  };

  const handleApplyTemperature = async (override: boolean, val: number) => {
    setUseManualTemp(override);
    if (!override) {
      await onSetTemperature(null);
      showNotification('✓ Reverted to physical DS18B20 temperature sensor probe.');
    } else {
      setTempInput(val);
      await onSetTemperature(val);
      showNotification(`✓ Manual temperature override set to ${val.toFixed(1)}°C.`);
    }
  };

  const handleSyncThresholds = async () => {
    const ok = await onSetThresholds({
      threshWeightWarnKg: weightWarn,
      threshWeightCritKg: weightCrit,
      threshTempWarnC: tempWarn,
      threshTempCritC: tempCrit,
      threshRollWarpDeg: rollLimit,
    });
    if (ok) {
      showNotification('✓ Safety thresholds synced and active on hardware!');
    } else {
      showNotification('⚠ Failed syncing thresholds.');
    }
  };

  const handleResetAll = async () => {
    setBaseWeightInput(0);
    setAppliedPressureInput(0);
    setUseManualTemp(false);
    setTempInput(25.0);
    setWeightWarn(30);
    setWeightCrit(50);
    setTempWarn(38);
    setTempCrit(45);
    setRollLimit(25);
    await onResetParameters();
    showNotification('✓ All parameters and hardware actuators reset to factory defaults.');
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-6 select-none transition-colors duration-200 ${
      isDark ? 'bg-[#0a0e17] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-mono text-xs font-semibold shadow-2xl border border-blue-400 animate-in fade-in slide-in-from-top-3 flex items-center gap-2">
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner & Telemetry Verification Bar */}
      <div className={`p-4 rounded-xl border mb-6 flex flex-wrap items-center justify-between gap-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎛️</span>
            <h2 className="text-lg md:text-xl font-bold font-['Chakra_Petch']">
              Hardware Testing, Calibration &amp; Control Bench
            </h2>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Configure dynamic parameters (base weight, temperature override, safety thresholds) and test physical actuators with bi-directional hardware feedback.
          </p>
        </div>

        {/* Live Measured Feedback Capsule (Disambiguated Telemetry) */}
        <div className={`flex flex-wrap items-center gap-3 p-2.5 rounded-xl border text-xs font-mono ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
        }`}>
          <div className={`px-2.5 py-1 border-r ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>MEASURED LOAD:</span>
            <span className="text-sm font-bold text-blue-500 tabular-nums">
              {telemetry.loadKg.toFixed(2)} kg
            </span>
          </div>
          <div className={`px-2.5 py-1 border-r ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TEMPERATURE:</span>
            <span className={`text-sm font-bold tabular-nums ${
              telemetry.temperatureC >= tempCrit ? 'text-rose-500 font-bold' : telemetry.temperatureC >= tempWarn ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {telemetry.temperatureC.toFixed(1)} °C
            </span>
          </div>
          <div className={`px-2.5 py-1 border-r ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CHASSIS INTEGRITY:</span>
            <span className={`text-xs font-bold uppercase ${
              telemetry.systemStatus === 'CRITICAL' ? 'text-rose-500' : telemetry.systemStatus === 'WARNING' ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {telemetry.systemStatus === 'CRITICAL' ? 'CRITICAL (Strain/Vibe)' : telemetry.systemStatus === 'WARNING' ? 'WARNING (Elevated)' : 'NORMAL (Safe)'}
            </span>
          </div>
          <div className={`px-2.5 py-1 border-r ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
            <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>THERMAL HEALTH:</span>
            <span className={`text-xs font-bold uppercase ${
              telemetry.temperatureC >= tempCrit ? 'text-rose-500' : telemetry.temperatureC >= tempWarn ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {telemetry.temperatureC >= tempCrit ? 'OVERHEAT' : telemetry.temperatureC >= tempWarn ? 'ELEVATED' : 'SAFE'}
            </span>
          </div>
          <button
            onClick={onNavigateToLiveData}
            className="h-8 px-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5"
          >
            <span>📊</span> Live Data
          </button>
        </div>
      </div>

      {/* Row 1: Dual Control Columns (Balanced Height & High Contrast) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
        {/* Section 1: Base Weight Calibration & Dynamic Pressure Addition */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <div className={`flex items-center justify-between pb-3 mb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <h3 className="text-sm font-bold font-['Chakra_Petch'] uppercase tracking-wider text-blue-500">
                  Base Weight &amp; Dynamic Pressure Addition
                </h3>
              </div>
              <button
                onClick={() => onHardwareControl('CMD:TARE')}
                className={`h-7.5 px-3 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-blue-950/80 hover:bg-blue-900 text-blue-300 border-blue-500/50'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300'
                }`}
                title="Zero tare load cells"
              >
                <span>⚖️</span> Tare Zero
              </button>
            </div>

            {/* High-Contrast Dynamic Formula card */}
            <div className={`p-3.5 mb-5 rounded-lg border text-xs font-mono space-y-2 ${
              isDark
                ? 'bg-slate-950 border-blue-500/40 text-slate-200'
                : 'bg-blue-50/80 border-blue-200 text-slate-800'
            }`}>
              <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-wide">
                <span>💡</span> Dynamic Formula
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-800 border border-slate-200'}`}>
                  Base: {baseWeightInput.toFixed(1)} kg
                </span>
                <span className="text-slate-400 font-bold">+</span>
                <span className={`px-2 py-0.5 rounded font-bold ${isDark ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                  Applied: {appliedPressureInput.toFixed(1)} kg
                </span>
                <span className="text-slate-400 font-bold">=</span>
                <span className="px-2.5 py-0.5 rounded font-bold bg-blue-600 text-white shadow-sm">
                  {(baseWeightInput + appliedPressureInput).toFixed(1)} kg
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Base weight calibrates the hardware zero point. Any physical force or hand-load on the load cell sensor dynamically adds on top of this value.
              </p>
            </div>

            {/* 1. Base Weight Setting */}
            <div className="space-y-2.5 mb-5">
              <div className="flex justify-between items-center text-xs font-mono">
                <label className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  1. Set Base Weight (Baseline Setting):
                </label>
                <span className="text-blue-500 font-bold text-sm tabular-nums">
                  {baseWeightInput.toFixed(1)} kg
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="60"
                step="0.5"
                value={baseWeightInput}
                onChange={(e) => handleApplyBaseWeight(parseFloat(e.target.value))}
                className={`w-full h-2.5 rounded-lg cursor-pointer accent-blue-500 ${
                  isDark ? 'bg-slate-800' : 'bg-slate-200'
                }`}
              />

              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {[0, 5, 15, 20, 30, 45].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleApplyBaseWeight(preset)}
                    className={`h-7.5 px-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      baseWeightInput === preset
                        ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-sm'
                        : isDark
                          ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {preset === 0 ? '0 kg' : `${preset}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Simulated Additional Pressure / Physical Force */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <label className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  2. Add Applied Force / Pressure on Sensor:
                </label>
                <span className="text-amber-500 font-bold text-sm tabular-nums">
                  +{appliedPressureInput.toFixed(1)} kg
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="40"
                step="0.5"
                value={appliedPressureInput}
                onChange={(e) => handleApplyPressure(parseFloat(e.target.value))}
                className={`w-full h-2.5 rounded-lg cursor-pointer accent-blue-500 ${
                  isDark ? 'bg-slate-800' : 'bg-slate-200'
                }`}
              />

              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {[0, 2.5, 5, 10, 15, 25].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleApplyPressure(preset)}
                    className={`h-7.5 px-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      appliedPressureInput === preset
                        ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-sm'
                        : isDark
                          ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`mt-6 pt-3 border-t flex items-center justify-between text-xs font-mono ${
            isDark ? 'border-slate-800/80' : 'border-slate-200'
          }`}>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Total Live Load (HX711):</span>
            <span className="text-blue-500 font-bold text-base tabular-nums">
              {telemetry.loadKg.toFixed(2)} kg ({(telemetry.loadKg * 9.81).toFixed(1)} N)
            </span>
          </div>
        </div>

        {/* Section 2: Temperature Control & Thermal Override */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <div className={`flex items-center justify-between pb-3 mb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🌡️</span>
                <h3 className="text-sm font-bold font-['Chakra_Petch'] uppercase tracking-wider text-amber-500">
                  Temperature Control &amp; Thermal Testing
                </h3>
              </div>
              <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border ${
                useManualTemp
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {useManualTemp ? 'MANUAL OVERRIDE' : 'DS18B20 SENSOR'}
              </span>
            </div>

            {/* Mode switch */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => handleApplyTemperature(false, 25.0)}
                className={`h-9 px-3 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  !useManualTemp
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : isDark
                      ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>🌿</span> Real DS18B20 Sensor
              </button>
              <button
                onClick={() => handleApplyTemperature(true, tempInput)}
                className={`h-9 px-3 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  useManualTemp
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : isDark
                      ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>🔥</span> Manual Override Mode
              </button>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-2.5 mb-5">
              <div className="flex justify-between items-center text-xs font-mono">
                <label className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  Target / Override Temperature:
                </label>
                <span className={`text-sm font-bold tabular-nums ${
                  tempInput >= tempCrit ? 'text-rose-500 font-bold' : tempInput >= tempWarn ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {tempInput.toFixed(1)} °C
                </span>
              </div>

              <input
                type="range"
                min="10"
                max="80"
                step="0.5"
                disabled={!useManualTemp}
                value={tempInput}
                onChange={(e) => handleApplyTemperature(true, parseFloat(e.target.value))}
                className={`w-full h-2.5 rounded-lg cursor-pointer accent-blue-500 ${
                  useManualTemp
                    ? isDark ? 'bg-slate-800' : 'bg-slate-200'
                    : 'bg-slate-800/40 opacity-40 cursor-not-allowed'
                }`}
              />

              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[24.0, 32.0, 39.0, 48.0, 60.0].map((preset) => (
                  <button
                    key={preset}
                    disabled={!useManualTemp}
                    onClick={() => handleApplyTemperature(true, preset)}
                    className={`h-7.5 px-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      tempInput === preset && useManualTemp
                        ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-sm'
                        : isDark
                          ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    {preset === 24.0 ? '24° Nom' : preset === 39.0 ? '39° Warn' : preset === 48.0 ? '48° Crit' : `${preset}°C`}
                  </button>
                ))}
              </div>
            </div>

            {/* Disambiguated Thermal vs Chassis Status Box */}
            <div className={`p-3.5 rounded-lg border text-xs font-mono space-y-2 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>DS18B20 Live Temperature:</span>
                <span className="font-bold text-sm tabular-nums text-blue-400">{telemetry.temperatureC.toFixed(1)} °C</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Thermal Alarm Status:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  telemetry.temperatureC >= tempCrit
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                    : telemetry.temperatureC >= tempWarn
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}>
                  {telemetry.temperatureC >= tempCrit ? 'CRITICAL OVERHEAT' : telemetry.temperatureC >= tempWarn ? 'ELEVATED TEMP' : 'SAFE (Nominal)'}
                </span>
              </div>
              <div className={`text-[11px] pt-1 border-t leading-tight ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                ℹ DS18B20 temperature subsystem is monitored independently. Overall chassis alarm may trigger from load cell strain or vibration impact.
              </div>
            </div>
          </div>

          <div className={`mt-6 pt-3 border-t flex items-center justify-between text-xs font-mono ${
            isDark ? 'border-slate-800/80' : 'border-slate-200'
          }`}>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Overheat Alarm Cut-off:</span>
            <span className="text-rose-500 font-bold">{tempCrit} °C</span>
          </div>
        </div>
      </div>

      {/* Row 2: Section 3 - Dynamic Safety Threshold Configuration (Full Width Harmonized Card) */}
      <div className={`p-5 rounded-xl border mb-6 transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className={`flex items-center justify-between pb-3 mb-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <div>
              <h3 className="text-sm font-bold font-['Chakra_Petch'] uppercase tracking-wider text-blue-500">
                Hardware Safety Alert Thresholds
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                When real-time telemetry exceeds these limits, physical hardware alarms (buzzer, traffic LEDs, motor) trigger automatically.
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncThresholds}
            className="h-8 px-4 text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm border border-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>⚡</span> Sync to Hardware
          </button>
        </div>

        {/* 5 Threshold Sliders in a balanced responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Load Warning Threshold */}
          <div className={`p-3.5 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Weight Warning Limit:</span>
              <span className="font-bold text-amber-500 tabular-nums">{weightWarn} kg</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              value={weightWarn}
              onChange={(e) => setWeightWarn(parseInt(e.target.value))}
              className={`w-full h-2 rounded-lg cursor-pointer accent-blue-500 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
            />
            <div className={`text-[10px] font-mono mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Triggers yellow warning alert</div>
          </div>

          {/* Load Critical Threshold */}
          <div className={`p-3.5 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Weight Critical Limit:</span>
              <span className="font-bold text-rose-500 tabular-nums">{weightCrit} kg</span>
            </div>
            <input
              type="range"
              min="20"
              max="80"
              value={weightCrit}
              onChange={(e) => setWeightCrit(parseInt(e.target.value))}
              className={`w-full h-2 rounded-lg cursor-pointer accent-blue-500 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
            />
            <div className={`text-[10px] font-mono mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Triggers full emergency shutdown</div>
          </div>

          {/* Temperature Warning Threshold */}
          <div className={`p-3.5 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Temp Warning Limit:</span>
              <span className="font-bold text-amber-500 tabular-nums">{tempWarn} °C</span>
            </div>
            <input
              type="range"
              min="25"
              max="60"
              value={tempWarn}
              onChange={(e) => setTempWarn(parseInt(e.target.value))}
              className={`w-full h-2 rounded-lg cursor-pointer accent-blue-500 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
            />
            <div className={`text-[10px] font-mono mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Yellow LED + thermal caution</div>
          </div>

          {/* Temperature Critical Threshold */}
          <div className={`p-3.5 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Temp Critical Limit:</span>
              <span className="font-bold text-rose-500 tabular-nums">{tempCrit} °C</span>
            </div>
            <input
              type="range"
              min="35"
              max="80"
              value={tempCrit}
              onChange={(e) => setTempCrit(parseInt(e.target.value))}
              className={`w-full h-2 rounded-lg cursor-pointer accent-blue-500 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
            />
            <div className={`text-[10px] font-mono mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Audible piezo alarm &amp; red beacon</div>
          </div>

          {/* Roll Warp Limit */}
          <div className={`p-3.5 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} md:col-span-2 lg:col-span-1`}>
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Torsion Angle Limit:</span>
              <span className="font-bold text-blue-400 tabular-nums">±{rollLimit}°</span>
            </div>
            <input
              type="range"
              min="10"
              max="45"
              value={rollLimit}
              onChange={(e) => setRollLimit(parseInt(e.target.value))}
              className={`w-full h-2 rounded-lg cursor-pointer accent-blue-500 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
            />
            <div className={`text-[10px] font-mono mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Chassis torsional strain deflection</div>
          </div>
        </div>
      </div>

      {/* Row 3: Section 4 - Physical Actuator Remote Controls (Cockpit Layout, Eliminating Dead Whitespace) */}
      <div className={`p-5 rounded-xl border transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className={`flex items-center justify-between pb-3 mb-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">🎮</span>
            <div>
              <h3 className="text-sm font-bold font-['Chakra_Petch'] uppercase tracking-wider text-blue-500">
                Physical Actuator Remote Cockpit
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Direct hardware signal toggles for audio sounders, haptic vibration PWM, and emergency traffic signal lights.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onHardwareControl('CMD:LED_TEST:1')}
              className={`h-8 px-3 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-blue-600 border-slate-300'
              }`}
            >
              <span>✨</span> Run Blink Test
            </button>
            <button
              onClick={handleResetAll}
              className={`h-8 px-3 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <span>🔄</span> Reset Defaults
            </button>
          </div>
        </div>

        {/* 4-Panel Actuator Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Piezo Buzzer */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>1. Piezo Buzzer (GPIO 3)</span>
                <span className={`font-bold text-[11px] ${telemetry.buzzerActive ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`}>
                  {telemetry.buzzerActive ? 'SOUNDING' : 'SILENT'}
                </span>
              </div>
              <p className={`text-[11px] mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Audio acoustic transducer for hazard warnings</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onHardwareControl('CMD:BUZZER:1')}
                className={`h-8 px-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  telemetry.buzzerActive
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                    : isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>🔔</span> ON
              </button>
              <button
                onClick={() => onHardwareControl('CMD:BUZZER:0')}
                className={`h-8 px-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <span>🔕</span> OFF
              </button>
            </div>
          </div>

          {/* 2. Vibration Motor */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>2. Haptic Motor (GPIO 4)</span>
                <span className={`font-bold text-[11px] ${telemetry.vibrationMotorActive ? 'text-blue-400' : 'text-slate-400'}`}>
                  {telemetry.vibrationMotorActive ? `PWM ${telemetry.vibrationDutyCycle}` : 'OFF'}
                </span>
              </div>
              <p className={`text-[11px] mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Mechanical vibration haptic generator</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onHardwareControl('CMD:MOTOR:255')}
                className={`h-8 px-1 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
                  telemetry.vibrationDutyCycle === 255
                    ? 'bg-blue-600 text-white border-blue-400'
                    : isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                100%
              </button>
              <button
                onClick={() => onHardwareControl('CMD:MOTOR:128')}
                className={`h-8 px-1 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
                  telemetry.vibrationDutyCycle === 128
                    ? 'bg-blue-600 text-white border-blue-400'
                    : isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                50%
              </button>
              <button
                onClick={() => onHardwareControl('CMD:MOTOR:0')}
                className={`h-8 px-1 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                STOP
              </button>
            </div>
          </div>

          {/* 3. Traffic Light LEDs */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>3. Traffic Signal LEDs</span>
                <span className={`font-bold text-[11px] ${telemetry.ledRed ? 'text-rose-500' : telemetry.ledYellow ? 'text-amber-500' : telemetry.ledGreen ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {telemetry.ledRed ? 'RED ACTIVE' : telemetry.ledYellow ? 'YELLOW ACTIVE' : telemetry.ledGreen ? 'GREEN ACTIVE' : 'ALL OFF'}
                </span>
              </div>
              <p className={`text-[11px] mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tri-color visual status safety tower</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onHardwareControl(telemetry.ledGreen ? 'CMD:LED_GREEN:0' : 'CMD:LED_GREEN:1')}
                className={`h-8 px-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  telemetry.ledGreen
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                    : isDark ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                GRN {telemetry.ledGreen ? '●' : '○'}
              </button>
              <button
                onClick={() => onHardwareControl(telemetry.ledYellow ? 'CMD:LED_YELLOW:0' : 'CMD:LED_YELLOW:1')}
                className={`h-8 px-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  telemetry.ledYellow
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-md'
                    : isDark ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                YEL {telemetry.ledYellow ? '●' : '○'}
              </button>
              <button
                onClick={() => onHardwareControl(telemetry.ledRed ? 'CMD:LED_RED:0' : 'CMD:LED_RED:1')}
                className={`h-8 px-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  telemetry.ledRed
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md animate-pulse'
                    : isDark ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                RED {telemetry.ledRed ? '●' : '○'}
              </button>
            </div>
          </div>

          {/* 4. Full Emergency Alarm Test */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>4. Emergency Alarm Mode</span>
                <span className="font-bold text-[11px] text-rose-500">TEST BEACON</span>
              </div>
              <p className={`text-[11px] mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Simulate instant crash/overheat alarm broadcast</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onHardwareControl('CMD:ALARM_TEST:1')}
                className="h-8 px-2 text-xs font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
              >
                <span>🚨</span> Trigger
              </button>
              <button
                onClick={() => onHardwareControl('CMD:ALARM_TEST:0')}
                className="h-8 px-2 text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
              >
                <span>✅</span> Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
