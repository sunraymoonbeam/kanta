'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';
import { useEvents } from '../../hooks/useEvents';
import { navigation } from '../../config/design.config';

// Theme Toggle Component
const ThemeToggle: React.FC = () => {
  const { mode, toggleTheme } = useTheme();
  
  const getIcon = () => {
    switch (mode) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'system': return '💻';
      default: return '☀️';
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-surface hover:bg-surface-elevated border border-border transition-colors"
      title={`Current theme: ${mode}`}
    >
      <span className="text-lg">{getIcon()}</span>
    </motion.button>
  );
};

// Time Display Component
const TimeDisplay: React.FC = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-sm text-text-muted font-mono">
      {time}
    </div>
  );
};

// Navigation Item Component
interface NavItemProps {
  href: string;
  label: string;
  icon: string;
  isActive: boolean;
  className?: string;
}

const NavItem: React.FC<NavItemProps> = ({ href, label, icon, isActive, className }) => {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={clsx(
          'relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
          'text-sm font-medium',
          {
            'bg-brand-background text-brand-text shadow-sm': isActive,
            'text-text-secondary hover:text-text-primary hover:bg-surface': !isActive,
          },
          className
        )}
      >
        <span className="text-base">{icon}</span>
        <span className="hidden sm:block">{label}</span>
        {isActive && (
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 bg-brand-background rounded-lg -z-10"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
      </motion.div>
    </Link>
  );
};

// Event Selector Component
const EventSelector: React.FC = () => {
  const { events, selected, setSelected, loading } = useEvents();
  const [isOpen, setIsOpen] = useState(false);

  if (loading || events.length === 0) return null;

  const selectedEvent = events.find(event => event.code === selected);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-elevated border border-border rounded-lg transition-colors"
      >
        <span className="text-sm font-medium text-text-primary">
          {selectedEvent?.name || 'Select Event'}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="text-text-muted"
        >
          ↓
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 w-64 bg-surface-elevated border border-border rounded-xl shadow-xl z-50"
          >
            <div className="p-2">
              {events.map((event) => (
                <motion.button
                  key={event.code}
                  whileHover={{ backgroundColor: 'var(--surface)' }}
                  onClick={() => {
                    setSelected(event.code);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-lg transition-colors',
                    'text-sm text-text-primary hover:text-text-primary',
                    {
                      'bg-brand-background text-brand-text': selected === event.code,
                    }
                  )}
                >
                  <div className="font-medium">{event.name}</div>
                  <div className="text-xs text-text-muted">
                    {new Date(event.start_date_time).toLocaleDateString()}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

// Main Header Component
const Header: React.FC = () => {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Backdrop blur for mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isScrolled ? 1 : 0 }}
        className="fixed top-0 inset-x-0 h-20 bg-background/80 backdrop-blur-md border-b border-border z-40 lg:hidden"
      />
      
      {/* Main header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={clsx(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          {
            'bg-background/95 backdrop-blur-md shadow-sm border-b border-border': isScrolled,
            'bg-transparent': !isScrolled,
          }
        )}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            
            {/* Left: Logo and main nav */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link href="/">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-accent-primary rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg font-bold">K</span>
                  </div>
                  <span className="text-xl font-bold text-text-primary">
                    Kanta
                  </span>
                </motion.div>
              </Link>

              {/* Main Navigation - Hidden on mobile */}
              <nav className="hidden lg:flex items-center gap-1">
                {Object.entries(navigation.routes).map(([path, { label, icon }]) => (
                  <NavItem
                    key={path}
                    href={path}
                    label={label}
                    icon={icon}
                    isActive={
                      path === '/' 
                        ? pathname === path 
                        : pathname.startsWith(path)
                    }
                  />
                ))}
              </nav>
            </div>

            {/* Center: Event selector on larger screens */}
            <div className="hidden lg:flex">
              <EventSelector />
            </div>

            {/* Right: Theme toggle and time */}
            <div className="flex items-center gap-4">
              {navigation.display.time && (
                <div className="hidden lg:block">
                  <TimeDisplay />
                </div>
              )}
              
              {navigation.display.themeSwitcher && <ThemeToggle />}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden pb-4">
            <div className="flex items-center justify-between mb-3">
              <EventSelector />
            </div>
            
            <nav className="flex items-center gap-1">
              {Object.entries(navigation.routes).map(([path, { label, icon }]) => (
                <NavItem
                  key={path}
                  href={path}
                  label={label}
                  icon={icon}
                  isActive={
                    path === '/' 
                      ? pathname === path 
                      : pathname.startsWith(path)
                  }
                  className="flex-1 justify-center"
                />
              ))}
            </nav>
          </div>
        </div>
      </motion.header>

      {/* Spacer to prevent content from hiding behind fixed header */}
      <div className="h-16 lg:h-20" />
    </>
  );
};

export default Header;
