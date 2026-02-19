import React, { createContext, useContext, useState, useEffect } from 'react';

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
    // Apply theme colors to CSS custom properties
    const root = document.documentElement;
    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
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