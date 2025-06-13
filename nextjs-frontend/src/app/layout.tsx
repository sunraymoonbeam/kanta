import './globals.css';
import '@/styles/design-system.css';
import type { Metadata } from 'next';
import classNames from 'classnames';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { EventProvider } from '@/hooks/useEventsProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { fonts, meta } from '@/config/kanta.config';

export const metadata: Metadata = {
  title: meta.home.title,
  description: meta.home.description,
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
      lang="en" 
      className={classNames(
        fonts.heading.variable,
        fonts.body.variable,
        fonts.label.variable,
        fonts.code.variable,
      )}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('kanta-theme') || 'system';
                  const resolveTheme = (themeValue) => {
                    if (!themeValue || themeValue === 'system') {
                      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    }
                    return themeValue;
                  };
                  const resolvedTheme = resolveTheme(savedTheme);
                  document.documentElement.setAttribute('data-theme', resolvedTheme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              })();
            `,
          }}
        />
      </head>
      <body style={{ minHeight: '100vh' }} className="bg-background">
        <ThemeProvider>
          <EventProvider>
            <div className="min-h-screen bg-background">
              <Header />
              <main className="relative pt-20">
                {children}
              </main>
              <Footer />
            </div>
          </EventProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
