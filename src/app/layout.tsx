import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { LocaleProvider } from '@/lib/i18n';
import { DatabaseProvider } from '@/lib/db/init';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfairDisplay.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <AuthProvider>
          <LocaleProvider>
            <DatabaseProvider>{children}</DatabaseProvider>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
