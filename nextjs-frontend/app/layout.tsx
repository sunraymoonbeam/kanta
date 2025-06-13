import './globals.css';
import type { Metadata } from 'next';
import Navbar from '../components/Navbar';
import { EventProvider } from '../components/EventContext';

export const metadata: Metadata = {
  title: 'Kanta',
  description: 'Collaborative Event Photos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <EventProvider>
          <Navbar />
          <main>{children}</main>
        </EventProvider>
      </body>
    </html>
  );
}
