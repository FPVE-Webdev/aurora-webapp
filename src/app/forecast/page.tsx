'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuroraData } from '@/hooks/useAuroraData';
import { ProbabilityGauge } from '@/components/aurora/ProbabilityGauge';
import { HourlyForecast } from '@/components/aurora/HourlyForecast';
import { SpotSelector } from '@/components/map/SpotSelector';
import { RegionalView } from '@/components/forecast/RegionalView';
import { Loader2, ArrowLeft, Calendar, Lock } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { MasterStatusCard } from '@/components/aurora/MasterStatusCard';
import { REGIONS, REGION_ORDER } from '@/lib/constants/regions';
import { getAllRegionalForecasts } from '@/lib/calculations/regionalForecast';
import { ViewMode } from '@/types/regions';
import { usePremium } from '@/contexts/PremiumContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTierConfig } from '@/lib/features/liveTierConfig';

export default function ForecastPage() {
  const { t } = useLanguage();
  const {
    spotForecasts,
    selectedSpot,
    selectSpot,
    currentKp,
    isLoading,
    lastUpdate,
    error
  } = useAuroraData();

  const [viewMode, setViewMode] = useState<ViewMode>('regional');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const spotIdParam = searchParams.get('spotId') || searchParams.get('location');

  // Check if user has premium access
  const { isPremium, subscriptionTier } = usePremium();

  // Calculate regional forecasts
  const regionalForecasts = useMemo(() => {
    // Only Troms for launch period
    const regions = [REGIONS['troms']];
    return getAllRegionalForecasts(regions, spotForecasts);
  }, [spotForecasts]);

  // Handle URL parameter for spot selection
  useEffect(() => {
    if (spotIdParam && spotForecasts.length > 0) {
      const spotFromUrl = spotForecasts.find(f => f.spot.id === spotIdParam)?.spot;
      if (spotFromUrl && spotFromUrl.id !== selectedSpot.id) {
        selectSpot(spotFromUrl);
        // If premium user and spot is selected via URL, switch to spot view
        if (isPremium) {
          setViewMode('spots');
        }
      }
    }
  }, [spotIdParam, spotForecasts, selectSpot, selectedSpot.id, isPremium]);

  // Handle region selection
  const handleSelectRegion = (regionId: string) => {
    const region = REGIONS[regionId];
    if (region) {
      setSelectedRegionId(regionId);
      setViewMode('spots');

      // Select first spot in region
      const firstSpotInRegion = spotForecasts.find(sf =>
        region.spots.includes(sf.spot.id)
      );
      if (firstSpotInRegion) {
        selectSpot(firstSpotInRegion.spot);
      }
    }
  };

  // Handle back to regional view
  const handleBackToRegional = () => {
    setViewMode('regional');
    setSelectedRegionId(null);
  };

  // Get forecast for selected spot
  const currentForecast = spotForecasts.find(f => f.spot.id === selectedSpot.id) || spotForecasts[0];

  // Filter spots by selected region
  const visibleSpots = useMemo(() => {
    if (!selectedRegionId) return spotForecasts;
    const region = REGIONS[selectedRegionId];
    return spotForecasts.filter(sf => region.spots.includes(sf.spot.id));
  }, [spotForecasts, selectedRegionId]);

  if (isLoading && spotForecasts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-arctic-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">{t('loadingForecasts')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-arctic-900">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-400 text-5xl">⚠️</div>
          <h2 className="text-xl font-semibold text-white">{t('couldNotLoadForecasts')}</h2>
          <p className="text-white/60">{error}</p>
          <Link href="/" className="text-primary hover:text-primary/80">
            {t('backToHome')}
          </Link>
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Master Status Card */}
        <div className="mb-6">
          <MasterStatusCard />
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {viewMode === 'spots' ? (
            <button
              onClick={handleBackToRegional}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('backToRegions')}
            </button>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('back')}
            </Link>
          )}
          <div className="flex-1">
            <h1 className="text-4xl font-display font-bold text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary" />
              {t('auroraForecast')}
            </h1>
            {viewMode === 'regional' ? (
              <p className="text-white/60 mt-2">
                {t('regionalOverview')}
              </p>
            ) : (
              <p className="text-white/60 mt-2">
                {(() => {
                  const maxHours = getTierConfig(subscriptionTier).map.maxForecastHours;
                  return `${maxHours}-timers prognose for ${currentForecast?.spot.name || ''}`;
                })()}
              </p>
            )}
            <div className="text-sm text-white/50 mt-1">
              {t('lastUpdated')} {format(new Date(lastUpdate), 'dd. MMM yyyy HH:mm', { locale: nb })}
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'regional' ? (
          // Regional View (Free tier)
          <RegionalView
            regionalForecasts={regionalForecasts}
            onSelectRegion={handleSelectRegion}
          />
        ) : viewMode === 'premium-gate' ? (
          // Premium Gate
          <div className="card-aurora bg-arctic-800/50 rounded-2xl border border-white/5 p-12 text-center max-w-2xl mx-auto">
            <div className="mb-6">
              <Lock className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                {t('premiumFeature')}
              </h2>
              <p className="text-white/70">
                {t('detailedForecastsDescription')}
              </p>
            </div>

            <div className="space-y-3 text-left max-w-md mx-auto mb-8">
              <div className="flex items-start gap-3">
                <span className="text-primary mt-1">✓</span>
                <span className="text-white/80">{t('allObservationSpots')}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary mt-1">✓</span>
                <span className="text-white/80">{t('hourDetailedForecast')}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary mt-1">✓</span>
                <span className="text-white/80">{t('weatherDataAndVisibility')}</span>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleBackToRegional}
                className="px-6 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                {t('backToRegions')}
              </button>
              <Link
                href="/premium"
                className="px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/80 transition-colors"
              >
                {t('upgradeToPremiumTitle')}
              </Link>
            </div>
          </div>
        ) : (
          // Spot View (Premium)
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column: Current conditions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Location selector */}
              {currentForecast && (
                <SpotSelector
                  selectedSpot={currentForecast.spot}
                  onSelectSpot={selectSpot}
                />
              )}

              {/* Current probability gauge */}
              {currentForecast && (
                <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-6">
                  <h3 className="text-sm font-medium text-white/70 mb-4">{t('now')}</h3>
                  <div className="flex justify-center">
                    <ProbabilityGauge
                      probability={currentForecast.currentProbability}
                      size="lg"
                      canView={currentForecast.canView}
                      nextViewableTime={currentForecast.nextViewableTime}
                      bestTimeTonight={currentForecast.bestTimeTonight}
                    />
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">{t('kpIndex')}</span>
                      <span className="text-white font-semibold">{currentKp.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">{t('cloudCover')}</span>
                      <span className="text-white font-semibold">{Math.round(currentForecast.weather.cloudCoverage)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">{t('temperature')}</span>
                      <span className="text-white font-semibold">{Math.round(currentForecast.weather.temperature)}°C</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">{t('windSpeed')}</span>
                      <span className="text-white font-semibold">{Math.round(currentForecast.weather.windSpeed)} m/s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Info card */}
              <div className="card-aurora bg-primary/10 rounded-lg border border-primary/20 p-4">
                <h3 className="text-sm font-semibold text-primary mb-2">{t('aboutForecast')}</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  {t('forecastDescription')}
                </p>
              </div>
            </div>

            {/* Right column: Hourly forecast */}
            <div className="lg:col-span-2">
              {currentForecast && currentForecast.hourlyForecast && currentForecast.hourlyForecast.length > 0 ? (
                <HourlyForecast
                  forecasts={currentForecast.hourlyForecast}
                  locationName={currentForecast.spot.name}
                  subscriptionTier={subscriptionTier}
                />
              ) : (
                <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-8 text-center">
                  <p className="text-white/60">{t('noHourlyForecast')}</p>
                </div>
              )}

              {/* Probability legend */}
              <div className="mt-6 card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-4">
                <h3 className="text-sm font-medium text-white/70 mb-4">{t('legend')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="w-full h-3 rounded bg-gradient-to-r from-green-400 to-green-600"></div>
                    <div className="text-xs">
                      <div className="text-white font-medium">{t('excellent70Plus')}</div>
                      <div className="text-white/60">{t('veryGoodConditions')}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-3 rounded bg-gradient-to-r from-purple-400 to-purple-600"></div>
                    <div className="text-xs">
                      <div className="text-white font-medium">{t('good50to69')}</div>
                      <div className="text-white/60">{t('goodOpportunities')}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-3 rounded bg-gradient-to-r from-orange-400 to-orange-600"></div>
                    <div className="text-xs">
                      <div className="text-white font-medium">{t('moderate30to49')}</div>
                      <div className="text-white/60">{t('someChance')}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-3 rounded bg-gradient-to-r from-slate-400 to-slate-600"></div>
                    <div className="text-xs">
                      <div className="text-white font-medium">{t('poor30Minus')}</div>
                      <div className="text-white/60">{t('littleChance')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
