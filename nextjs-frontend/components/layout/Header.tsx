'use client';
import Link from 'next/link';
import { useEvents } from '../../hooks/useEvents';

export default function Header() {
  const { events, selected, setSelected, loading, error } = useEvents();
  
  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 shadow-lg">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex gap-8 items-center">
          <Link href="/" className="text-white text-xl font-bold flex items-center gap-2 hover:text-indigo-200 transition-colors">
            Kanta
          </Link>
          
          <nav className="flex gap-4">
            <Link 
              href="/events" 
              className="text-white px-4 py-2 rounded-md hover:bg-white hover:bg-opacity-10 transition-all duration-200"
            >
              Events
            </Link>
            <Link 
              href="/gallery/upload"
              className="text-white px-4 py-2 rounded-md hover:bg-white hover:bg-opacity-10 transition-all duration-200"
            >
              Upload
            </Link>
            <Link 
              href="/gallery" 
              className="text-white px-4 py-2 rounded-md hover:bg-white hover:bg-opacity-10 transition-all duration-200"
            >
              Gallery
            </Link>
            <Link 
              href="/people" 
              className="text-white px-4 py-2 rounded-md hover:bg-white hover:bg-opacity-10 transition-all duration-200"
            >
              People
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {error && (
            <span className="text-red-200 text-sm bg-white bg-opacity-10 px-3 py-1 rounded">
              {error}
            </span>
          )}
          
          {loading ? (
            <span className="text-white text-sm">Loading events...</span>
          ) : (
            <div className="flex flex-col items-end">
              <label className="text-white text-xs mb-1">
                Selected Event:
              </label>
              <select 
                value={selected} 
                onChange={(e) => setSelected(e.target.value)}
                className="p-2 rounded-md border-none bg-white bg-opacity-95 min-w-48 text-sm font-medium focus:ring-2 focus:ring-white focus:ring-opacity-50"
              >
                {events.length === 0 ? (
                  <option value="">No events available</option>
                ) : (
                  events.map((e) => (
                    <option key={e.code} value={e.code}>
                      {e.name || e.code}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
