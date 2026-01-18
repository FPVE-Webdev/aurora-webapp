import type { Metadata } from 'next';
import ClientLayout from './client-layout';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
  let dynamicTitle = 'Nordlys Tromsø - Aurora Borealis Forecast';
  let dynamicDescription = 'Real-time aurora borealis forecast and activity monitoring for Tromsø, Norway';

  try {
    const response = await fetch(
      `${APP_URL}/api/seo/master-status`,
      { next: { revalidate: 300 } } // 5 min cache
    );

    if (response.ok) {
      const { status, emoji } = await response.json();
      const statusText = status === 'GO' ? 'GO NOW' : status === 'WAIT' ? 'WAIT' : 'NO';
      dynamicTitle = `${emoji} Live Aurora Forecast Tromsø: ${statusText}`;
      dynamicDescription = "Real-time decision engine for Northern Lights. Don't guess. Know exactly where to drive right now. Local cloud cover & solar data.";
    }
  } catch (error) {
    // Use fallback metadata
  }

  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: dynamicTitle,
      template: '%s | Nordlys Tromsø',
    },
    description: dynamicDescription,
    icons: {
      icon: '/Aurahalo.png',
      apple: '/Aurahalo.png',
    },
    manifest: '/manifest.json',
    openGraph: {
      type: 'website',
      locale: 'no_NO',
      siteName: 'Nordlys Tromsø',
      title: dynamicTitle,
      description: dynamicDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: dynamicTitle,
      description: dynamicDescription,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
