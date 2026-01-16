/**
 * Hourly Forecast Component
 *
 * Displays 12-hour aurora probability forecast with cloud cover and temperature
 * Shows color-coded probability levels (excellent/good/moderate/poor)
 */

'use client';

import { memo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { HourlyForecast as HourlyForecastType } from '@/types/aurora';
import { getProbabilityLevel, AURORA_EMOJI_MAP } from '@/lib/constants/auroraStatus';
import { cn } from '@/lib/utils';
import { Cloud, Thermometer, MapPin } from 'lucide-react';
import { BestTimeWindow } from './BestTimeWindow';
import type { SubscriptionTier } from '@/contexts/PremiumContext';
import { getTierConfig } from '@/lib/features/liveTierConfig';

interface HourlyForecastProps {
  forecasts: HourlyForecastType[];
  locationName?: string;
  subscriptionTier?: SubscriptionTier;
}

function HourlyForecastComponent({ forecasts, locationName, subscriptionTier = 'free' }: HourlyForecastProps) {
  const { t } = useLanguage();

  // Get max hours based on subscription tier
  const tierConfig = getTierConfig(subscriptionTier);
  const maxHours = tierConfig.map.maxForecastHours;

  // Limit forecasts based on tier
  const limitedForecasts = forecasts.slice(0, maxHours);
  const hours = limitedForecasts.length;
  const forecastLabel = hours <= 6 ? t('sixHourForecast') : t('hourForecast').replace('{hours}', hours.toString());

  // Find the best time (highest probability) within limited forecasts
  const bestTimeIndex = limitedForecasts.reduce((bestIdx, forecast, idx, arr) =>
    forecast.probability > arr[bestIdx].probability ? idx : bestIdx
  , 0);

  const bestForecast = limitedForecasts[bestTimeIndex];

  // Calculate best viewing window (3-hour window around best time)
  const bestStartIndex = Math.max(0, bestTimeIndex - 1);
  const bestEndIndex = Math.min(limitedForecasts.length - 1, bestTimeIndex + 1);

  return (
    <div className="card-aurora relative overflow-hidden bg-arctic-800/50 rounded-lg border border-white/5 p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">
          {forecastLabel}
        </h3>
        {locationName && (
          <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <MapPin className="w-3.5 h-3.5" />
            {locationName}
          </span>
        )}
      </div>

      {/* Best Time Window Badge */}
      {bestForecast && bestForecast.probability >= 30 && (
        <BestTimeWindow
          startHour={limitedForecasts[bestStartIndex]?.hour || bestForecast.hour}
          endHour={limitedForecasts[bestEndIndex]?.hour || bestForecast.hour}
          probability={bestForecast.probability}
        />
      )}

      {/* Desktop: 4 cards visible, Mobile: 2 cards visible */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:hidden">
        {limitedForecasts.slice(0, 12).map((forecast, index) => {
          const level = getProbabilityLevel(forecast.probability);
          const isBestTime = index === bestTimeIndex;

          // Get color based on probability
          const getBorderColor = () => {
            if (level === 'excellent') return '#10b981'; // green-500
            if (level === 'good') return '#14b8a6'; // teal-500
            if (level === 'moderate') return '#f59e0b'; // amber-500
            return '#6b7280'; // gray-500
          };

          return (
            <div
              key={forecast.hour}
              className={cn(
                'rounded-lg p-3 text-center transition-all relative overflow-hidden',
                'animate-slide-up hover:scale-105 duration-300 border-l-4',
                isBestTime && 'ring-2 ring-yellow-400/60 shadow-lg shadow-yellow-400/20',
                index === 0 && !isBestTime && 'ring-2 ring-primary/50',
                level === 'excellent' && 'bg-green-500/20 border border-green-500/40',
                level === 'good' && 'bg-emerald-500/20 border border-emerald-400/40',
                level === 'moderate' && 'bg-yellow-500/20 border border-yellow-400/40',
                level === 'poor' && 'bg-arctic-700 border border-white/10'
              )}
              style={{
                animationDelay: `${index * 0.05}s`,
                borderLeftColor: getBorderColor()
              }}
            >
              {/* Best Time Badge */}
              {isBestTime && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 text-arctic-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                  ⭐ BEST
                </div>
              )}

              <p className="text-xs text-white/60 mb-2 font-medium relative z-10">
                {index === 0 ? 'Nå' : forecast.hour}
              </p>

              {/* Aurora Probability - Large and prominent */}
              <div className="mb-3">
                <p className={cn(
                  'text-2xl font-display font-black relative z-10',
                  level === 'excellent' && 'text-green-400',
                  level === 'good' && 'text-emerald-400',
                  level === 'moderate' && 'text-yellow-400',
                  level === 'poor' && 'text-white/60'
                )}>
                  {forecast.probability}%
                </p>
                <p className="text-[10px] text-white/50">
                  {AURORA_EMOJI_MAP[level]}
                </p>
              </div>

              {/* Cloud Coverage */}
              <div className="flex items-center justify-center gap-1 text-[11px] text-white/60 relative z-10 mb-1">
                <Cloud className="w-3 h-3" />
                <span>{Math.round(forecast.cloudCoverage)}%</span>
              </div>

              {/* Temperature */}
              <div className="flex items-center justify-center gap-1 text-[11px] text-white/60 relative z-10">
                <Thermometer className="w-3 h-3" />
                <span>{Math.round(forecast.temperature)}°</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Horizontal scroll for larger screens */}
      <div className="hidden sm:flex gap-3 overflow-x-auto pb-2 scrollbar-hide relative">
        {limitedForecasts.map((forecast, index) => {
          const level = getProbabilityLevel(forecast.probability);
          const isBestTime = index === bestTimeIndex;

          // Get color based on probability
          const getBorderColor = () => {
            if (level === 'excellent') return '#10b981'; // green-500
            if (level === 'good') return '#14b8a6'; // teal-500
            if (level === 'moderate') return '#f59e0b'; // amber-500
            return '#6b7280'; // gray-500
          };

          return (
            <div
              key={forecast.hour}
              className={cn(
                'flex-shrink-0 w-24 rounded-lg p-4 text-center transition-all relative overflow-hidden border-l-4',
                'animate-slide-up hover:scale-105 duration-300',
                isBestTime && 'ring-2 ring-yellow-400/60 shadow-lg shadow-yellow-400/20',
                index === 0 && !isBestTime && 'ring-2 ring-primary/50',
                level === 'excellent' && 'bg-green-500/20 border border-green-500/40',
                level === 'good' && 'bg-emerald-500/20 border border-emerald-400/40',
                level === 'moderate' && 'bg-yellow-500/20 border border-yellow-400/40',
                level === 'poor' && 'bg-arctic-700 border border-white/10'
              )}
              style={{
                animationDelay: `${index * 0.05}s`,
                borderLeftColor: getBorderColor()
              }}
            >
              {/* Best Time Badge */}
              {isBestTime && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-arctic-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                  ⭐ BEST
                </div>
              )}

              <p className="text-xs text-white/60 mb-2 font-medium relative z-10">
                {index === 0 ? 'Nå' : forecast.hour}
              </p>

              {/* Aurora Probability - Large and prominent */}
              <div className="mb-3">
                <p className={cn(
                  'text-3xl font-display font-black relative z-10',
                  level === 'excellent' && 'text-green-400',
                  level === 'good' && 'text-emerald-400',
                  level === 'moderate' && 'text-yellow-400',
                  level === 'poor' && 'text-white/60'
                )}>
                  {forecast.probability}%
                </p>
                <p className="text-sm mt-1">
                  {AURORA_EMOJI_MAP[level]}
                </p>
              </div>

              {/* Cloud Coverage */}
              <div className="flex items-center justify-center gap-1 text-xs text-white/60 relative z-10 mb-1">
                <Cloud className="w-3.5 h-3.5" />
                <span>{Math.round(forecast.cloudCoverage)}%</span>
              </div>

              {/* Temperature */}
              <div className="flex items-center justify-center gap-1 text-xs text-white/60 relative z-10">
                <Thermometer className="w-3.5 h-3.5" />
                <span>{Math.round(forecast.temperature)}°</span>
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

  // Deep compare forecast data
  return prev.forecasts.every((forecast, idx) => {
    const nextForecast = next.forecasts[idx];
    return forecast.hour === nextForecast.hour &&
           forecast.probability === nextForecast.probability &&
           forecast.cloudCoverage === nextForecast.cloudCoverage &&
           forecast.temperature === nextForecast.temperature;
  });
});
