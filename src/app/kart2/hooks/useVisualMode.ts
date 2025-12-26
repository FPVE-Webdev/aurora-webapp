/**
 * Visual Mode State Management
 *
 * Controls the Visual Mode toggle state with localStorage persistence.
 *
 * CRITICAL: This is read-only state management.
 * Visual Mode does NOT modify Kart2 data or logic.
 */

'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'kart2-visual-mode-enabled';

export function useVisualMode() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Hydration safety
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    setIsEnabled(stored === 'true');
  }, []);

  const toggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(newValue));
    }
  };

  return {
    isEnabled: isClient ? isEnabled : false,
    toggle,
    isClient
  };
}
