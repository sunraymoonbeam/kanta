"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import styles from "./ThemeToggle.module.css";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem('kanta-theme') as 'light' | 'dark' | 'system') || 'system';
    setTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const resolveTheme = (themeValue: string) => {
      if (!themeValue || themeValue === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return themeValue;
    };

    const resolvedTheme = resolveTheme(newTheme);
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('kanta-theme', newTheme);
    setTheme(newTheme);
  };

  const cycleTheme = () => {
    const themeOrder: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    applyTheme(themeOrder[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'system':
        return '💻';
      default:
        return '💻';
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'System';
    }
  };

  if (!mounted) {
    return (
      <div className={styles.toggle}>
        <span>💻</span>
      </div>
    );
  }

  return (
    <motion.button
      className={styles.toggle}
      onClick={cycleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`Current theme: ${getThemeLabel()}. Click to cycle themes.`}
    >
      <motion.span
        key={theme}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={styles.icon}
      >
        {getThemeIcon()}
      </motion.span>
      <span className={styles.label}>{getThemeLabel()}</span>
    </motion.button>
  );
};
