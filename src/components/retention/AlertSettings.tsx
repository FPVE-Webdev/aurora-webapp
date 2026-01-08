'use client';

import { Bell, BellOff, Zap, AlertCircle } from 'lucide-react';
import { useRetention } from '@/contexts/RetentionContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function AlertSettings() {
  const { alertPreference, setAlertPreference } = useRetention();
  const { t } = useLanguage();

  const options = [
    {
      id: 'strict' as const,
      icon: Zap,
      title: t('strictMode'),
      description: t('strictModeDesc'),
      color: 'text-primary',
      bgColor: 'bg-primary/20',
      borderColor: 'border-primary/30',
    },
    {
      id: 'eager' as const,
      icon: Bell,
      title: t('eagerMode'),
      description: t('eagerModeDesc'),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
    },
    {
      id: 'off' as const,
      icon: BellOff,
      title: t('off'),
      description: t('offDesc'),
      color: 'text-white/60',
      bgColor: 'bg-white/5',
      borderColor: 'border-white/10',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-arctic-800/50 to-arctic-900/50 rounded-xl p-6 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-white font-semibold">{t('smartAlerts')}</h3>
          <p className="text-white/60 text-sm">{t('chooseWhenToAlert')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = alertPreference === option.id;

          return (
            <button
              key={option.id}
              onClick={() => setAlertPreference(option.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? `${option.bgColor} ${option.borderColor}`
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? option.color : 'text-white/60'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold ${isSelected ? 'text-white' : 'text-white/70'}`}>
                      {option.title}
                    </h4>
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/30 text-primary border border-primary/50">
                        {t('active')}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${isSelected ? 'text-white/80' : 'text-white/50'}`}>
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info box about future features */}
      <div className="mt-6 flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-300">
          <p className="font-medium mb-1">{t('comingSoon')}</p>
          <p className="text-blue-300/80">
            {t('pushAndSmsComingSoon')}
          </p>
        </div>
      </div>
    </div>
  );
}
