/**
 * Hourly Forecast Component - List View
 *
 * Displays 24-hour aurora probability forecast in a clean list format
 * Shows only viable viewing hours (probability >= 30%)
 * Color-coded by probability level (excellent/good/moderate)
 */

'use client';

import { memo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { HourlyForecast as HourlyForecastType } from '@/types/aurora';
import { SiteAIDecision } from '@/types/siteAI';
import { getProbabilityLevel, AURORA_EMOJI_MAP } from '@/lib/constants/auroraStatus';
import { cn } from '@/lib/utils';
import { Cloud, Thermometer, CloudFog, Eye, EyeOff, Zap } from 'lucide-react';
import type { SubscriptionTier } from '@/contexts/PremiumContext';
import { getTierConfig } from '@/lib/features/liveTierConfig';
import { getHourLabelWithDay } from '@/lib/utils/timeLabels';

interface HourlyForecastProps {
  forecasts: HourlyForecastType[];
  locationName?: string;
  subscriptionTier?: SubscriptionTier;
  maxHours?: number; // Optional override for max hours
  siteAIDecision?: SiteAIDecision | null; // Site-AI forecast decision for context
}

function HourlyForecastComponent({ forecasts, locationName, subscriptionTier = 'free', maxHours: customMaxHours, siteAIDecision }: HourlyForecastProps) {
  const { t } = useLanguage();
  const [showViableOnly, setShowViableOnly] = useState(false);

  // Get max hours: use custom value if provided, otherwise use tier config
  const tierConfig = getTierConfig(subscriptionTier);
  const maxHours = customMaxHours ?? tierConfig.map.maxForecastHours;

  // Limit forecasts based on tier
  const limitedForecasts = forecasts.slice(0, maxHours);

  // Filter to show only viable viewing hours (probability >= 30%)
  const viableForecasts = limitedForecasts.filter(f => f.probability >= 30);

  // Choose which forecasts to display based on toggle
  // DEFAULT: Show all hours. TOGGLE: Show only viable hours
  const displayForecasts = showViableOnly ? viableForecasts : limitedForecasts;

  const hours = displayForecasts.length;
  const viableCount = viableForecasts.length;
  const totalCount = limitedForecasts.length;

  const forecastLabel = showViableOnly
    ? viableCount <= 6 ? t('sixHourForecast') : t('hourForecast').replace('{hours}', viableCount.toString())
    : t('hourForecast').replace('{hours}', totalCount.toString());

  // Handle empty state when no forecasts at all
  if (limitedForecasts.length === 0) {
    return (
      <div className="card-aurora relative overflow-hidden bg-arctic-800/50 rounded-lg border border-white/5 p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">
            {t('hourForecast').replace('{hours}', '24')}
          </h3>
        </div>
        <div className="text-center text-white/60 py-8">
          <p>{t('noHourlyForecast') || 'No hourly forecast data available'}</p>
        </div>
      </div>
    );
  }

  // Find the best time (highest probability) within display forecasts
  const bestTimeIndex = displayForecasts.reduce((bestIdx, forecast, idx, arr) =>
    forecast.probability > arr[bestIdx].probability ? idx : bestIdx
  , 0);

  return (
    <div className="card-aurora relative overflow-hidden bg-arctic-800/50 rounded-lg border border-white/5 p-4 sm:p-6 space-y-4">
      {/* Site-AI Context Banner */}
      {siteAIDecision?.bestWindow && (
        <div className="bg-primary/10 border-l-4 border-primary rounded p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-xs font-semibold text-primary">
              Best Viewing Window
            </p>
          </div>
          <p className="text-xs text-white/80">
            {new Date(siteAIDecision.bestWindow.start).toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' })}
            {' '}–{' '}
            {new Date(siteAIDecision.bestWindow.end).toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' })}
            {' • Confidence: '}
            <span className="font-semibold">{siteAIDecision.bestWindow.ads}/100</span>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-white">
            {forecastLabel}
          </h3>
          {showViableOnly && viableCount < totalCount && (
            <p className="text-xs text-white/50">
              {viableCount} viable of {totalCount} hours
            </p>
          )}
        </div>
        {viableCount > 0 && viableCount < totalCount && (
          <button
            onClick={() => setShowViableOnly(!showViableOnly)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            {showViableOnly ? (
              <>
                <Eye className="w-4 h-4" />
                Show all
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                Hide poor
              </>
            )}
          </button>
        )}
      </div>

      {/* List View - Rows of forecast data */}
      <div className="space-y-2">
        {displayForecasts.map((forecast, index) => {
          const level = getProbabilityLevel(forecast.probability);
          const isBestTime = index === bestTimeIndex;

          // Get color based on probability
          const getBgColor = () => {
            if (level === 'excellent') return 'bg-green-500/15';
            if (level === 'good') return 'bg-emerald-500/15';
            if (level === 'moderate') return 'bg-yellow-500/15';
            return 'bg-white/5';
          };

          const getBorderColor = () => {
            if (level === 'excellent') return 'border-l-green-500';
            if (level === 'good') return 'border-l-emerald-500';
            if (level === 'moderate') return 'border-l-amber-500';
            return 'border-l-white/30';
          };

          const getTextColor = () => {
            if (level === 'excellent') return 'text-green-400';
            if (level === 'good') return 'text-emerald-400';
            if (level === 'moderate') return 'text-yellow-400';
            return 'text-white/60';
          };

          return (
            <div
              key={forecast.hour}
              className={cn(
                'flex items-center justify-between gap-4 p-3 rounded-lg transition-all border-l-4',
                'animate-slide-up hover:bg-white/10',
                getBgColor(),
                getBorderColor(),
                isBestTime && 'ring-1 ring-yellow-400/40'
              )}
              style={{
                animationDelay: `${index * 0.05}s`
              }}
            >
              {/* Time + Best Badge */}
              <div className="flex items-center gap-3 min-w-[120px]">
                {isBestTime && (
                  <span className="flex-shrink-0 bg-yellow-400 text-arctic-900 text-[11px] font-bold px-2 py-1 rounded">
                    ⭐ BEST
                  </span>
                )}
                <p className="text-sm font-medium text-white">
                  {getHourLabelWithDay(forecast, index, displayForecasts)}
                </p>
              </div>

              {/* Probability */}
              <div className="flex items-center justify-center min-w-[70px]">
                <p className={cn('text-lg font-bold', getTextColor())}>
                  {forecast.probability}%
                </p>
              </div>

              {/* Cloud Coverage */}
              <div className="flex items-center gap-1.5 min-w-[70px]">
                <Cloud className="w-4 h-4 text-white/60 flex-shrink-0" />
                <span className="text-sm text-white/70">{Math.round(forecast.cloudCoverage)}%</span>
              </div>

              {/* Fog Coverage - show if > 50% */}
              {forecast.fogCoverage !== undefined && forecast.fogCoverage > 50 && (
                <div className="flex items-center gap-1.5 min-w-[70px]">
                  <CloudFog className="w-4 h-4 text-amber-400/70 flex-shrink-0" />
                  <span className="text-sm text-amber-400/70">{Math.round(forecast.fogCoverage)}%</span>
                </div>
              )}

              {/* Temperature */}
              <div className="flex items-center gap-1.5 min-w-[70px]">
                <Thermometer className="w-4 h-4 text-white/60 flex-shrink-0" />
                <span className="text-sm text-white/70">{Math.round(forecast.temperature)}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const HourlyForecast = memo(HourlyForecastComponent, (prev, next) => {
  // Only re-render if forecasts content or location actually changed
  if (prev.locationName !== next.locationName) return false;
  if (prev.forecasts.length !== next.forecasts.length) return false;
  if (prev.siteAIDecision?.bestWindow?.ads !== next.siteAIDecision?.bestWindow?.ads) return false;

  // Deep compare forecast data
  return prev.forecasts.every((forecast, idx) => {
    const nextForecast = next.forecasts[idx];
    return forecast.hour === nextForecast.hour &&
           forecast.probability === nextForecast.probability &&
           forecast.cloudCoverage === nextForecast.cloudCoverage &&
           forecast.fogCoverage === nextForecast.fogCoverage &&
           forecast.temperature === nextForecast.temperature;
  });
});
