/**
 * Weather Mode Hook for /kart2
 *
 * Controls cloud/weather layer visibility independently from aurora (Visual Mode)
 *
 * SEPARATION:
 * - Visual Mode = Aurora animation (80-300km altitude)
 * - Weather Mode = Cloud/weather animation (0-12km altitude)
 *
 * Both can be toggled independently for user control
 */

'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'kart2-weather-mode-enabled';

export function useWeatherMode() {
  const [isEnabled, setIsEnabled] = useState(true); // Default ON
  const [isClient, setIsClient] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    setIsClient(true);

    // Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    const enabledFromStorage = stored !== null ? stored === 'true' : true; // Default true

    setIsEnabled(enabledFromStorage);
  }, []);

  const toggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(newValue));
    }
  };

  return {
    isEnabled: isClient && isEnabled,
    toggle,
    isClient,
  };
}
