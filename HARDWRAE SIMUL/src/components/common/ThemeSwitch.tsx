import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Palette, Check } from 'lucide-react';
import {
  useTheme,
  LIGHT_PALETTES,
  DARK_PALETTES,
  LightPaletteId,
  DarkPaletteId,
} from '../../context/ThemeContext';

interface ThemeSwitchProps {
  className?: string;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ className = '' }) => {
  const {
    theme,
    isDark,
    toggleTheme,
    lightPalette,
    setLightPalette,
    darkPalette,
    setDarkPalette,
    activeConfig,
  } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={`relative inline-flex items-center gap-1.5 select-none ${className}`}>
      {/* Main Light/Dark Toggle Button - Standardized h-8 matching navbar buttons */}
      <button
        onClick={toggleTheme}
        type="button"
        title={
          isDark
            ? `Switch to Light Theme (Current: ${activeConfig.name})`
            : `Switch to Dark Theme (Current: ${activeConfig.name})`
        }
        aria-label={`Toggle theme. Current theme is ${theme} (${activeConfig.name})`}
        className={`h-8 px-2.5 rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
          isDark
            ? 'bg-[#10151c] border-[#1d2631] text-cyan-400 hover:text-white hover:bg-[#141b24] hover:border-cyan-500/50'
            : 'bg-white border-slate-300 text-amber-600 hover:text-amber-800 hover:bg-slate-50'
        }`}
      >
        {isDark ? <Moon className="w-3.5 h-3.5 fill-current" /> : <Sun className="w-3.5 h-3.5 fill-current" />}
        <span className="text-[11px] font-mono font-bold hidden lg:inline">
          {isDark ? 'Dark' : 'Light'}
        </span>
      </button>

      {/* Palette Selector Button - Standardized h-8 */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        title="Choose Theme Color Palette Preset"
        className={`h-8 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer shadow-xs ${
          isDark
            ? 'bg-[#10151c] border-[#1d2631] text-[#E6EDF5] hover:text-white hover:bg-[#141b24]'
            : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
        } ${isOpen ? 'ring-1 ring-cyan-400' : ''}`}
      >
        <Palette className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline-block max-w-[125px] truncate text-[11px] font-semibold">
          {activeConfig.name}
        </span>
        {/* Color swatches preview dots */}
        <div className="flex items-center -space-x-1 ml-0.5">
          {activeConfig.swatches.map((color, i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-xs"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </button>

      {/* Palette Popover Menu */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-2 w-72 rounded-xl border shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 backdrop-blur-xl ${
            isDark
              ? 'bg-[#0d1219]/95 border-[#1d2631] text-[#E6EDF5] shadow-black/80'
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/80'
          }`}
        >
          <div className={`flex items-center justify-between pb-2 mb-2 border-b text-xs font-mono ${
            isDark ? 'border-[#1d2631]' : 'border-slate-200'
          }`}>
            <span className="font-bold flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>Theme Palettes</span>
            </span>
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
              isDark ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40' : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </span>
          </div>

          <div className="space-y-1.5">
            {isDark ? (
              // Dark Palette Options
              (Object.keys(DARK_PALETTES) as DarkPaletteId[]).map((key) => {
                const preset = DARK_PALETTES[key];
                const isSelected = darkPalette === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDarkPalette(key);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-sm'
                        : 'bg-[#10151c] border-[#1d2631] text-[#94A3B8] hover:bg-[#141b24] hover:border-[#273342] hover:text-[#E6EDF5]'
                    }`}
                  >
                    {/* Swatches column */}
                    <div className="flex flex-col gap-1 pt-0.5">
                      <div className="flex items-center -space-x-1">
                        {preset.swatches.map((color, i) => (
                          <span
                            key={i}
                            className="w-3 h-3 rounded-full border border-black/50 shadow-xs"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-['Chakra_Petch'] text-white">
                          {preset.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono block">
                        {preset.subtitle}
                      </span>
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              // Light Palette Options
              (Object.keys(LIGHT_PALETTES) as LightPaletteId[]).map((key) => {
                const preset = LIGHT_PALETTES[key];
                const isSelected = lightPalette === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setLightPalette(key);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-slate-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {/* Swatches column */}
                    <div className="flex flex-col gap-1 pt-0.5">
                      <div className="flex items-center -space-x-1">
                        {preset.swatches.map((color, i) => (
                          <span
                            key={i}
                            className="w-3 h-3 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-['Chakra_Petch'] text-slate-900">
                          {preset.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-blue-600 font-mono block">
                        {preset.subtitle}
                      </span>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
