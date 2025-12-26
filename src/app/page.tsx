'use client';

import { useState, useEffect } from 'react';
import { useAuroraData } from '@/hooks/useAuroraData';
import { ProbabilityGauge } from '@/components/aurora/ProbabilityGauge';
import { AuroraStatusCard } from '@/components/aurora/AuroraStatusCard';
import { QuickStats } from '@/components/aurora/QuickStats';
import { HourlyForecast } from '@/components/aurora/HourlyForecast';
import { DarkHoursInfo } from '@/components/aurora/DarkHoursInfo';
import { FunfactPanel } from '@/components/aurora/FunfactPanel';
import { GoNowAlert } from '@/components/home/GoNowAlert';
import { PremiumCTA } from '@/components/shared/PremiumCTA';
import { ExtendedMetrics } from '@/components/aurora/ExtendedMetrics';
import { Loader2, MapIcon } from 'lucide-react';
import Link from 'next/link';
import { FUNFACTS } from '@/lib/funfactEngine';
import { shouldShowGoNow } from '@/lib/auroraCalculations';
import { usePremium } from '@/contexts/PremiumContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { ExtendedMetrics as ExtendedMetricsType } from '@/types/tromsoAI';

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
  const { settings } = useAppSettings();
  const [extendedMetrics, setExtendedMetrics] = useState<ExtendedMetricsType | null>(null);

  // Fetch extended metrics (Phase 2 feature)
  useEffect(() => {
    async function fetchExtendedMetrics() {
      try {
        const response = await fetch('/api/aurora/tonight?lang=no');

        if (!response.ok) return;

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;

        const text = await response.text();
        if (!text) return;

        const data = JSON.parse(text) as { extended_metrics?: ExtendedMetricsType };

        if (data.extended_metrics) {
          setExtendedMetrics(data.extended_metrics);
        }
      } catch (error) {
        console.error('Failed to fetch extended metrics:', error);
      }
    }

    fetchExtendedMetrics();
    const interval = setInterval(fetchExtendedMetrics, 30 * 60 * 1000); // Update every 30 minutes
    return () => clearInterval(interval);
  }, []);

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
        {/* Aurora glow effect with animation */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
          <div className="absolute top-40 right-1/4 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s', animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12 space-y-6">
            <div className="flex items-center justify-center gap-4">
              <h1 className="text-5xl md:text-7xl font-display font-black text-white drop-shadow-2xl">
                🌌 Nordlys i Tromsø
              </h1>
              {settings.showBetaBadge && (
                <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-primary/20 text-primary border border-primary/30 animate-pulse">
                  BETA
                </span>
              )}
            </div>
            <p className="text-xl text-white/80 max-w-2xl mx-auto font-medium">
              Live nordlysvarsel for Nord-Norge basert på solaktivitet, værmeldinger og geografisk plassering
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-white/10 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">21</div>
                <div className="text-xs text-white/60">Observasjonspunkter</div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">48t</div>
                <div className="text-xs text-white/60">Værprognose</div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">Live</div>
                <div className="text-xs text-white/60">Sanntidsdata</div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <div className="text-xs text-white/50">
                  Oppdatert: {new Date(lastUpdate).toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
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

          {/* Extended Metrics (Phase 2 - Solar Wind Data) */}
          {extendedMetrics && (
            <div className="max-w-4xl mx-auto mb-8">
              <ExtendedMetrics data={extendedMetrics} lang="no" />
            </div>
          )}

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
