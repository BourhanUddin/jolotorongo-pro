import './globals.css';
import type { Metadata, Viewport } from 'next';
import AppProviders from '@/components/AppProviders';

export const metadata: Metadata = {
  title: 'জলতরঙ্গ | Jolotorongo',
  description: 'Tanguar Haor houseboat management SaaS for owners, managers, and agents.',
  applicationName: 'Jolotorongo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Jolotorongo',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0ea5e9',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
