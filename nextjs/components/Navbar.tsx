import Link from 'next/link';

export default function Navbar() {
  return (
    <nav>
      <Link href="/">Home</Link> |{' '}
      <Link href="/events">Events</Link> |{' '}
      <Link href="/camera">Camera</Link> |{' '}
      <Link href="/gallery">Gallery</Link> |{' '}
      <Link href="/people">People</Link>
    </nav>
  );
}
