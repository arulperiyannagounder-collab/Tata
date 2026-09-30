import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';

export type LightPaletteId = 'tata_shield_light' | 'photofocus' | 'mitchell_adam' | 'arctic_breeze';
export type DarkPaletteId = 'tata_shield' | 'obsidian_depths' | 'midnight_shadows' | 'twilight_hues';

export interface PalettePreset {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  swatches: [string, string, string];
  bgRoot: string;
  bgSurface: string;
  bgCard: string;
  bgHeader: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
  sceneBackground: number;
  sceneFog: number;
  esdMatBase: number;
  esdMatColor: number;
  ambientLightColor: number;
  ambientLightIntensity: number;
}

export const LIGHT_PALETTES: Record<LightPaletteId, PalettePreset> = {
  tata_shield_light: {
    id: 'tata_shield_light',
    name: 'TATA-SHIELD CAE Studio',
    subtitle: 'Automotive Precision Lab',
    description: 'Clean automotive validation laboratory white canvas with cyber cyan (#0284c7) and titanium surfaces.',
    swatches: ['#f8fafc', '#ffffff', '#0284c7'],
    bgRoot: '#f8fafc',
    bgSurface: '#ffffff',
    bgCard: '#ffffff',
    bgHeader: '#ffffff',
    borderSubtle: '#e2e8f0',
    borderStrong: '#0284c7',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    accentPrimary: '#0284c7',
    accentSecondary: '#06b6d4',
    sceneBackground: 0xf8fafc,
    sceneFog: 0xf8fafc,
    esdMatBase: 0xe2e8f0,
    esdMatColor: 0x0284c7,
    ambientLightColor: 0xffffff,
    ambientLightIntensity: 1.15,
  },
  photofocus: {
    id: 'photofocus',
    name: 'Photofocus',
    subtitle: 'White, Light Gray, Tomato',
    description: 'Crisp white backdrop with soft light gray cards and tomato button accents for high engagement.',
    swatches: ['#ffffff', '#f1f5f9', '#ff5238'],
    bgRoot: '#ffffff',
    bgSurface: '#f8fafc',
    bgCard: '#ffffff',
    bgHeader: '#ffffff',
    borderSubtle: '#e2e8f0',
    borderStrong: '#cbd5e1',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    accentPrimary: '#ff5238',
    accentSecondary: '#0284c7',
    sceneBackground: 0xf8fafc,
    sceneFog: 0xf8fafc,
    esdMatBase: 0xe2e8f0,
    esdMatColor: 0x0284c7,
    ambientLightColor: 0xffffff,
    ambientLightIntensity: 1.15,
  },
  mitchell_adam: {
    id: 'mitchell_adam',
    name: 'Mitchell Adam',
    subtitle: 'Yellow, Black, White',
    description: 'High-contrast white canvas with bold black surfaces and vibrant yellow accents that pop.',
    swatches: ['#ffffff', '#090d16', '#eab308'],
    bgRoot: '#ffffff',
    bgSurface: '#f9fafb',
    bgCard: '#ffffff',
    bgHeader: '#ffffff',
    borderSubtle: '#e5e7eb',
    borderStrong: '#18181b',
    textPrimary: '#09090b',
    textSecondary: '#27272a',
    textMuted: '#71717a',
    accentPrimary: '#eab308',
    accentSecondary: '#090d16',
    sceneBackground: 0xf4f4f5,
    sceneFog: 0xf4f4f5,
    esdMatBase: 0xd4d4d8,
    esdMatColor: 0xca8a04,
    ambientLightColor: 0xffffff,
    ambientLightIntensity: 1.2,
  },
  arctic_breeze: {
    id: 'arctic_breeze',
    name: 'Arctic Breeze',
    subtitle: 'Cool Whites & Light Blues',
    description: 'Serene cool whites and tranquil light blues for a high-clarity laboratory workspace.',
    swatches: ['#f0f7ff', '#bae6fd', '#0284c7'],
    bgRoot: '#f0f7ff',
    bgSurface: '#ffffff',
    bgCard: '#f8fbff',
    bgHeader: '#ffffff',
    borderSubtle: '#dbeafe',
    borderStrong: '#93c5fd',
    textPrimary: '#0c4a6e',
    textSecondary: '#0369a1',
    textMuted: '#38bdf8',
    accentPrimary: '#0284c7',
    accentSecondary: '#38bdf8',
    sceneBackground: 0xf0f7ff,
    sceneFog: 0xf0f7ff,
    esdMatBase: 0xdbeafe,
    esdMatColor: 0x0284c7,
    ambientLightColor: 0xffffff,
    ambientLightIntensity: 1.25,
  },
};

export const DARK_PALETTES: Record<DarkPaletteId, PalettePreset> = {
  tata_shield: {
    id: 'tata_shield',
    name: 'TATA-SHIELD (01 CAE)',
    subtitle: '01 Design & CAE Validation',
    description: 'Official TATA-shield automotive engineering theme — graphite obsidian (#0a0e13, #10151c) with tactical cyan (#22d3ee) and aero blue (#38bdf8).',
    swatches: ['#0a0e13', '#10151c', '#22d3ee'],
    bgRoot: '#0a0e13',
    bgSurface: '#0d1219',
    bgCard: '#10151c',
    bgHeader: '#0d1219',
    borderSubtle: '#1d2631',
    borderStrong: '#22d3ee',
    textPrimary: '#E6EDF5',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    accentPrimary: '#22d3ee',
    accentSecondary: '#38bdf8',
    sceneBackground: 0x0a0e13,
    sceneFog: 0x0a0e13,
    esdMatBase: 0x10151c,
    esdMatColor: 0x1d2631,
    ambientLightColor: 0xe2e8f0,
    ambientLightIntensity: 0.95,
  },
  obsidian_depths: {
    id: 'obsidian_depths',
    name: 'Obsidian Depths',
    subtitle: 'Deep Blues & Teals',
    description: 'Deep obsidian blues with luminous teals and cyans for peak telemetry focus.',
    swatches: ['#060a12', '#0e1626', '#14b8a6'],
    bgRoot: '#060a12',
    bgSurface: '#0b111e',
    bgCard: '#0e1626',
    bgHeader: '#080e19',
    borderSubtle: '#1e293b',
    borderStrong: '#06b6d4',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accentPrimary: '#14b8a6',
    accentSecondary: '#06b6d4',
    sceneBackground: 0x060a12,
    sceneFog: 0x060a12,
    esdMatBase: 0x0f172a,
    esdMatColor: 0x064e3b,
    ambientLightColor: 0x99f6e4,
    ambientLightIntensity: 0.85,
  },
  midnight_shadows: {
    id: 'midnight_shadows',
    name: 'Midnight Shadows',
    subtitle: 'Deep Blacks & Vibrant Red',
    description: 'Deep midnight blacks with vibrant red accents and pure white contrast.',
    swatches: ['#05070d', '#0e1322', '#ef4444'],
    bgRoot: '#05070d',
    bgSurface: '#090d18',
    bgCard: '#0e1322',
    bgHeader: '#070b14',
    borderSubtle: '#1c2333',
    borderStrong: '#ef4444',
    textPrimary: '#ffffff',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    accentPrimary: '#ef4444',
    accentSecondary: '#38bdf8',
    sceneBackground: 0x05070d,
    sceneFog: 0x05070d,
    esdMatBase: 0x18181b,
    esdMatColor: 0x991b1b,
    ambientLightColor: 0xdbeafe,
    ambientLightIntensity: 0.85,
  },
  twilight_hues: {
    id: 'twilight_hues',
    name: 'Twilight Hues',
    subtitle: 'Deep Indigo & Rich Violet',
    description: 'Deep twilight indigo and rich violet creating unmatched visual depth and sophistication.',
    swatches: ['#080918', '#15173b', '#8b5cf6'],
    bgRoot: '#080918',
    bgSurface: '#0f102b',
    bgCard: '#15173b',
    bgHeader: '#0b0c20',
    borderSubtle: '#252756',
    borderStrong: '#8b5cf6',
    textPrimary: '#ffffff',
    textSecondary: '#c4b5fd',
    textMuted: '#818cf8',
    accentPrimary: '#8b5cf6',
    accentSecondary: '#6366f1',
    sceneBackground: 0x080918,
    sceneFog: 0x080918,
    esdMatBase: 0x1e1b4b,
    esdMatColor: 0x312e81,
    ambientLightColor: 0xe0e7ff,
    ambientLightIntensity: 0.9,
  },
};

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  lightPalette: LightPaletteId;
  setLightPalette: (palette: LightPaletteId) => void;
  darkPalette: DarkPaletteId;
  setDarkPalette: (palette: DarkPaletteId) => void;
  activeConfig: PalettePreset;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('shield_theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'dark';
  });

  const [lightPalette, setLightPaletteState] = useState<LightPaletteId>(() => {
    try {
      const saved = localStorage.getItem('shield_light_palette');
      if (saved && saved in LIGHT_PALETTES) {
        return saved as LightPaletteId;
      }
    } catch {
      // Ignore
    }
    return 'tata_shield_light'; // Default Light: TATA-SHIELD CAE Studio
  });

  const [darkPalette, setDarkPaletteState] = useState<DarkPaletteId>(() => {
    try {
      const saved = localStorage.getItem('shield_dark_palette');
      if (saved && saved in DARK_PALETTES) {
        return saved as DarkPaletteId;
      }
    } catch {
      // Ignore
    }
    return 'tata_shield'; // Default Dark: TATA-SHIELD (01 Design & CAE Validation)
  });

  const isDark = theme === 'dark';
  const activeConfig = isDark ? DARK_PALETTES[darkPalette] : LIGHT_PALETTES[lightPalette];

  useEffect(() => {
    try {
      localStorage.setItem('shield_theme', theme);
      localStorage.setItem('shield_light_palette', lightPalette);
      localStorage.setItem('shield_dark_palette', darkPalette);
    } catch {
      // Ignore
    }

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.setAttribute('data-dark-palette', darkPalette);
      root.removeAttribute('data-light-palette');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.setAttribute('data-light-palette', lightPalette);
      root.removeAttribute('data-dark-palette');
      root.style.colorScheme = 'light';
    }

    // Apply active palette CSS variables
    root.style.setProperty('--bg-root', activeConfig.bgRoot);
    root.style.setProperty('--bg-surface', activeConfig.bgSurface);
    root.style.setProperty('--bg-card', activeConfig.bgCard);
    root.style.setProperty('--bg-header', activeConfig.bgHeader);
    root.style.setProperty('--border-subtle', activeConfig.borderSubtle);
    root.style.setProperty('--border-strong', activeConfig.borderStrong);
    root.style.setProperty('--text-primary', activeConfig.textPrimary);
    root.style.setProperty('--text-secondary', activeConfig.textSecondary);
    root.style.setProperty('--text-muted', activeConfig.textMuted);
    root.style.setProperty('--accent-primary', activeConfig.accentPrimary);
    root.style.setProperty('--accent-secondary', activeConfig.accentSecondary);

    // TATA-shield standard layout tokens
    root.style.setProperty('--bg', activeConfig.bgRoot);
    root.style.setProperty('--bg2', activeConfig.bgSurface);
    root.style.setProperty('--panel', activeConfig.bgCard);
    root.style.setProperty('--panel2', isDark ? '#141b24' : '#f1f5f9');
    root.style.setProperty('--line', activeConfig.borderSubtle);
    root.style.setProperty('--line2', isDark ? '#273342' : '#cbd5e1');
    root.style.setProperty('--text-heading', isDark ? '#F8FAFC' : '#0f172a');
    root.style.setProperty('--text-accent', activeConfig.accentPrimary);
    root.style.setProperty('--text-success', '#34D399');
    root.style.setProperty('--text-warning', '#FBBF24');
    root.style.setProperty('--text-critical', '#F87171');
  }, [theme, lightPalette, darkPalette, activeConfig, isDark]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const setLightPalette = (palette: LightPaletteId) => {
    setLightPaletteState(palette);
  };

  const setDarkPalette = (palette: DarkPaletteId) => {
    setDarkPaletteState(palette);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        setTheme,
        lightPalette,
        setLightPalette,
        darkPalette,
        setDarkPalette,
        activeConfig,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
