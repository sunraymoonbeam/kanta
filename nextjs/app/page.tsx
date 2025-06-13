import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      <h1>Kanta | Collaborative Event Photos</h1>
      <p>Transform your event into a live, shared photo album.</p>
      <ol>
        <li>
          <strong>Create Event &amp; QR Code</strong> – manage events on the{' '}
          <Link href='/events'>Events</Link> page
        </li>
        <li>
          <strong>Snap or Upload Photos</strong> on the{' '}
          <Link href='/camera'>Camera</Link> page
        </li>
        <li>
          <strong>Explore Your Gallery</strong> on the{' '}
          <Link href='/gallery'>Gallery</Link> page
        </li>
        <li>
          <strong>Find People Instantly</strong> on the{' '}
          <Link href='/people'>People</Link> page
        </li>
      </ol>
    </div>
  );
}
