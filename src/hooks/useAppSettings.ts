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
        const response = await fetch('/api/settings');
        if (response.ok) {
          // Check if response has content before trying to parse JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const text = await response.text();
            if (text) {
              const data = JSON.parse(text);
              setSettings(data);
            }
          }
        } else {
          // API endpoint doesn't exist or returned error - use defaults
          console.log('Using default settings (API endpoint not available)');
        }
      } catch {
        // Silently fall back to default settings
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return { settings, isLoading };
}
