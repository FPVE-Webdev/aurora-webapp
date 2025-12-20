/**
 * Hourly Forecast Component
 *
 * Displays 12-hour aurora probability forecast with cloud cover and temperature
 * Shows color-coded probability levels (excellent/good/moderate/poor)
 */

'use client';

import { memo } from 'react';
import { HourlyForecast as HourlyForecastType } from '@/types/aurora';
import { getProbabilityLevel } from '@/lib/auroraCalculations';
import { cn } from '@/lib/utils';
import { Cloud, Thermometer, MapPin } from 'lucide-react';

interface HourlyForecastProps {
  forecasts: HourlyForecastType[];
  locationName?: string;
}

function HourlyForecastComponent({ forecasts, locationName }: HourlyForecastProps) {
  const hours = forecasts.length;
  const forecastLabel = hours <= 6 ? '6-timers prognose' : `${hours}-timers prognose`;

  return (
    <div className="card-aurora relative overflow-hidden bg-arctic-800/50 rounded-lg border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/70">
          {forecastLabel}
        </h3>
        {locationName && (
          <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <MapPin className="w-3 h-3" />
            {locationName}
          </span>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide relative">
        {forecasts.map((forecast, index) => {
          const level = getProbabilityLevel(forecast.probability);

          return (
            <div
              key={forecast.hour}
              className={cn(
                'flex-shrink-0 w-20 rounded-lg p-3 text-center transition-all relative',
                'animate-slide-up',
                index === 0 && 'ring-2 ring-primary/50',
                level === 'excellent' && 'bg-aurora-excellent/20 border border-green-500/30',
                level === 'good' && 'bg-purple-500/20 border border-purple-400/30',
                level === 'moderate' && 'bg-orange-500/20 border border-orange-400/30',
                level === 'poor' && 'bg-arctic-700 border border-white/10'
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <p className="text-xs text-white/60 mb-1 relative z-10">
                {index === 0 ? 'Nå' : forecast.hour}
              </p>
              <p className={cn(
                'text-xl font-display font-bold relative z-10',
                level === 'excellent' && 'text-green-400',
                level === 'good' && 'text-purple-400',
                level === 'moderate' && 'text-orange-400',
                level === 'poor' && 'text-white/60'
              )}>
                {forecast.probability}%
              </p>
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-white/60 relative z-10">
                <Cloud className="w-3 h-3" />
                <span>{Math.round(forecast.cloudCoverage)}%</span>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-white/60 relative z-10">
                <Thermometer className="w-3 h-3" />
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
