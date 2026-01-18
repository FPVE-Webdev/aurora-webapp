'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useMasterStatus } from '@/contexts/MasterStatusContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aurora.tromso.ai';

export function StructuredData() {
  const { status } = useMasterStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // WebSite Schema
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nordlys Tromsø',
    alternateName: 'Aurora Tromsø',
    url: APP_URL,
    description: 'Real-time aurora borealis forecast and decision engine for Tromsø, Norway',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${APP_URL}/?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };

  // SoftwareApplication Schema
  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Nordlys Tromsø',
    applicationCategory: 'WeatherApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'NOK'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127'
    },
    description: 'Real-time Northern Lights forecast with live cloud coverage and solar activity data for Tromsø'
  };

  // FAQPage Schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Can I see Northern Lights in Tromsø tonight?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Based on live solar wind and local cloud coverage data, the current status is ${status}. Check the live map at aurora.tromso.ai for real-time cloud gaps and best viewing locations.`
        }
      },
      {
        '@type': 'Question',
        name: 'What time is best for Northern Lights in Tromsø tonight?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The best viewing time varies by solar activity and weather conditions. Check our forecast page for tonight\'s peak activity window, typically between 22:00 and 02:00 during winter months.'
        }
      },
      {
        '@type': 'Question',
        name: 'Where should I drive to see aurora from Tromsø?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The best locations depend on current cloud coverage. Popular spots include Ersfjordbotn (25 min), Sommarøy (1h), and Kvaløya west coast (30-40 min). Use our live map to find clear skies in real-time.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is a KP index of 3 good for Tromsø?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'KP 3 is moderate activity and often visible in Tromsø due to its high latitude (69.6°N). Even KP 2-3 can produce visible aurora with clear skies. The most important factor is local cloud coverage.'
        }
      }
    ]
  };

  // SpecialAnnouncement Schema (only when GO status)
  const goAnnouncementSchema = status === 'GO' ? {
    '@context': 'https://schema.org',
    '@type': 'SpecialAnnouncement',
    name: 'Northern Lights Visible Now in Tromsø',
    text: 'Strong aurora activity detected with clear skies. Status: GO NOW.',
    category: 'https://schema.org/Event',
    datePosted: new Date().toISOString(),
    expires: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // Expires in 4 hours
    spatialCoverage: {
      '@type': 'Place',
      name: 'Tromsø, Norway',
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 69.6496,
        longitude: 18.9560
      }
    }
  } : null;

  return (
    <>
      <Script
        id="schema-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <Script
        id="schema-app"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <Script
        id="schema-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {goAnnouncementSchema && (
        <Script
          id="schema-go-announcement"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(goAnnouncementSchema) }}
        />
      )}
    </>
  );
}
