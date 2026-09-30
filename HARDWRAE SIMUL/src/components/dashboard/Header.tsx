import React, { useState } from 'react';
import { ViewMode, ChassisHealthState, NavigationPage } from '../../types/simulation';
import { buzzerAudio } from '../../services/BuzzerAudioEngine';
import { ThemeSwitch } from '../common/ThemeSwitch';
import { useTheme } from '../../context/ThemeContext';
import {
  Shield,
  Activity,
  Sliders,
  Box,
  Settings,
  BarChart3,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Lock,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface HeaderProps {
  viewMode: ViewMode;
  systemStatus: ChassisHealthState;
  dataSource: 'SIMULATION' | 'REAL_HARDWARE';
  currentPage?: NavigationPage;
  onSelectPage?: (page: NavigationPage) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isControlSlideBarOpen?: boolean;
  onToggleControlSlideBar?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onOpenValidator: () => void;
  onOpenLoadCellConfig: () => void;
  onOpenRealHardware: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemStatus,
  dataSource,
  currentPage = 'BENCH_3D',
  onSelectPage = () => {},
  isSidebarOpen,
  onToggleSidebar,
  isControlSlideBarOpen,
  onToggleControlSlideBar,
  isFullScreen = false,
  onToggleFullScreen,
  onOpenValidator,
  onOpenLoadCellConfig,
  onOpenRealHardware,
}) => {
  const { isDark } = useTheme();
  const [isMuted, setIsMuted] = useState(buzzerAudio.getIsMuted());

  const handleToggleMute = () => {
    const next = !isMuted;
    buzzerAudio.setMuted(next);
    setIsMuted(next);
  };

  return (
    <header
      className={`flex items-center justify-between px-6 py-3 border-b shrink-0 select-none transition-colors duration-200 ${
        isDark ? 'border-[#1d2631] bg-[#0d1219]' : 'border-slate-200 bg-white shadow-xs'
      }`}
    >
      {/* Zone 1: TATA-SHIELD Brand & Stage 01 CAE Identification */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-lg border font-bold text-sm ${
            isDark
              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-sm shadow-cyan-950/40'
              : 'bg-cyan-50 border-cyan-200 text-cyan-600 shadow-xs'
          }`}
        >
          <Shield className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`text-base font-bold tracking-tight font-['Chakra_Petch'] ${
                isDark ? 'text-[#F8FAFC]' : 'text-slate-900'
              }`}
            >
              TATA-SHIELD
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-cyan-400/15 text-cyan-300 border border-cyan-400/35 uppercase">
              01 DESIGN &amp; CAE VALIDATION
            </span>
          </div>
          <div
            className={`flex items-center gap-2 text-xs font-mono ${
              isDark ? 'text-[#94A3B8]' : 'text-slate-500'
            }`}
          >
            <span>EV Chassis Structural Health Monitoring</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                dataSource === 'SIMULATION'
                  ? isDark
                    ? 'text-amber-400 font-semibold'
                    : 'text-amber-600 font-semibold'
                  : isDark
                  ? 'text-emerald-400 font-semibold'
                  : 'text-emerald-600 font-semibold'
              }
            >
              {dataSource === 'SIMULATION' ? 'CAE BENCH SIM' : 'REAL HARDWARE STREAM'}
            </span>
          </div>
        </div>
      </div>

      {/* 4-Stage Continuous Lifecycle Ribbon (TATA-shield style) */}
      <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#1d2631] bg-black/40 text-[11px] font-mono">
        <span className="px-2 py-0.5 rounded font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          01 DESIGN (CAE)
        </span>
        <span className="text-slate-600">→</span>
        <span className="px-2 py-0.5 text-slate-500">02 BUILD (MFG)</span>
        <span className="text-slate-600">→</span>
        <span className="px-2 py-0.5 text-slate-500">03 VALIDATE (TEST)</span>
        <span className="text-slate-600">→</span>
        <span className="px-2 py-0.5 text-slate-500">04 MONITOR (LIVE)</span>
      </div>

      {/* Zone 2: Navigation links */}
      <nav
        className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}
      >
        {/* Tab 1: Live Hardware Data */}
        <button
          onClick={() => onSelectPage('LIVE_DATA')}
          className={`h-8 flex items-center gap-2 px-3 rounded-md border font-mono text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            currentPage === 'LIVE_DATA'
              ? isDark
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950/30'
                : 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-xs'
              : isDark
              ? 'bg-[#10151c] border-[#1d2631] text-[#94A3B8] hover:text-white hover:bg-[#141b24]'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className={`w-3.5 h-3.5 ${currentPage === 'LIVE_DATA' ? 'text-cyan-400' : 'text-slate-400'}`} />
          <span>Live Stream</span>
        </button>

        {/* Tab 2: Hardware Testing & Control */}
        <button
          onClick={() => onSelectPage('HARDWARE_CONTROL')}
          className={`h-8 flex items-center gap-2 px-3 rounded-md border font-mono text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            currentPage === 'HARDWARE_CONTROL'
              ? isDark
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950/30'
                : 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-xs'
              : isDark
              ? 'bg-[#10151c] border-[#1d2631] text-[#94A3B8] hover:text-white hover:bg-[#141b24]'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className={`w-3.5 h-3.5 ${currentPage === 'HARDWARE_CONTROL' ? 'text-cyan-400' : 'text-slate-400'}`} />
          <span>Control Bench</span>
        </button>

        {/* Tab 3: 3D Hardware Bench */}
        <button
          onClick={() => onSelectPage('BENCH_3D')}
          className={`h-8 flex items-center gap-2 px-3 rounded-md border font-mono text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            currentPage === 'BENCH_3D'
              ? isDark
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950/30'
                : 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-xs'
              : isDark
              ? 'bg-[#10151c] border-[#1d2631] text-[#94A3B8] hover:text-white hover:bg-[#141b24]'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Box className={`w-3.5 h-3.5 ${currentPage === 'BENCH_3D' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>3D CAE Bench</span>
        </button>

        <div className={`h-4 w-px mx-1 hidden lg:block ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />

        <button
          onClick={onOpenLoadCellConfig}
          className={`h-8 px-3 rounded-md border text-xs font-mono transition-colors cursor-pointer hidden xl:inline-flex items-center whitespace-nowrap ${
            isDark ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Load Cell Config
        </button>
        <button
          onClick={onOpenRealHardware}
          className={`h-8 px-3 rounded-md border text-xs font-mono font-semibold transition-colors cursor-pointer hidden xl:inline-flex items-center whitespace-nowrap ${
            isDark ? 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 hover:text-white' : 'border-cyan-400 text-cyan-700 bg-cyan-50 hover:bg-cyan-100'
          }`}
        >
          Connect ESP32
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Controls Slide Bar Toggle (Only for 3D Bench) */}
        {currentPage === 'BENCH_3D' && onToggleControlSlideBar && (
          <button
            onClick={onToggleControlSlideBar}
            title={isControlSlideBarOpen ? 'Hide Bench Controls Slide Bar' : 'Open Bench Controls Slide Bar'}
            className={`h-8 flex items-center gap-1.5 px-3 text-xs font-mono font-semibold rounded-md border transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              isControlSlideBarOpen
                ? isDark
                  ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
                : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-400 text-white shadow-sm'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isControlSlideBarOpen ? 'Hide Controls' : 'Controls'}</span>
            {isControlSlideBarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}

        {/* Telemetry Sidebar Toggle (Only for 3D Bench) */}
        {currentPage === 'BENCH_3D' && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isSidebarOpen ? 'Slide Telemetry Sidebar Away' : 'Open Telemetry Sidebar'}
            className={`h-8 flex items-center gap-1.5 px-3 text-xs font-mono font-semibold rounded-md border transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              isSidebarOpen
                ? isDark
                  ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
                : 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white shadow-sm'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isSidebarOpen ? 'Hide Data' : 'Data'}</span>
            {isSidebarOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        )}

        {/* Full Screen Mode Toggle */}
        {onToggleFullScreen && (
          <button
            onClick={onToggleFullScreen}
            title={isFullScreen ? 'Exit Full Screen 3D Mode (Windowed)' : 'Enter Full Screen 3D Mode'}
            className={`h-8 flex items-center gap-1.5 px-3 text-xs font-mono font-semibold rounded-md border transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              isFullScreen
                ? 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white shadow-sm'
                : isDark
                ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
            }`}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullScreen ? 'Windowed' : 'Fullscreen'}</span>
          </button>
        )}

        {/* Buzzer Sound Mute Toggle */}
        <button
          onClick={handleToggleMute}
          title={isMuted ? 'Unmute Active Buzzer Audio' : 'Mute Active Buzzer Audio'}
          className={`h-8 px-3 text-xs font-mono rounded-md border transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
            isDark
              ? isMuted
                ? 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
                : 'bg-blue-950/60 border-blue-500/50 text-blue-300 hover:bg-blue-900/60'
              : isMuted
              ? 'bg-slate-100 border-slate-300 text-slate-500 hover:text-slate-800'
              : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
          }`}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{isMuted ? 'Muted' : 'Audio'}</span>
        </button>

        {/* Component Lock & Validation Manager Button */}
        <button
          onClick={onOpenValidator}
          title="Open Component Lock & Validation Manager"
          className={`h-8 flex items-center gap-2 px-3 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shadow-xs cursor-pointer shrink-0 ${
            isDark
              ? 'text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/60'
              : 'text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border-cyan-300'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Lock</span>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono rounded font-bold border ${
              isDark
                ? 'bg-emerald-950 border-emerald-500/70 text-emerald-300'
                : 'bg-emerald-100 border-emerald-300 text-emerald-800'
            }`}
          >
            <Check className="w-2.5 h-2.5" /> VALIDATED
          </span>
        </button>

        {/* Theme Toggle Switch */}
        <div className={`pl-2 border-l shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
};
