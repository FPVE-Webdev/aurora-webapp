/**
 * Aurora Probability Gauge Component
 *
 * Enhanced circular gauge with emoji indicators, progress bar, and improved visual hierarchy
 */

'use client';

import { getProbabilityLevel, AURORA_EMOJI_MAP, AURORA_STATUS_LABELS } from '@/lib/constants/auroraStatus';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProbabilityGaugeProps {
  probability: number;
  size?: 'sm' | 'md' | 'lg';
  canView?: boolean;
  nextViewableTime?: Date;
  bestTimeTonight?: Date;
}

export function ProbabilityGauge({
  probability,
  size = 'lg',
  canView = true,
  nextViewableTime,
  bestTimeTonight
}: ProbabilityGaugeProps) {
  const { t } = useLanguage();
  const level = getProbabilityLevel(probability);

  const label = AURORA_STATUS_LABELS[level];
  const emoji = AURORA_EMOJI_MAP[level];

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-48 h-48'
  };

  const fontSizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };

  const emojiFontSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  // Format time helper
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Header Title */}
      {size === 'lg' && (
        <div className="text-center">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2 justify-center">
            🌌 {t('auroraVisibility')}
          </h3>
          <p className="text-xs text-white/60 mt-1">{t('realtimeDataBasedOn')}</p>
        </div>
      )}

      {/* Daylight Notice */}
      {!canView && size === 'lg' && (
        <div className="w-full max-w-xs bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-yellow-300 text-sm font-semibold">
            ☀️ {t('tooLightForAurora')}
          </div>
          {nextViewableTime && (
            <p className="text-xs text-white/70 mt-1">
              {t('nextOpportunity')} {formatTime(nextViewableTime)}
            </p>
          )}
          {bestTimeTonight && (
            <p className="text-xs text-white/70">
              {t('bestTimeTonight')} {formatTime(bestTimeTonight)}
            </p>
          )}
        </div>
      )}

      {/* Main Gauge Circle */}
      <div
        className={cn(
          'rounded-full flex flex-col items-center justify-center transition-all duration-500 animate-scale-in shadow-2xl relative',
          sizeClasses[size],
          level === 'excellent' && 'gauge-excellent',
          level === 'good' && 'gauge-good',
          level === 'moderate' && 'gauge-moderate',
          level === 'poor' && 'gauge-poor'
        )}
      >
        {/* Emoji Indicator */}
        <span className={cn('mb-1', emojiFontSizes[size])}>
          {emoji}
        </span>

        {/* Percentage */}
        <span className={cn('font-display font-black text-white', fontSizes[size])}>
          {probability}%
        </span>

        {/* Sub-label: CHANCE */}
        {size === 'lg' && (
          <span className="text-white/70 text-xs font-medium uppercase tracking-wider">{t('chance')}</span>
        )}

        {/* Label */}
        {size !== 'sm' && (
          <span className="text-white/90 text-sm font-semibold mt-1">{label}</span>
        )}
      </div>

      {/* Progress Bar (only for medium and large sizes) */}
      {size !== 'sm' && (
        <div className="w-full max-w-xs space-y-2">
          <div className="h-3 bg-arctic-800/50 rounded-full overflow-hidden border border-white/10">
            <div
              className={cn(
                'h-full transition-all duration-1000 ease-out',
                level === 'excellent' && 'bg-gradient-to-r from-green-400 to-green-500',
                level === 'good' && 'bg-gradient-to-r from-emerald-400 to-emerald-500',
                level === 'moderate' && 'bg-gradient-to-r from-yellow-400 to-orange-400',
                level === 'poor' && 'bg-gradient-to-r from-blue-400 to-blue-500'
              )}
              style={{ width: `${probability}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/50">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>

          {/* Conditions Indicator */}
          {size === 'lg' && probability >= 50 && (
            <div className="text-center pt-2 border-t border-white/10">
              <p className={cn(
                'text-sm font-semibold flex items-center justify-center gap-2',
                level === 'excellent' && 'text-green-400',
                level === 'good' && 'text-emerald-400',
                level === 'moderate' && 'text-yellow-400'
              )}>
                ✅ {level === 'excellent' ? t('excellentConditions') : level === 'good' ? t('goodConditions') : t('moderateConditions')}
              </p>
              {level === 'excellent' && (
                <p className="text-xs text-white/60 mt-1">{t('goOutNowIfDark')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
