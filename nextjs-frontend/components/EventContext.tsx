'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getEvents, Event } from '../lib/api';

interface EventContextType {
  events: Event[];
  selected: string;
  setSelected: (code: string) => void;
  refresh: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEvents();
      setEvents(data);
      if (!selected || !data.find((e) => e.code === selected)) {
        setSelected(data.length ? data[0].code : '');
      }
    } catch (e: any) {
      console.error('Failed to load events', e);
      setError(e.response?.data?.detail || e.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EventContext.Provider value={{ events, selected, setSelected, refresh, loading, error }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvents must be used within EventProvider');
  return ctx;
}
