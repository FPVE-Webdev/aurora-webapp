import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Customize your aurora forecast experience - language, temperature units, and notification preferences',
  openGraph: {
    title: 'Settings - Nordlys Tromsø',
    description: 'Customize your aurora forecast experience',
  },
  twitter: {
    title: 'Settings - Nordlys Tromsø',
    description: 'Customize your aurora forecast experience',
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
