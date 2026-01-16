/**
 * Best Time Window Component
 *
 * Displays the optimal viewing window for aurora with quality indicator
 */

'use client';

import { memo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BestTimeWindowProps {
  startHour: string;
  endHour: string;
  probability: number;
  className?: string;
}

function BestTimeWindowComponent({
  startHour,
  endHour,
  probability,
  className
}: BestTimeWindowProps) {
  const { t } = useLanguage();

  // Determine quality level
  const getQualityLevel = () => {
    if (probability >= 70) return { labelKey: 'excellent', color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/40' };
    if (probability >= 50) return { labelKey: 'good', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/40' };
    if (probability >= 30) return { labelKey: 'moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/40' };
    return { labelKey: 'low', color: 'text-white/60', bgColor: 'bg-arctic-700', borderColor: 'border-white/10' };
  };

  const quality = getQualityLevel();

  return (
    <div className={cn(
      'rounded-lg border-2 p-4 relative overflow-hidden',
      quality.bgColor,
      quality.borderColor,
      className
    )}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 text-center">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <h4 className="text-sm font-bold text-primary uppercase tracking-wider">
            {t('bestViewingTime')}
          </h4>
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
        </div>

        {/* Time Range */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold text-white">{startHour}</span>
          </div>
          <span className="text-primary text-xl">→</span>
          <span className="text-2xl font-bold text-white">{endHour}</span>
        </div>

        {/* Quality Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">{t('quality')}</span>
            <span className={cn('font-semibold', quality.color)}>
              {t(quality.labelKey as any)} ({probability}%)
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                quality.color.replace('text-', 'bg-')
              )}
              style={{ width: `${probability}%` }}
            />
          </div>
        </div>

        {/* Recommendation */}
        {probability >= 50 && (
          <p className="text-xs text-center text-white/70 pt-2 border-t border-white/10">
            🎯 {t('highProbabilityWindow')}
          </p>
        )}
      </div>
    </div>
  );
}

export const BestTimeWindow = memo(BestTimeWindowComponent);
