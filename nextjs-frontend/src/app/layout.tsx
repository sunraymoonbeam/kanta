import './globals.css';
import type { Metadata } from 'next';
import { Navbar } from '../features/ui';
import { EventProvider } from '../features/events';

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
