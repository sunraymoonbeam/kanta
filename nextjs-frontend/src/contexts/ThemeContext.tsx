'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { themes, type Theme, type ThemeMode } from '../config/design.config';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'system',
}) => {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const [theme, setTheme] = useState<Theme>(themes.light);

  const resolveTheme = (themeMode: ThemeMode): Theme => {
    if (themeMode === 'system') {
      const prefersDark = window?.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? themes.dark : themes.light;
    }
    return themes[themeMode];
  };

  const updateTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    const resolvedTheme = resolveTheme(newMode);
    setTheme(resolvedTheme);
    
    // Save to localStorage
    localStorage.setItem('kanta-theme', newMode);
    
    // Update CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--background', resolvedTheme.background);
    root.style.setProperty('--surface', resolvedTheme.surface);
    root.style.setProperty('--surface-elevated', resolvedTheme.surfaceElevated);
    root.style.setProperty('--border', resolvedTheme.border);
    root.style.setProperty('--border-subtle', resolvedTheme.borderSubtle);
    root.style.setProperty('--text-primary', resolvedTheme.text.primary);
    root.style.setProperty('--text-secondary', resolvedTheme.text.secondary);
    root.style.setProperty('--text-tertiary', resolvedTheme.text.tertiary);
    root.style.setProperty('--text-muted', resolvedTheme.text.muted);
    root.style.setProperty('--brand-primary', resolvedTheme.brand.primary);
    root.style.setProperty('--brand-secondary', resolvedTheme.brand.secondary);
    root.style.setProperty('--brand-background', resolvedTheme.brand.background);
    root.style.setProperty('--brand-text', resolvedTheme.brand.text);
    root.style.setProperty('--accent-primary', resolvedTheme.accent.primary);
    root.style.setProperty('--accent-secondary', resolvedTheme.accent.secondary);
    root.style.setProperty('--accent-background', resolvedTheme.accent.background);
    root.style.setProperty('--accent-text', resolvedTheme.accent.text);
    
    // Update theme mode on document
    root.setAttribute('data-theme', newMode === 'system' ? (resolvedTheme === themes.dark ? 'dark' : 'light') : newMode);
  };

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    updateTheme(newMode);
  };

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('kanta-theme') as ThemeMode;
    const initialMode = savedTheme || defaultMode;
    updateTheme(initialMode);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (mode === 'system') {
        updateTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [defaultMode, mode]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        mode,
        toggleTheme,
        setTheme: updateTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
