/**
 * Generated Legend Component
 *
 * Dynamically generates legend based on actual data rather than hardcoded values.
 * Shows only classifications that exist in the current forecast windows.
 */

'use client';

import { SiteAIWindow } from '@/types/siteAI';
import { useLanguage } from '@/contexts/LanguageContext';

interface GeneratedLegendProps {
  windows: SiteAIWindow[];
}

export function GeneratedLegend({ windows }: GeneratedLegendProps) {
  const { t } = useLanguage();

  // Get unique classifications from windows
  const classifications = Array.from(
    new Set(windows.map(w => w.classification))
  ) as Array<'excellent' | 'good' | 'moderate' | 'poor'>;

  // Sort in descending order (excellent -> good -> moderate -> poor)
  const order = { excellent: 0, good: 1, moderate: 2, poor: 3 };
  classifications.sort((a, b) => order[a] - order[b]);

  // Classification to color and description mapping
  const classificationInfo: Record<'excellent' | 'good' | 'moderate' | 'poor', {
    gradient: string;
    label: string;
    description: string;
  }> = {
    excellent: {
      gradient: 'from-green-400 to-green-600',
      label: t('excellent70Plus') || 'Excellent 70+%',
      description: t('veryGoodConditions') || 'Very good conditions'
    },
    good: {
      gradient: 'from-emerald-400 to-emerald-600',
      label: t('good50to69') || 'Good 50-69%',
      description: t('goodOpportunities') || 'Good opportunities'
    },
    moderate: {
      gradient: 'from-yellow-400 to-yellow-600',
      label: t('moderate30to49') || 'Moderate 30-49%',
      description: t('someChance') || 'Some chance'
    },
    poor: {
      gradient: 'from-slate-400 to-slate-600',
      label: t('poor30Minus') || 'Poor <30%',
      description: t('littleChance') || 'Little chance'
    }
  };

  return (
    <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-4">
      <h3 className="text-sm font-medium text-white/70 mb-4 uppercase tracking-wide">
        {t('legend')}
      </h3>

      {/* If no windows, show full legend */}
      {classifications.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {Object.entries(classificationInfo).map(([key, info]) => (
            <div key={key} className="space-y-2">
              <div className={`w-full h-3 rounded bg-gradient-to-r ${info.gradient}`} />
              <div>
                <div className="text-white font-medium">{info.label}</div>
                <div className="text-white/60 text-[11px]">{info.description}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Show only classifications present in data */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {classifications.map(classification => {
            const info = classificationInfo[classification];
            return (
              <div key={classification} className="space-y-2">
                <div
                  className={`w-full h-3 rounded bg-gradient-to-r ${info.gradient}`}
                />
                <div>
                  <div className="text-white font-medium">{info.label}</div>
                  <div className="text-white/60 text-[11px]">{info.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Count of observations in each classification */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-white/50 mb-2">
          {t('forecastWindows') || 'Forecast Windows'}: {windows.length}
        </p>
        <div className="flex flex-wrap gap-2">
          {classifications.map(classification => {
            const count = windows.filter(w => w.classification === classification).length;
            const percentage = ((count / windows.length) * 100).toFixed(0);

            return (
              <div
                key={classification}
                className="text-[11px] px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70"
              >
                {classification}: {count} ({percentage}%)
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
