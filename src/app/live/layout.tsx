import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Aurora Map',
  description: 'Real-time aurora borealis activity map for Tromsø and Northern Norway with current conditions and visibility forecasts',
  openGraph: {
    title: 'Live Aurora Map - Nordlys Tromsø',
    description: 'Real-time aurora borealis activity map for Tromsø and Northern Norway',
  },
  twitter: {
    title: 'Live Aurora Map - Nordlys Tromsø',
    description: 'Real-time aurora borealis activity map for Tromsø and Northern Norway',
  },
};

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
