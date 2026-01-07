'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTemperature } from '@/contexts/TemperatureContext';
import { ArrowLeft, Languages, Thermometer, Info } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { unit, setUnit } = useTemperature();

  const handleLanguageChange = (newLang: 'no' | 'en') => {
    setLanguage(newLang);
    toast.success(newLang === 'no' ? 'Språk endret til norsk' : 'Language changed to English');
  };

  const handleUnitChange = (newUnit: 'C' | 'F') => {
    setUnit(newUnit);
    toast.success(`Temperatureenhet endret til °${newUnit}`);
  };

  return (
    <div className="min-h-screen bg-arctic-900">
      {/* Aurora glow effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-primary/20 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake
          </Link>
          <h1 className="text-4xl font-display font-bold text-white">Innstillinger</h1>
        </div>

        <div className="space-y-6">
          {/* Language Settings */}
          <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <Languages className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Språk</h2>
                <p className="text-sm text-white/60">Velg foretrukket språk</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleLanguageChange('no')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  language === 'no'
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="text-2xl mb-2">🇳🇴</div>
                <div className="font-semibold">Norsk</div>
                <div className="text-xs text-white/60">Norwegian</div>
              </button>

              <button
                onClick={() => handleLanguageChange('en')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  language === 'en'
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="text-2xl mb-2">🇬🇧</div>
                <div className="font-semibold">English</div>
                <div className="text-xs text-white/60">Engelsk</div>
              </button>
            </div>
          </div>

          {/* Temperature Unit Settings */}
          <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <Thermometer className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Temperaturenhet</h2>
                <p className="text-sm text-white/60">Velg Celsius eller Fahrenheit</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleUnitChange('C')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  unit === 'C'
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="text-2xl mb-2">°C</div>
                <div className="font-semibold">Celsius</div>
                <div className="text-xs text-white/60">Grader Celsius</div>
              </button>

              <button
                onClick={() => handleUnitChange('F')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  unit === 'F'
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="text-2xl mb-2">°F</div>
                <div className="font-semibold">Fahrenheit</div>
                <div className="text-xs text-white/60">Grader Fahrenheit</div>
              </button>
            </div>
          </div>

          {/* App Info */}
          <div className="card-aurora bg-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Om appen</h2>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white/60">Versjon</span>
                <span className="text-white font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">Datakilde</span>
                <span className="text-white font-medium">Tromsø.AI + MET.no</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
              <Link
                href="/privacy"
                className="block text-primary hover:text-primary/80 transition-colors"
              >
                Personvern
              </Link>
              <Link
                href="/terms"
                className="block text-primary hover:text-primary/80 transition-colors"
              >
                Vilkår for bruk
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
