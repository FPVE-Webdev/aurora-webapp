import type { Metadata } from 'next';
import ClientLayout from './client-layout';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Nordlys Tromsø - Aurora Borealis Forecast',
    template: '%s | Nordlys Tromsø',
  },
  description: 'Real-time aurora borealis forecast and activity monitoring for Tromsø, Norway',
  icons: {
    icon: '/Aurahalo.png',
    apple: '/Aurahalo.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'no_NO',
    siteName: 'Nordlys Tromsø',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
