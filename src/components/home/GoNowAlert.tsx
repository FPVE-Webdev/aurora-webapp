'use client';

import { Rocket, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface GoNowAlertProps {
  probability: number;
  locationName: string;
}

export function GoNowAlert({ probability, locationName }: GoNowAlertProps) {
  const { t } = useLanguage();

  return (
    <div className="relative overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 blur-xl animate-pulse" />

      <div className="relative bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 text-white rounded-2xl p-6 shadow-2xl border-2 border-green-300/50 animate-pulse" style={{ animationDuration: '2s' }}>
        {/* Sparkle effects */}
        <div className="absolute top-2 right-2 animate-spin" style={{ animationDuration: '3s' }}>
          <Sparkles className="w-5 h-5 text-yellow-300" />
        </div>
        <div className="absolute bottom-2 left-2 animate-spin" style={{ animationDuration: '4s' }}>
          <Sparkles className="w-4 h-4 text-yellow-300" />
        </div>

        <div className="flex items-center justify-center gap-4">
          <Rocket className="w-8 h-8 animate-bounce" />
          <div className="text-center">
            <p className="font-black text-2xl mb-1 drop-shadow-lg">
              🌟 {t('goOutNow') || 'Gå ut nå!'} 🌟
            </p>
            <p className="text-lg font-semibold bg-white/20 px-4 py-1 rounded-full inline-block">
              {probability}% {t('chanceIn') || 'sjanse i'} {locationName}
            </p>
          </div>
          <Rocket className="w-8 h-8 animate-bounce" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>
    </div>
  );
}

