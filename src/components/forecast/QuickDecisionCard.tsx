/**
 * Quick Decision Card Component
 *
 * Primary decision interface for the forecast page.
 * Shows the user at a glance whether they should go out now or wait.
 */

'use client';

import { SiteAIDecision } from '@/types/siteAI';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format, isToday as isTodayFn } from 'date-fns';
import { nb } from 'date-fns/locale';

interface QuickDecisionCardProps {
  decision: SiteAIDecision;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function QuickDecisionCard({
  decision,
  isExpanded,
  onToggleExpand
}: QuickDecisionCardProps) {
  const { t } = useLanguage();

  // Determine decision status and styling
  const getDecisionInfo = () => {
    switch (decision.state) {
      case 'excellent':
        return {
          emoji: '✅',
          status: t('excellent') || 'Excellent',
          actionText: t('goNow') || 'Go now!',
          backgroundColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          textColor: 'text-green-400',
          accentColor: 'text-green-500'
        };
      case 'possible':
        return {
          emoji: '⏱️',
          status: t('possible') || 'Possible',
          actionText: t('waitForOptimalTime') || 'Wait for optimal time',
          backgroundColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          textColor: 'text-amber-400',
          accentColor: 'text-amber-500'
        };
      case 'unlikely':
      default:
        return {
          emoji: '❌',
          status: t('unlikely') || 'Unlikely',
          actionText: t('notRecommended') || 'Not recommended today',
          backgroundColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          textColor: 'text-red-400',
          accentColor: 'text-red-500'
        };
    }
  };

  const info = getDecisionInfo();
  const bestWindow = decision.bestWindow;
  const startTime = new Date(bestWindow.start);
  const endTime = new Date(bestWindow.end);

  // Format day context: "I dag" (today) or day name (e.g., "Mandag")
  const dayLabel = isTodayFn(startTime)
    ? t('today') || 'I dag'
    : format(startTime, 'EEEE', { locale: nb });
  const dayDisplay = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);

  return (
    <div
      className={`card-aurora relative overflow-hidden rounded-lg border-2 p-6 transition-all ${info.backgroundColor} ${info.borderColor}`}
    >
      {/* Gradient background accent */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{
          background: decision.state === 'excellent' ? '#10b981' : decision.state === 'possible' ? '#f59e0b' : '#ef4444'
        }}
      />

      <div className="relative z-10">
        {/* Status row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl">{info.emoji}</div>
          <div className="flex-1">
            <h2 className={`text-2xl font-display font-bold ${info.textColor}`}>
              {info.status}
            </h2>
            <p className="text-white/70 text-sm mt-1">
              {info.actionText}
            </p>
          </div>
        </div>

        {/* Best time window */}
        <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
            {t('recommendedTime') || 'Recommended Time'}
          </h3>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-white/50 mb-1">From</p>
              <p className={`text-lg font-semibold ${info.accentColor}`}>
                {format(startTime, 'HH:mm', { locale: nb })}
              </p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex-1">
              <p className="text-xs text-white/50 mb-1">To</p>
              <p className={`text-lg font-semibold ${info.accentColor}`}>
                {format(endTime, 'HH:mm', { locale: nb })}
              </p>
            </div>
          </div>

          {/* Day context */}
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="text-xs text-white/60">
              {dayDisplay}
            </p>
          </div>

          {/* ADS Score and confidence */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/50">Confidence (ADS)</p>
              <p className={`text-2xl font-bold ${info.accentColor}`}>
                {Math.round(bestWindow.probabilityFromForecast ?? bestWindow.ads)}%
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-white/50">Limiting Factor</p>
              <p className="text-sm font-medium text-white/80 capitalize">
                {bestWindow.limitingFactor.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={onToggleExpand}
          className="w-full mt-6 pt-6 border-t border-white/10 flex items-center justify-between text-white/70 hover:text-white transition-colors group"
        >
          <span className="text-xs font-semibold uppercase tracking-widest">
            {isExpanded ? t('hideDetails') || 'Hide Details' : t('showDetails') || 'Show Details'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronDown className="w-5 h-5 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>
    </div>
  );
}
