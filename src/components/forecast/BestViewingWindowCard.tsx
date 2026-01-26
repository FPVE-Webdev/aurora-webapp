'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { SiteAIBestWindow } from '@/types/siteAI';
import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

interface BestViewingWindowCardProps {
  bestWindow: SiteAIBestWindow;
  isHistorical?: boolean;
}

export function BestViewingWindowCard({
  bestWindow,
  isHistorical = false
}: BestViewingWindowCardProps) {
  const { t } = useLanguage();

  const getClassificationConfig = () => {
    switch (bestWindow.classification) {
      case 'excellent':
        return {
          label: t('excellent'),
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/40'
        };
      case 'good':
        return {
          label: t('good'),
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/20',
          borderColor: 'border-emerald-500/40'
        };
      case 'moderate':
        return {
          label: t('moderate'),
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/40'
        };
      case 'poor':
        return {
          label: t('poor'),
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/20',
          borderColor: 'border-slate-500/40'
        };
    }
  };

  const config = getClassificationConfig();

  const startTime = new Date(bestWindow.start);
  const endTime = new Date(bestWindow.end);

  const startHour = startTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const endHour = endTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const getLimitingFactorText = () => {
    switch (bestWindow.limitingFactor) {
      case 'cloud_cover':
        return 'Clouds are the limiting factor';
      case 'low_kp':
        return 'Solar activity is the limiting factor';
      case 'too_bright':
        return 'Sky brightness limits viewing';
      case 'mixed_conditions':
        return 'Mixed conditions limit viewing';
    }
  };

  const isUpcoming = startTime > new Date();

  return (
    <div
      className={cn(
        'rounded-lg border p-6 relative overflow-hidden',
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wide mb-1">
              {t('bestViewingTime')}
            </h3>
            <p className={cn('text-xs', config.color)}>
              {config.label} • {bestWindow.ads}% ADS
            </p>
          </div>
          {isUpcoming && (
            <div className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">
              Upcoming
            </div>
          )}
        </div>

        {/* Time Range */}
        <div className="flex items-center gap-3 py-2">
          <Clock className={cn('w-5 h-5', config.color)} />
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{startHour}</span>
            <span className={cn('text-lg', config.color)}>→</span>
            <span className="text-2xl font-bold text-white">{endHour}</span>
          </div>
        </div>

        {/* Quality Indicator */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Quality</span>
            <span className={cn('font-semibold', config.color)}>
              {bestWindow.ads}%
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                config.color.replace('text-', 'bg-')
              )}
              style={{ width: `${bestWindow.ads}%` }}
            />
          </div>
        </div>

        {/* Limiting Factor */}
        {isHistorical && (
          <div className="flex gap-2 items-start pt-2 border-t border-white/10">
            <AlertCircle className="w-4 h-4 text-white/50 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/60">
              {getLimitingFactorText()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
