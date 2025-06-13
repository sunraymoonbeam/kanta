'use client';
import Link from 'next/link';
import { useEvents } from './EventContext';

export default function Navbar() {
  const { events, selected, setSelected } = useEvents();
  return (
    <nav>
      <Link href="/">Home</Link> |{' '}
      <Link href="/events">Events</Link> |{' '}
      <Link href="/camera">Camera</Link> |{' '}
      <Link href="/gallery">Gallery</Link> |{' '}
      <Link href="/people">People</Link>
      <span style={{ marginLeft: '1rem' }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {events.map((e) => (
            <option key={e.code} value={e.code}>
              {e.name || e.code}
            </option>
          ))}
        </select>
      </span>
    </nav>
  );
}
