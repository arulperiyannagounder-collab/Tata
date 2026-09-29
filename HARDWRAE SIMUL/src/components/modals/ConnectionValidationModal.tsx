import React, { useState } from 'react';
import { WireConnection, ValidationReport } from '../../types/simulation';
import { ElectricalValidator, CircuitStateOverrides } from '../../services/ElectricalValidator';

interface ConnectionValidationModalProps {
  wires: WireConnection[];
  onClose: () => void;
}

export const ConnectionValidationModal: React.FC<ConnectionValidationModalProps> = ({
  wires,
  onClose,
}) => {
  const [overrides, setOverrides] = useState<CircuitStateOverrides>({
    disconnectWireIds: [],
    swappedConnections: {},
    missingPullUpResistor: false,
    missingLedResistors: false,
  });

  const report: ValidationReport = ElectricalValidator.validate(wires, overrides);

  const toggleDisconnectWire = (wireId: string) => {
    setOverrides((prev) => {
      const list = prev.disconnectWireIds || [];
      const nextList = list.includes(wireId)
        ? list.filter((id) => id !== wireId)
        : [...list, wireId];
      return { ...prev, disconnectWireIds: nextList };
    });
  };

  const toggleSwapMpuSda = () => {
    setOverrides((prev) => {
      const isSwapped = Boolean(prev.swappedConnections?.['wire-mpu6050-sda']);
      const nextSwapped: Record<string, string> = isSwapped
        ? {}
        : { 'wire-mpu6050-sda': 'ESP32 GPIO 9 (Mismatched)' };
      return {
        ...prev,
        swappedConnections: nextSwapped,
      };
    });
  };

  const toggleMissingPullUp = () => {
    setOverrides((prev) => ({
      ...prev,
      missingPullUpResistor: !prev.missingPullUpResistor,
    }));
  };

  const toggleMissingLedResistors = () => {
    setOverrides((prev) => ({
      ...prev,
      missingLedResistors: !prev.missingLedResistors,
    }));
  };

  const resetFaults = () => {
    setOverrides({
      disconnectWireIds: [],
      swappedConnections: {},
      missingPullUpResistor: false,
      missingLedResistors: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h2 className="text-base font-bold text-white font-['Chakra_Petch']">
                Electrical Connection Validation Engine
              </h2>
              <p className="text-xs text-slate-400">
                Automated rule checking for power rails, GPIO assignments, pull-ups, and ballast resistors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-['Plus_Jakarta_Sans']">
          {/* Main Status Banner */}
          {report.isValid ? (
            <div className="flex items-center justify-between p-4 bg-emerald-950/70 border border-emerald-500/80 rounded-lg text-emerald-300">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">✓</span>
                <div>
                  <h3 className="text-sm font-bold tracking-wide font-mono">
                    CONNECTION VALID
                  </h3>
                  <p className="text-xs text-emerald-400/90 mt-0.5">
                    All sensors powered (3.3V), common ground verified, GPIO paths intact, pull-up & LED resistors confirmed.
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="text-emerald-400 font-bold block">{report.passedChecks} / {report.totalChecks}</span>
                <span className="text-emerald-500/80 text-[10px]">100% Passed</span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-950/80 border border-rose-500/90 rounded-lg text-rose-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl font-bold">⚠</span>
                  <h3 className="text-sm font-bold tracking-wide font-mono text-rose-300">
                    CONNECTION ERROR DETECTED ({report.errors.length} Fault{report.errors.length > 1 ? 's' : ''})
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold text-rose-400">
                  {report.passedChecks} / {report.totalChecks} Checks Passed
                </span>
              </div>
              <p className="text-xs text-rose-300/90">
                The hardware simulation detected wiring discrepancies or missing passive components against the SHIELD schematic.
              </p>
            </div>
          )}

          {/* Fault Diagnostics Table */}
          {!report.isValid && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Itemized Electrical Errors
              </h4>
              <div className="space-y-2">
                {report.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/80 border border-rose-800/60 rounded-lg text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        {err.component} · <span className="text-rose-400">{err.pin}</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 font-bold">
                        {err.severity}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-500">Expected:</span>{' '}
                        <span className="text-emerald-400 font-semibold">{err.expected}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Actual:</span>{' '}
                        <span className="text-rose-400 font-semibold">{err.actual}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 font-['Plus_Jakarta_Sans'] pt-1 border-t border-slate-800/80">
                      💡 <span className="text-slate-400">Action:</span> {err.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Fault Simulation Bench (Allows testing the validator) */}
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                Wiring Fault Injection Simulator (Test the Validator)
              </h4>
              <button
                onClick={resetFaults}
                className="text-[10px] font-mono text-slate-400 hover:text-white underline cursor-pointer"
              >
                Reset Circuit to Nominal
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Toggle simulated physical wiring faults to test the validator's real-time diagnostic reporting:
            </p>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <button
                onClick={toggleSwapMpuSda}
                className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                  overrides.swappedConnections?.['wire-mpu6050-sda']
                    ? 'bg-rose-950/70 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="block font-semibold">Swap MPU6050 SDA to GPIO 9</span>
                <span className="text-[10px] text-slate-500">Simulate pin mismatch error</span>
              </button>

              <button
                onClick={toggleMissingPullUp}
                className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                  overrides.missingPullUpResistor
                    ? 'bg-rose-950/70 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="block font-semibold">Remove DS18B20 4.7kΩ Pull-up</span>
                <span className="text-[10px] text-slate-500">Simulate floating 1-Wire bus</span>
              </button>

              <button
                onClick={() => toggleDisconnectWire('wire-hx711-dt')}
                className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                  overrides.disconnectWireIds?.includes('wire-hx711-dt')
                    ? 'bg-rose-950/70 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="block font-semibold">Disconnect HX711 DT Wire</span>
                <span className="text-[10px] text-slate-500">Simulate loose strain ADC lead</span>
              </button>

              <button
                onClick={toggleMissingLedResistors}
                className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                  overrides.missingLedResistors
                    ? 'bg-rose-950/70 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="block font-semibold">Omit 220Ω LED Resistors</span>
                <span className="text-[10px] text-slate-500">Simulate overcurrent hazard</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
