import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upgrade to Premium',
  description: 'Unlock premium aurora forecast features - detailed spot forecasts, extended historical data, and priority support',
  openGraph: {
    title: 'Upgrade to Premium - Nordlys Tromsø',
    description: 'Unlock premium aurora forecast features and detailed spot forecasts',
  },
  twitter: {
    title: 'Upgrade to Premium - Nordlys Tromsø',
    description: 'Unlock premium aurora forecast features and detailed spot forecasts',
  },
};

export default function UpgradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
