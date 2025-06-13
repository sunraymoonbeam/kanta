'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getEvents } from '../lib/api';

export interface EventInfo {
  code: string;
  name?: string;
  description?: string;
  start_date_time?: string;
  end_date_time?: string;
  event_image_url?: string;
  qr_code_image_url?: string;
}

interface EventContextType {
  events: EventInfo[];
  selected: string;
  setSelected: (code: string) => void;
  refresh: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [selected, setSelected] = useState('');

  const refresh = async () => {
    try {
      const data = await getEvents();
      setEvents(data);
      if (!selected || !data.find((e) => e.code === selected)) {
        setSelected(data.length ? data[0].code : '');
      }
    } catch (e) {
      console.error('Failed to load events', e);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EventContext.Provider value={{ events, selected, setSelected, refresh }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvents must be used within EventProvider');
  return ctx;
}
