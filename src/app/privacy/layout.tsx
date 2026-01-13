import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy and data handling practices for Nordlys Tromsø aurora forecast service',
  openGraph: {
    title: 'Privacy Policy - Nordlys Tromsø',
    description: 'Privacy policy and data handling practices',
  },
  twitter: {
    title: 'Privacy Policy - Nordlys Tromsø',
    description: 'Privacy policy and data handling practices',
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
