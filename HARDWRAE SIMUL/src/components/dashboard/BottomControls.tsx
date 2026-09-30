import { ImpactScenario, ViewMode } from '../../types/simulation';
import { useTheme } from '../../context/ThemeContext';
import { Play, Pause, RotateCcw, Lock, Check } from 'lucide-react';

interface BottomControlsProps {
  isRunning: boolean;
  activeScenario: ImpactScenario;
  viewMode?: ViewMode;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSelectScenario: (scenario: ImpactScenario) => void;
  onToggleViewMode?: (mode: ViewMode) => void;
  onCheckConnections: () => void;
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  isRunning,
  activeScenario,
  onStart,
  onPause,
  onReset,
  onSelectScenario,
  onCheckConnections,
}) => {
  const { isDark } = useTheme();

  const scenarios: {
    id: ImpactScenario;
    label: string;
    desc: string;
    activeDarkColor: string;
    activeLightColor: string;
  }[] = [
    {
      id: 'NORMAL',
      label: 'NORMAL',
      desc: 'Nominal Highway Cruising (Green LED)',
      activeDarkColor: 'bg-emerald-950 border-emerald-500 text-emerald-300',
      activeLightColor: 'bg-emerald-100 border-emerald-600 text-emerald-900 font-bold shadow-xs',
    },
    {
      id: 'POTHOLE',
      label: 'POTHOLE',
      desc: 'Transient Vertical Shock (Yellow LED)',
      activeDarkColor: 'bg-amber-950 border-amber-500 text-amber-300',
      activeLightColor: 'bg-amber-100 border-amber-600 text-amber-900 font-bold shadow-xs',
    },
    {
      id: 'MINOR_IMPACT',
      label: 'MINOR IMPACT',
      desc: 'Curb / Bump Collision (Warn State)',
      activeDarkColor: 'bg-amber-950 border-amber-500 text-amber-300',
      activeLightColor: 'bg-amber-100 border-amber-600 text-amber-900 font-bold shadow-xs',
    },
    {
      id: 'MAJOR_IMPACT',
      label: 'MAJOR IMPACT',
      desc: 'High-G Crash Event (Red LED, Siren & Motor)',
      activeDarkColor: 'bg-rose-950 border-rose-500 text-rose-300',
      activeLightColor: 'bg-rose-100 border-rose-600 text-rose-900 font-bold shadow-xs',
    },
    {
      id: 'STRUCTURAL_DAMAGE',
      label: 'STRUCTURAL DAMAGE',
      desc: 'Permanent Plastic Chassis Deformation',
      activeDarkColor: 'bg-rose-950 border-rose-500 text-rose-300',
      activeLightColor: 'bg-rose-100 border-rose-600 text-rose-900 font-bold shadow-xs',
    },
  ];

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-t shrink-0 select-none font-['Plus_Jakarta_Sans'] transition-colors duration-200 ${
        isDark ? 'border-[#1d2631] bg-[#0d1219] text-[#E6EDF5]' : 'border-slate-200 bg-white text-slate-800 shadow-xs'
      }`}
    >
      {/* Simulation Execution Controls: START, PAUSE, RESET */}
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-mono uppercase tracking-wider hidden sm:inline ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Simulation:
        </span>
        <div className={`flex items-center gap-1.5 p-1 rounded-md border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          {isRunning ? (
            <button
              onClick={onPause}
              className={`h-8 flex items-center gap-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer border ${
                isDark
                  ? 'text-amber-300 bg-amber-950/70 hover:bg-amber-900/80 border-amber-500/50'
                  : 'text-amber-800 bg-amber-100 hover:bg-amber-200 border-amber-300'
              }`}
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onStart}
              className={`h-8 flex items-center gap-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer border ${
                isDark
                  ? 'text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-500/50'
                  : 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border-emerald-300'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start</span>
            </button>
          )}

          <button
            onClick={onReset}
            className={`h-8 flex items-center gap-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              isDark
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Impact Event Trigger Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
        <span className={`text-[11px] font-mono uppercase tracking-wider mr-1 hidden md:inline ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Impact Scenarios:
        </span>
        {scenarios.map((sc) => {
          const isActive = activeScenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.id)}
              title={sc.desc}
              className={`h-8 px-3 text-xs font-mono font-semibold rounded-md border transition-all whitespace-nowrap cursor-pointer shadow-xs ${
                isActive
                  ? isDark
                    ? sc.activeDarkColor
                    : sc.activeLightColor
                  : isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {sc.label}
            </button>
          );
        })}
      </div>

      {/* Validation Trigger */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCheckConnections}
          title="Open Component Lock & Validation Manager"
          className={`h-8 flex items-center gap-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shadow-xs cursor-pointer border ${
            isDark
              ? 'text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/50'
              : 'text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border-cyan-300'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Lock &amp; Validation</span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
            <Check className="w-2.5 h-2.5" /> LOCKED
          </span>
        </button>
      </div>
    </div>
  );
};
