import './globals.css';
import type { Metadata } from 'next';
import Header from '../components/layout/Header';
import { EventProvider } from '../hooks/useEventsProvider';

export const metadata: Metadata = {
  title: 'Kanta',
  description: 'AI-powered collaborative photo sharing platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <EventProvider>
          <Header />
          <main>{children}</main>
        </EventProvider>
      </body>
    </html>
  );
}
