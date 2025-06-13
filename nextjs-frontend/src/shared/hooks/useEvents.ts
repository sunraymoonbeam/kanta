import { createContext, useContext } from 'react';
import { Event } from '../types/events';

export interface EventContextType {
  events: Event[];
  selected: string;
  setSelected: (code: string) => void;
  refresh: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const EventContext = createContext<EventContextType | undefined>(undefined);

export function useEvents(): EventContextType {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}
