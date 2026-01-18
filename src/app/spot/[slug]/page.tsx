import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSpotBySlug, SPOT_SLUGS } from '@/lib/constants/spotDatabase';
import SpotPageView from './view';

interface SpotPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return SPOT_SLUGS.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: SpotPageProps): Promise<Metadata> {
  const { slug } = await params;
  const spot = getSpotBySlug(slug);

  if (!spot) {
    return {
      title: 'Spot Not Found',
    };
  }

  const title = `${spot.name} Aurora Forecast - Northern Lights Tromsø`;
  const description = `Real-time aurora forecast for ${spot.name}. ${spot.description.substring(0, 120)}... Live cloud coverage and KP index data.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SpotPage({ params }: SpotPageProps) {
  const { slug } = await params;
  const spot = getSpotBySlug(slug);

  if (!spot) {
    notFound();
  }

  return <SpotPageView spot={spot} />;
}
