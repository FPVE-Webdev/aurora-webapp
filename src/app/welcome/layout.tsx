import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome',
  description: 'Welcome to Nordlys Tromsø - your guide to aurora borealis forecasts and viewing conditions in Northern Norway',
  openGraph: {
    title: 'Welcome - Nordlys Tromsø',
    description: 'Your guide to aurora borealis forecasts in Northern Norway',
  },
  twitter: {
    title: 'Welcome - Nordlys Tromsø',
    description: 'Your guide to aurora borealis forecasts in Northern Norway',
  },
};

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
