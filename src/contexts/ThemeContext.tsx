import React, { createContext, useContext, useState, useEffect } from 'react';

// Convert a hex color string to "H S% L%" format for Tailwind HSL CSS variables
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'default',
    name: 'Default Blue',
    colors: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      accent: '#8b5cf6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    }
  },
  {
    id: 'green',
    name: 'Nature Green',
    colors: {
      primary: '#059669',
      secondary: '#6b7280',
      accent: '#10b981',
      background: '#ffffff',
      surface: '#f0fdf4',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#d1fae5',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#059669'
    }
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    colors: {
      primary: '#7c3aed',
      secondary: '#6b7280',
      accent: '#a855f7',
      background: '#ffffff',
      surface: '#faf5ff',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#e9d5ff',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#7c3aed'
    }
  },
  {
    id: 'orange',
    name: 'Sunset Orange',
    colors: {
      primary: '#ea580c',
      secondary: '#6b7280',
      accent: '#f97316',
      background: '#ffffff',
      surface: '#fff7ed',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#fed7aa',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#ea580c'
    }
  },
  {
    id: 'teal',
    name: 'Ocean Teal',
    colors: {
      primary: '#0d9488',
      secondary: '#6b7280',
      accent: '#14b8a6',
      background: '#ffffff',
      surface: '#f0fdfa',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#99f6e4',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#0d9488'
    }
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    colors: {
      primary: '#3b82f6',
      secondary: '#9ca3af',
      accent: '#8b5cf6',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb',
      textSecondary: '#d1d5db',
      border: '#374151',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    }
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    colors: {
      primary: '#e11d48',
      secondary: '#6b7280',
      accent: '#f43f5e',
      background: '#ffffff',
      surface: '#fff1f2',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#fecdd3',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#e11d48'
    }
  },
  {
    id: 'indigo',
    name: 'Deep Indigo',
    colors: {
      primary: '#4f46e5',
      secondary: '#6b7280',
      accent: '#6366f1',
      background: '#ffffff',
      surface: '#f8faff',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#c7d2fe',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#4f46e5'
    }
  }
];

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

  useEffect(() => {
    // Load saved theme from localStorage
    const savedThemeId = localStorage.getItem('billing-app-theme');
    if (savedThemeId) {
      const savedTheme = themes.find(theme => theme.id === savedThemeId);
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const c = currentTheme.colors;

    // Apply --color-* custom properties (used by hand-written components)
    Object.entries(c).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Derive a foreground color: white for dark backgrounds, dark text otherwise
    const isDarkBg = c.background === '#111827' || c.surface === '#1f2937';
    const fgHsl = isDarkBg ? hexToHsl(c.text) : hexToHsl('#1f2937');
    const mutedFgHsl = hexToHsl(c.textSecondary);
    const bgHsl = hexToHsl(c.background);
    const surfaceHsl = hexToHsl(c.surface);
    const borderHsl = hexToHsl(c.border);
    const primaryHsl = hexToHsl(c.primary);
    const primaryFgHsl = isDarkBg ? hexToHsl(c.text) : '0 0% 100%';
    const accentHsl = hexToHsl(c.surface);
    const accentFgHsl = fgHsl;

    // Bridge to Tailwind / shadcn CSS HSL variables used by Dialog, Popover, Select, Sheet, etc.
    root.style.setProperty('--background', bgHsl);
    root.style.setProperty('--foreground', fgHsl);
    root.style.setProperty('--card', bgHsl);
    root.style.setProperty('--card-foreground', fgHsl);
    root.style.setProperty('--popover', bgHsl);
    root.style.setProperty('--popover-foreground', fgHsl);
    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--primary-foreground', primaryFgHsl);
    root.style.setProperty('--secondary', surfaceHsl);
    root.style.setProperty('--secondary-foreground', fgHsl);
    root.style.setProperty('--muted', surfaceHsl);
    root.style.setProperty('--muted-foreground', mutedFgHsl);
    root.style.setProperty('--accent', accentHsl);
    root.style.setProperty('--accent-foreground', accentFgHsl);
    root.style.setProperty('--destructive', hexToHsl(c.error));
    root.style.setProperty('--destructive-foreground', '0 0% 100%');
    root.style.setProperty('--border', borderHsl);
    root.style.setProperty('--input', borderHsl);
    root.style.setProperty('--ring', primaryHsl);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem('billing-app-theme', themeId);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};