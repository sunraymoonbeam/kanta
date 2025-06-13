// Kanta Design System Configuration
// Inspired by magic-portfolio's once-ui system

import { Inter, JetBrains_Mono } from 'next/font/google';

// Font configurations
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const fonts = {
  primary: inter,
  mono: jetbrainsMono,
};

// Theme configuration
export const themes = {
  light: {
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceElevated: '#ffffff',
    border: '#e2e8f0',
    borderSubtle: '#f1f5f9',
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#64748b',
      muted: '#94a3b8',
    },
    brand: {
      primary: '#3b82f6',
      secondary: '#1e40af',
      background: '#eff6ff',
      text: '#1e40af',
    },
    accent: {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      background: '#f3f4f6',
      text: '#7c3aed',
    },
    semantic: {
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0284c7',
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
  },
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    surfaceElevated: '#334155',
    border: '#374151',
    borderSubtle: '#1f2937',
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      muted: '#64748b',
    },
    brand: {
      primary: '#60a5fa',
      secondary: '#3b82f6',
      background: '#1e3a8a',
      text: '#93c5fd',
    },
    accent: {
      primary: '#a78bfa',
      secondary: '#8b5cf6',
      background: '#4c1d95',
      text: '#c4b5fd',
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
    },
  },
};

// Layout configuration
export const layout = {
  maxWidth: '1200px',
  padding: {
    xs: '1rem',
    sm: '1.5rem',
    md: '2rem',
    lg: '3rem',
    xl: '4rem',
  },
  radius: {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    xxl: '4rem',
  },
};

// Animation configuration
export const animations = {
  transition: {
    fast: '0.15s ease-out',
    normal: '0.25s ease-out',
    slow: '0.4s ease-out',
  },
  spring: {
    gentle: { type: 'spring', stiffness: 100, damping: 15 },
    medium: { type: 'spring', stiffness: 200, damping: 20 },
    bouncy: { type: 'spring', stiffness: 300, damping: 10 },
  },
};

// Typography configuration
export const typography = {
  size: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },
  weight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

// Navigation configuration
export const navigation = {
  routes: {
    '/': { label: 'Home', icon: '🏠' },
    '/events': { label: 'Events', icon: '🎭' },
    '/gallery': { label: 'Gallery', icon: '🖼️' },
    '/people': { label: 'People', icon: '👥' },
  },
  display: {
    time: true,
    themeSwitcher: true,
    breadcrumbs: true,
  },
};

// Effects configuration (inspired by magic-portfolio)
export const effects = {
  glassmorphism: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    accent: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    subtle: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  },
  dots: {
    display: true,
    opacity: 0.4,
    size: '2px',
    spacing: '20px',
  },
};

export type Theme = typeof themes.light;
export type ThemeMode = 'light' | 'dark' | 'system';
