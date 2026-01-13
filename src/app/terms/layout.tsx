import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms and conditions for using Nordlys Tromsø aurora forecast service',
  openGraph: {
    title: 'Terms of Use - Nordlys Tromsø',
    description: 'Terms and conditions for using Nordlys Tromsø',
  },
  twitter: {
    title: 'Terms of Use - Nordlys Tromsø',
    description: 'Terms and conditions for using Nordlys Tromsø',
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
