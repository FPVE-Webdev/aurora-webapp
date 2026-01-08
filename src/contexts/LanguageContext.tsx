'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'no' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Translations
const translations: Record<Language, Record<string, string>> = {
  no: {
    // Navigation & General
    home: 'Hjem',
    map: 'Kart',
    forecast: 'Prognose',
    settings: 'Innstillinger',
    
    // Home page
    goOutNow: 'GÅ UT NÅ!',
    chanceIn: 'sjanse i',
    probabilityNow: 'Sannsynlighet for nordlys nå',
    loadingData: 'Henter nordlysdata...',
    statusExcellent: 'Utmerket!',
    statusGood: 'Gode forhold!',
    statusModerate: 'Moderat',
    statusPoor: 'Dårlige forhold',
    
    // Premium
    upgradeToPremiumTitle: 'Oppgrader til Premium',
    getTheMost: 'Få mest ut av nordlysjakten',
    detailedForecast72h: '72-timers detaljert prognose',
    observationPointsWithGps: '50+ observasjonspunkter med GPS',
    pushAlertsGoodConditions: 'Pushvarsler ved gode forhold',
    darkTimeAndSolar: 'Mørketid og solaktivitet',
    tryPremiumNow: 'Prøv Premium nå',
    onlyPerMonth: 'Kun 49 kr/måned',
    
    // Weather
    temperature: 'Temperatur',
    cloudCover: 'Skydekke',
    kpIndex: 'KP-indeks',
    bestTime: 'Beste tid',
  },
  en: {
    // Navigation & General
    home: 'Home',
    map: 'Map',
    forecast: 'Forecast',
    settings: 'Settings',
    
    // Home page
    goOutNow: 'GO OUT NOW!',
    chanceIn: 'chance in',
    probabilityNow: 'Aurora probability now',
    loadingData: 'Loading aurora data...',
    statusExcellent: 'Excellent!',
    statusGood: 'Good conditions!',
    statusModerate: 'Moderate',
    statusPoor: 'Poor conditions',
    
    // Premium
    upgradeToPremiumTitle: 'Upgrade to Premium',
    getTheMost: 'Get the most from aurora hunting',
    detailedForecast72h: '72-hour detailed forecast',
    observationPointsWithGps: '50+ observation points with GPS',
    pushAlertsGoodConditions: 'Push notifications for good conditions',
    darkTimeAndSolar: 'Dark hours and solar activity',
    tryPremiumNow: 'Try Premium now',
    onlyPerMonth: 'Only $5/month',
    
    // Weather
    temperature: 'Temperature',
    cloudCover: 'Cloud cover',
    kpIndex: 'KP Index',
    bestTime: 'Best time',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en'); // Default to English for tourists

  // Load language from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aurora-language') as Language;
      if (saved && (saved === 'no' || saved === 'en')) {
        setLanguageState(saved);
      }
      // If no saved preference, stay with 'en' default (no browser detection)
    }
  }, []);

  // Save language to localStorage when it changes
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aurora-language', lang);
    }
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
