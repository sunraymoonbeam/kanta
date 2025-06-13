'use client';
import React, { useState, useEffect } from 'react';
import { getEvents } from '../lib/api';
import { Event } from '../types/events';
import { EventContext, EventContextType } from './useEvents';

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

  const value: EventContextType = {
    events,
    selected,
    setSelected,
    refresh,
    loading,
    error,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}
