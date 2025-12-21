'use client';

import { Rocket } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface GoNowAlertProps {
  probability: number;
  locationName: string;
}

export function GoNowAlert({ probability, locationName }: GoNowAlertProps) {
  const { t } = useLanguage();
  
  return (
    <div className="bg-gradient-to-r from-aurora-green via-aurora-cyan to-aurora-purple text-white rounded-2xl p-5 shadow-xl animate-pulse">
      <div className="flex items-center justify-center gap-3">
        <Rocket className="w-6 h-6" />
        <div className="text-center">
          <p className="font-bold text-lg mb-1">
            {t('goOutNow') || 'Gå ut nå!'}
          </p>
          <p className="text-sm opacity-90">
            {probability}% {t('chanceIn') || 'sjanse i'} {locationName}
          </p>
        </div>
        <Rocket className="w-6 h-6" />
      </div>
    </div>
  );
}

