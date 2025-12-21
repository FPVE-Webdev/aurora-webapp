'use client';

import { useAuroraData } from '@/hooks/useAuroraData';
import { ProbabilityGauge } from '@/components/aurora/ProbabilityGauge';
import { AuroraStatusCard } from '@/components/aurora/AuroraStatusCard';
import { QuickStats } from '@/components/aurora/QuickStats';
import { HourlyForecast } from '@/components/aurora/HourlyForecast';
import { DarkHoursInfo } from '@/components/aurora/DarkHoursInfo';
import { FunfactPanel } from '@/components/aurora/FunfactPanel';
import { GoNowAlert } from '@/components/home/GoNowAlert';
import { PremiumCTA } from '@/components/shared/PremiumCTA';
import { Loader2, MapIcon } from 'lucide-react';
import Link from 'next/link';
import { FUNFACTS } from '@/lib/funfactEngine';
import { shouldShowGoNow } from '@/lib/auroraCalculations';
import { usePremium } from '@/contexts/PremiumContext';

export default function HomePage() {
  const {
    currentKp,
    spotForecasts,
    selectedSpot,
    isLoading,
    lastUpdate,
    error
  } = useAuroraData();
  const { isPremium } = usePremium();

  // Get current spot forecast
  const currentForecast = spotForecasts.find(f => f.spot.id === selectedSpot.id) || spotForecasts[0];
  
  // Check if we should show "Go Now" alert
  const showGoNow = currentForecast && shouldShowGoNow(currentForecast.currentProbability, selectedSpot.latitude);

  if (isLoading && spotForecasts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">Laster nordlysdata...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-400 text-5xl">⚠️</div>
          <h2 className="text-xl font-semibold text-white">Kunne ikke laste nordlysdata</h2>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arctic-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Aurora glow effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-primary/20 to-transparent blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-5xl md:text-6xl font-display font-bold text-white">
              Nordlys i Tromsø
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Live nordlysvarsel for Nord-Norge basert på solaktivitet, værmeldinger og geografisk plassering
            </p>
            <div className="text-sm text-white/50">
              Sist oppdatert: {new Date(lastUpdate).toLocaleTimeString('no')}
            </div>
          </div>

          {/* Main Probability Gauge */}
          <div className="flex justify-center mb-8">
            {currentForecast && (
              <ProbabilityGauge
                probability={currentForecast.currentProbability}
                size="lg"
              />
            )}
          </div>

          {/* Go Now Alert */}
          {showGoNow && currentForecast && (
            <div className="max-w-4xl mx-auto mb-8">
              <GoNowAlert 
                probability={currentForecast.currentProbability} 
                locationName={selectedSpot.name} 
              />
            </div>
          )}

          {/* Aurora Status Card */}
          <div className="max-w-4xl mx-auto mb-8">
            {currentForecast && (
              <AuroraStatusCard data={currentForecast} />
            )}
          </div>

          {/* Quick Stats */}
          <div className="max-w-4xl mx-auto mb-8">
            {currentForecast && (
              <QuickStats
                kpIndex={currentKp}
                cloudCoverage={currentForecast.weather.cloudCoverage}
                temperature={currentForecast.weather.temperature}
                bestViewingTime={currentForecast.hourlyForecast && currentForecast.hourlyForecast.length > 0
                  ? currentForecast.hourlyForecast.reduce((best, forecast) =>
                      forecast.probability > best.probability ? forecast : best
                    ).hour
                  : null
                }
              />
            )}
          </div>

          {/* Hourly Forecast */}
          <div className="max-w-4xl mx-auto mb-8">
            {currentForecast && currentForecast.hourlyForecast && currentForecast.hourlyForecast.length > 0 && (
              <HourlyForecast
                forecasts={currentForecast.hourlyForecast}
                locationName={currentForecast.spot.name}
              />
            )}
          </div>

          {/* Two-column layout for Dark Hours and Fun Facts */}
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mb-8">
            {/* Dark Hours Info */}
            {currentForecast && (
              <DarkHoursInfo
                latitude={currentForecast.spot.latitude}
                locationName={currentForecast.spot.name}
              />
            )}

            {/* Fun Facts */}
            <FunfactPanel funfacts={FUNFACTS.slice(0, 3)} />
          </div>

          {/* Premium CTA (only for free users) */}
          {!isPremium && (
            <div className="max-w-4xl mx-auto mb-8">
              <PremiumCTA />
            </div>
          )}

          {/* CTA to Live Map */}
          <div className="max-w-4xl mx-auto text-center">
            <Link
              href="/live"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-primary/50"
            >
              <MapIcon className="w-5 h-5" />
              Se live kart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
