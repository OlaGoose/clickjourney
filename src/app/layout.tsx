import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { DatabaseProvider } from '@/lib/db/init';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <AuthProvider>
          <DatabaseProvider>{children}</DatabaseProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
