import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aurora Forecast',
  description: '12-hour detailed aurora borealis forecast for Tromsø and Northern Norway with hourly probability, weather conditions, and best viewing times',
  openGraph: {
    title: 'Aurora Forecast - Nordlys Tromsø',
    description: '12-hour detailed aurora forecast with hourly probability and weather conditions',
  },
  twitter: {
    title: 'Aurora Forecast - Nordlys Tromsø',
    description: '12-hour detailed aurora forecast with hourly probability and weather conditions',
  },
};

export default function ForecastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
