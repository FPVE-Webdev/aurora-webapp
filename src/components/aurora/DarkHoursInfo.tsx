/**
 * Dark Hours Info Component
 *
 * Displays when it's dark enough to see aurora based on latitude and season
 * Shows twilight phase, dark hours, and best viewing time information
 */

'use client';

import { Moon, Clock } from 'lucide-react';
import { getDarkHours, calculateTwilightPhase } from '@/lib/calculations/sunCalculations';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface DarkHoursInfoProps {
  latitude: number;
  locationName: string;
}

export function DarkHoursInfo({ latitude, locationName }: DarkHoursInfoProps) {
  const { t } = useLanguage();
  const darkHours = getDarkHours(latitude);
  const twilight = calculateTwilightPhase(latitude);

  const getTwilightLabel = () => {
    switch (twilight.phase) {
      case 'day':
        return t('daylightTooLight');
      case 'civil':
        return t('civilTwilightStillLight');
      case 'nautical':
        return t('nauticalTwilightFaint');
      case 'astronomical':
        return t('astronomicalTwilightGood');
      case 'night':
        return t('nightOptimal');
      default:
        return t('unknown');
    }
  };

  const formatDarkHours = () => {
    if (darkHours.start === 0 && darkHours.end === 24) {
      return t('darkAllDay');
    }
    const startStr = darkHours.start.toString().padStart(2, '0');
    const endStr = darkHours.end.toString().padStart(2, '0');
    return `${startStr}:00 - ${endStr}:00`;
  };

  return (
    <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-4 hover:border-primary/30 transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center gap-2 mb-3">
        <Moon className={cn(
          "w-5 h-5",
          twilight.canSeeAurora ? "text-primary animate-pulse" : "text-yellow-400"
        )} />
        <h3 className="font-semibold text-white">
          {t('lightConditions')}
        </h3>
        <span className="text-xs text-white/60 bg-white/5 px-2 py-0.5 rounded-full">
          {locationName}, {latitude.toFixed(1)}°N
        </span>
      </div>

      {/* Current Status */}
      <div className={cn(
        'mt-3 rounded-lg p-3',
        twilight.canSeeAurora ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'
      )}>
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium text-sm',
            twilight.canSeeAurora ? 'text-green-400' : 'text-yellow-400'
          )}>
            {getTwilightLabel()}
          </span>
        </div>
      </div>

      {/* Dark Hours */}
      <div className="mt-3 p-3 bg-primary/10 rounded-lg">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <div className="flex-1">
            <p className="text-xs text-white/60">{t('darkHours')}</p>
            <p className="font-medium text-sm text-white">{formatDarkHours()}</p>
          </div>
        </div>
      </div>

      {/* Best observation hint */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-xs text-white/60 flex items-start gap-1">
          <span className="text-primary">💡</span>
          <span>
            {darkHours.start === 0 && darkHours.end === 24
              ? t('polarNightBestTime')
              : t('bestWhenSunBelow6')
            }
          </span>
        </p>
      </div>
    </div>
  );
}
