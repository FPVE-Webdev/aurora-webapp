'use client';

import { useState, useEffect } from 'react';
import { useAuroraData } from '@/hooks/useAuroraData';
import { useSiteAIDecision } from '@/hooks/useSiteAIDecision';
import { HourlyForecast } from '@/components/aurora/HourlyForecast';
import { SpotSelector } from '@/components/map/SpotSelector';
import { StatusBanner } from '@/components/forecast/StatusBanner';
import { GuideLinks } from '@/components/forecast/GuideLinks';
import { BestViewingWindowCard } from '@/components/forecast/BestViewingWindowCard';
import { ConditionsSummaryRow } from '@/components/forecast/ConditionsSummaryRow';
import { QuickDecisionCard } from '@/components/forecast/QuickDecisionCard';
import { GeneratedLegend } from '@/components/forecast/GeneratedLegend';
import { Loader2, ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { usePremium } from '@/contexts/PremiumContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { FORECAST_TIER_CONFIG } from '@/lib/features/liveTierConfig';
import { validateForecastData, logValidationResults } from '@/lib/forecastValidator';

export default function ForecastPage() {
  const { t } = useLanguage();
  const [expandDetails, setExpandDetails] = useState(true);

  const {
    spotForecasts,
    selectedSpot,
    selectSpot,
    currentKp,
    isLoading,
    lastUpdate,
    error
  } = useAuroraData();

  const searchParams = useSearchParams();
  const spotIdParam = searchParams.get('spotId') || searchParams.get('location');

  // Check if user has premium access
  const { isPremium, subscriptionTier } = usePremium();

  // Handle URL parameter for spot selection
  useEffect(() => {
    if (spotIdParam && spotForecasts.length > 0) {
      const spotFromUrl = spotForecasts.find(f => f.spot.id === spotIdParam)?.spot;
      if (spotFromUrl && spotFromUrl.id !== selectedSpot.id) {
        selectSpot(spotFromUrl);
      }
    }
  }, [spotIdParam, spotForecasts, selectSpot, selectedSpot.id]);

  // Get forecast for selected spot
  const currentForecast = spotForecasts.find(f => f.spot.id === selectedSpot.id) || spotForecasts[0];

  // Fetch Site-AI decision for the current forecast (identical to /live calculation)
  // KP trend is auto-detected from hourly forecast data
  const { decision: siteAIDecision, isLoading: siteAILoading } = useSiteAIDecision(
    currentForecast?.hourlyForecast,
    Math.round(currentKp)
  );

  // Validate forecast data consistency
  useEffect(() => {
    if (currentForecast && siteAIDecision) {
      const validation = validateForecastData(currentForecast, siteAIDecision);
      logValidationResults(validation, 'forecast-page');
    }
  }, [currentForecast, siteAIDecision]);

  // Consolidated loading and error states
  if (isLoading && spotForecasts.length === 0) {
    return (
      <div className="min-h-screen bg-arctic-900">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-primary/20 to-transparent blur-3xl" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="text-white/70">{t('loadingForecasts')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-arctic-900">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-primary/20 to-transparent blur-3xl" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-red-400 text-5xl">⚠️</div>
            <h2 className="text-xl font-semibold text-white">{t('couldNotLoadForecasts')}</h2>
            <p className="text-white/60">{error}</p>
            <Link href="/" className="text-primary hover:text-primary/80">
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arctic-900">
      {/* Aurora glow effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-primary/20 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('back')}</span>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
              <Calendar className="w-7 h-7 text-primary" />
              {t('auroraForecast')}
            </h1>
            <p className="text-white/60 mt-1 text-sm">
              {t('forecastMode')} • {format(new Date(lastUpdate), 'dd. MMM yyyy HH:mm', { locale: nb })}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Best Viewing Window - PRIMARY HERO (Above Location Selector) */}
          {siteAIDecision && siteAIDecision.bestWindow && (
            <BestViewingWindowCard
              bestWindow={siteAIDecision.bestWindow}
              isHistorical={false}
            />
          )}

          {/* Location Selector - ALWAYS VISIBLE (Hero Element) */}
          {currentForecast && (
            <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-4">
              <SpotSelector
                selectedSpot={currentForecast.spot}
                onSelectSpot={selectSpot}
              />

              {/* Weather Data Row - Under Spot Selector */}
              {currentForecast.hourlyForecast && currentForecast.hourlyForecast.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-xs text-white/50">{t('kpIndex') || 'KP-indeks'}</p>
                      <p className="text-lg font-semibold text-primary">{Math.round(currentKp)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">{t('cloudCover') || 'Sky'}</p>
                      <p className="text-lg font-semibold text-primary">{Math.round(currentForecast.hourlyForecast[0].cloudCoverage)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">{t('temperature') || 'Temp'}</p>
                      <p className="text-lg font-semibold text-primary">{Math.round(currentForecast.hourlyForecast[0].temperature)}°</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">{t('wind') || 'Vind'}</p>
                      <p className="text-lg font-semibold text-primary">{Math.round(currentForecast.weather.windSpeed)} m/s</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Banner - Always visible between Weather Data and Decision Card */}
          {siteAIDecision && (
            <StatusBanner
              state={siteAIDecision.state}
              explanation={siteAIDecision.explanation}
            />
          )}

          {/* Guide Links - Context-aware tromso.ai guides */}
          {currentForecast && (
            <GuideLinks
              spotId={currentForecast.spot.id}
              spotName={currentForecast.spot.name}
            />
          )}

          {/* Quick Decision Card - PRIMARY FOCUS */}
          {siteAIDecision && (
            <QuickDecisionCard
              decision={siteAIDecision}
              isExpanded={expandDetails}
              onToggleExpand={() => setExpandDetails(!expandDetails)}
            />
          )}

          {/* Collapsible Detailed Forecast Section */}
          {expandDetails && (
            <div className="space-y-6 animate-fadeIn">
              {/* Conditions Summary Row - using hour-0 weather from hourly forecast */}
              {currentForecast && currentForecast.hourlyForecast && currentForecast.hourlyForecast.length > 0 && (
                <ConditionsSummaryRow
                  kpIndex={currentKp}
                  cloudCover={currentForecast.hourlyForecast[0].cloudCoverage}
                  temperature={currentForecast.hourlyForecast[0].temperature}
                  windSpeed={currentForecast.weather.windSpeed}
                />
              )}

              {/* Hourly Forecast - Limited to 24 hours for /forecast */}
              {currentForecast && currentForecast.hourlyForecast && currentForecast.hourlyForecast.length > 0 ? (
                <HourlyForecast
                  forecasts={currentForecast.hourlyForecast}
                  locationName={currentForecast.spot.name}
                  subscriptionTier={subscriptionTier}
                  maxHours={FORECAST_TIER_CONFIG[subscriptionTier].maxForecastHours}
                />
              ) : (
                <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-8 text-center">
                  <p className="text-white/60">{t('noHourlyForecast')}</p>
                </div>
              )}

              {/* Generated Legend - Data-driven */}
              {siteAIDecision && (
                <GeneratedLegend windows={siteAIDecision.windows} />
              )}

              {/* Forecast Disclaimer */}
              <div className="card-aurora bg-primary/5 rounded-lg border border-primary/20 p-4 text-xs text-white/70 text-center">
                <p>
                  🗓️ {t('forecastMode')} shows trends and planning insight. Live conditions may differ.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
