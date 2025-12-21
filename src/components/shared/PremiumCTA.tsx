'use client';

import { Sparkles, ChevronRight, Clock, MapPin, Bell, Sun } from 'lucide-react';
import { usePremium } from '@/contexts/PremiumContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';

export function PremiumCTA() {
  const { isPremium } = usePremium();
  const { t } = useLanguage();

  if (isPremium) return null;

  return (
    <div className="bg-gradient-to-br from-aurora-purple/20 via-aurora-cyan/10 to-aurora-green/5 border border-aurora-purple/30 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aurora-purple to-aurora-cyan flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white text-lg">
            {t('upgradeToPremiumTitle') || 'Oppgrader til Premium'}
          </h3>
          <p className="text-sm text-gray-300">
            {t('getTheMost') || 'Få mest ut av appen'}
          </p>
        </div>
      </div>

      {/* Benefits List */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-3 text-sm text-white">
          <Clock className="w-4 h-4 text-aurora-cyan shrink-0" />
          <span>{t('detailedForecast72h') || '72 timers detaljert prognose'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-white">
          <MapPin className="w-4 h-4 text-aurora-cyan shrink-0" />
          <span>{t('observationPointsWithGps') || '50+ observasjonspunkter med GPS'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-white">
          <Bell className="w-4 h-4 text-aurora-cyan shrink-0" />
          <span>{t('pushAlertsGoodConditions') || 'Push-varsler ved gode forhold'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-white">
          <Sun className="w-4 h-4 text-aurora-cyan shrink-0" />
          <span>{t('darkTimeAndSolar') || 'Mørketider og solaktivitet'}</span>
        </div>
      </div>

      {/* CTA Button */}
      <Link 
        href="/settings?upgrade=true"
        className="w-full bg-gradient-to-r from-aurora-purple to-aurora-cyan hover:from-aurora-purple/90 hover:to-aurora-cyan/90 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-between group transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="font-semibold">
              {t('tryPremiumNow') || 'Prøv Premium nå'}
            </p>
            <p className="text-sm opacity-80">
              {t('onlyPerMonth') || 'Kun 49 kr/måned'}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 opacity-80 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}

