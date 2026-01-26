'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface StatusBannerProps {
  state: 'excellent' | 'possible' | 'unlikely';
  explanation: string;
}

export function StatusBanner({ state, explanation }: StatusBannerProps) {
  const { t } = useLanguage();

  const getStatusConfig = () => {
    switch (state) {
      case 'excellent':
        return {
          emoji: '⭐',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          textColor: 'text-green-100'
        };
      case 'possible':
        return {
          emoji: '🌙',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          textColor: 'text-yellow-100'
        };
      case 'unlikely':
        return {
          emoji: '😴',
          bgColor: 'bg-slate-500/20',
          borderColor: 'border-slate-500/30',
          textColor: 'text-slate-100'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex gap-4 items-start',
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="text-3xl flex-shrink-0">{config.emoji}</div>
      <div className="flex-grow">
        <h2 className={cn('text-lg font-semibold mb-1', config.textColor)}>
          {state === 'excellent' && t('excellent')}
          {state === 'possible' && t('possible')}
          {state === 'unlikely' && t('unlikely')}
        </h2>
        <p className={cn('text-sm leading-relaxed', config.textColor)}>
          {explanation}
        </p>
      </div>
      <div className="flex-shrink-0">
        <Calendar className="w-5 h-5 opacity-60" />
      </div>
    </div>
  );
}
