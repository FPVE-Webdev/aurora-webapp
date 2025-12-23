import { useState, useEffect } from 'react';

export interface AppSettings {
  mapMode: 'demo' | 'live';
  devMode: boolean;
  showBetaBadge: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  mapMode: 'demo',
  devMode: false,
  showBetaBadge: true,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch app settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return { settings, isLoading };
}
