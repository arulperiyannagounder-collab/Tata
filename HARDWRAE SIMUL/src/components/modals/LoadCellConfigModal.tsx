import React, { useState } from 'react';
import { LoadCellWiringConfig } from '../../types/simulation';
import { useTheme } from '../../context/ThemeContext';

interface LoadCellConfigModalProps {
  currentConfig: LoadCellWiringConfig;
  onSaveConfig: (config: LoadCellWiringConfig) => void;
  onClose: () => void;
}

export const LoadCellConfigModal: React.FC<LoadCellConfigModalProps> = ({
  currentConfig,
  onSaveConfig,
  onClose,
}) => {
  const { isDark } = useTheme();
  const [config, setConfig] = useState<LoadCellWiringConfig>(currentConfig);

  const colorOptions = [
    { label: 'Red (Excitation + / Standard)', value: 'Red (#ef4444)' },
    { label: 'Black (Excitation - / Ground)', value: 'Black (#1e293b)' },
    { label: 'White (Signal - / Inverting)', value: 'White (#f8fafc)' },
    { label: 'Green (Signal + / Non-inverting)', value: 'Green (#22c55e)' },
    { label: 'Yellow (Shield / Ground)', value: 'Yellow (#eab308)' },
    { label: 'Twisted Black (Dual-gauge)', value: 'Twisted Black (#334155)' },
    { label: 'Twisted White (Dual-gauge)', value: 'Twisted White (#e2e8f0)' },
  ];

  const presets = [
    {
      name: '4x 50kg Half-Bridge Quad Array (Reference Hardware)',
      desc: '4x Load cells in Wheatstone bridge: Red to E+/E-, Black & White pairs to A+/A-',
      config: {
        ePlusColor: 'Red (#ef4444)',
        eMinusColor: 'Black (#1e293b)',
        aPlusColor: 'Twisted Black (#334155)',
        aMinusColor: 'Twisted White (#e2e8f0)',
      },
    },
    {
      name: 'Standard 4-Wire Full Bridge (Color Code A)',
      desc: 'Red → E+, Black → E-, Green → A+, White → A-',
      config: {
        ePlusColor: 'Red (#ef4444)',
        eMinusColor: 'Black (#1e293b)',
        aPlusColor: 'Green (#22c55e)',
        aMinusColor: 'White (#f8fafc)',
      },
    },
    {
      name: 'Industrial Load Cell (Color Code B)',
      desc: 'Red → E+, White → E-, Green → A+, Black → A-',
      config: {
        ePlusColor: 'Red (#ef4444)',
        eMinusColor: 'White (#f8fafc)',
        aPlusColor: 'Green (#22c55e)',
        aMinusColor: 'Black (#1e293b)',
      },
    },
  ];

  const handleApply = () => {
    onSaveConfig(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className={`w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border transition-colors ${
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div>
            <h2 className={`text-base font-bold font-['Chakra_Petch'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
              HX711 Bridge Terminal Pin Mapping
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Configure strain-gauge wire color assignments for E+, E-, A+, and A-
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-['Plus_Jakarta_Sans']">
          <div className={`p-3 border rounded-lg leading-relaxed ${
            isDark ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            <span className="font-bold">⚠️ Manufacturer Variance Notice:</span> Strain-gauge and load-cell wire colors are not universally standardized across vendors. Use this panel to match your exact physical transducer manufacturer pinout.
          </div>

          {/* Quick Presets */}
          <div>
            <h4 className={`text-[11px] font-mono uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Transducer Wiring Presets
            </h4>
            <div className="space-y-1.5">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setConfig(preset.config)}
                  className={`w-full p-2.5 rounded-lg text-left transition-colors cursor-pointer border ${
                    isDark
                      ? 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 shadow-xs'
                  }`}
                >
                  <span className={`font-bold block text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{preset.name}</span>
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pin Assignment Form */}
          <div className={`p-4 rounded-lg space-y-3 font-mono border ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className={`text-[11px] uppercase tracking-wider font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
              HX711 Wheatstone Bridge Terminals
            </h4>

            {/* E+ */}
            <div className="flex items-center justify-between">
              <div>
                <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>E+ (Excitation Positive +3.3V)</span>
                <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Bridge supply voltage</span>
              </div>
              <select
                value={config.ePlusColor}
                onChange={(e) => setConfig({ ...config, ePlusColor: e.target.value })}
                className={`rounded px-2 py-1 text-xs cursor-pointer border ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {colorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* E- */}
            <div className="flex items-center justify-between">
              <div>
                <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>E- (Excitation Negative / GND)</span>
                <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Bridge return ground</span>
              </div>
              <select
                value={config.eMinusColor}
                onChange={(e) => setConfig({ ...config, eMinusColor: e.target.value })}
                className={`rounded px-2 py-1 text-xs cursor-pointer border ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {colorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* A+ */}
            <div className="flex items-center justify-between">
              <div>
                <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>A+ (Channel A Differential Signal +)</span>
                <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>High-gain PGA non-inverting input</span>
              </div>
              <select
                value={config.aPlusColor}
                onChange={(e) => setConfig({ ...config, aPlusColor: e.target.value })}
                className={`rounded px-2 py-1 text-xs cursor-pointer border ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {colorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* A- */}
            <div className="flex items-center justify-between">
              <div>
                <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>A- (Channel A Differential Signal -)</span>
                <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>High-gain PGA inverting input</span>
              </div>
              <select
                value={config.aMinusColor}
                onChange={(e) => setConfig({ ...config, aMinusColor: e.target.value })}
                className={`rounded px-2 py-1 text-xs cursor-pointer border ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {colorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex justify-end gap-2 ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-100'
        }`}>
          <button
            onClick={onClose}
            className={`px-3 py-1.5 text-xs rounded transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
