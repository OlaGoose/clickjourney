import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { LocaleProvider } from '@/lib/i18n';
import { DatabaseProvider } from '@/lib/db/init';
import { DayNightThemeSync } from '@/components/theme/DayNightThemeSync';

export const metadata: Metadata = {
  title: 'Orbit Journey – Travel Memory',
  description: 'Your journey on the globe. Memories, places, and stories.',
  keywords: ['travel', 'memory', 'globe', 'journey'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

/** Inline script: set day/night class on <html> before first paint so vlog/upload dark: styles apply immediately. */
const DAY_NIGHT_SCRIPT = `
(function(){
  var h=new Date().getHours();
  document.documentElement.classList.toggle('dark',h<6||h>=22);
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DAY_NIGHT_SCRIPT }} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        <DayNightThemeSync />
        <AuthProvider>
          <LocaleProvider>
            <DatabaseProvider>{children}</DatabaseProvider>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
