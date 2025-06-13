import React from 'react';
import Button from '../../ui/Button';

interface FilterBarProps {
  selectedEvent: string;
  onEventChange: (eventCode: string) => void;
  events: Array<{ code: string; name: string }>;
  faceCountFilter: number;
  onFaceCountChange: (count: number) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onReset: () => void;
}

export default function FilterBar({
  selectedEvent,
  onEventChange,
  events,
  faceCountFilter,
  onFaceCountChange,
  sortBy,
  onSortChange,
  onReset
}: FilterBarProps) {
  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '1.5rem'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        alignItems: 'center'
      }}>
        {/* Event Filter */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
            color: '#333',
            fontSize: '0.9rem'
          }}>
            Event
          </label>
          <select
            value={selectedEvent}
            onChange={(e) => onEventChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '1rem',
              background: 'white'
            }}
          >
            <option value="">All Events</option>
            {events.map(event => (
              <option key={event.code} value={event.code}>
                {event.name} ({event.code})
              </option>
            ))}
          </select>
        </div>

        {/* Face Count Filter */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
            color: '#333',
            fontSize: '0.9rem'
          }}>
            Minimum Faces
          </label>
          <select
            value={faceCountFilter}
            onChange={(e) => onFaceCountChange(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '1rem',
              background: 'white'
            }}
          >
            <option value={0}>Any</option>
            <option value={1}>1+ faces</option>
            <option value={2}>2+ faces</option>
            <option value={3}>3+ faces</option>
            <option value={5}>5+ faces</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
            color: '#333',
            fontSize: '0.9rem'
          }}>
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '1rem',
              background: 'white'
            }}
          >
            <option value="created_at_desc">Newest First</option>
            <option value="created_at_asc">Oldest First</option>
            <option value="face_count_desc">Most Faces</option>
            <option value="face_count_asc">Least Faces</option>
          </select>
        </div>

        {/* Reset Button */}
        <div style={{ alignSelf: 'end' }}>
          <Button
            onClick={onReset}
            variant="secondary"
            size="sm"
            style={{ width: '100%' }}
          >
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
