/**
 * Visual Mode State Management with Feature Flag & Guardrails
 *
 * FEATURE FLAG:
 * - Default: OFF
 * - Enable via: query param (?visual=1), localStorage, or manual toggle
 * - Auto-disable on: FPS < 20 > 5s, WebGL context loss, prefers-reduced-motion
 *
 * GUARDRAILS:
 * - Silent fail on external errors (AI, network)
 * - No console errors in production
 * - Respects user accessibility preferences
 *
 * CRITICAL: This is read-only state management.
 * Visual Mode does NOT modify Kart2 data or logic.
 */

'use client';

import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'kart2-visual-mode-enabled';
const QUERY_PARAM = 'visual';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function useVisualMode() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isAutoDisabled, setIsAutoDisabled] = useState(false);
  const lowFpsCountRef = useRef(0);
  const lowFpsStartTimeRef = useRef<number | null>(null);

  // Initialize from localStorage and query params
  useEffect(() => {
    setIsClient(true);

    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    let enabledFromStorage = stored === 'true';

    // Check query parameter (?visual=1)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryEnabled = params.get(QUERY_PARAM) === '1';
      if (queryEnabled) {
        enabledFromStorage = true;
      }
    }

    setIsEnabled(enabledFromStorage);
  }, []);

  // Monitor prefers-reduced-motion
  useEffect(() => {
    if (!isClient) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = () => {
      if (mediaQuery.matches) {
        // User prefers reduced motion - auto-disable Visual Mode
        setIsAutoDisabled(true);
        setIsEnabled(false);
      } else {
        setIsAutoDisabled(false);
        // Re-enable if it was manually enabled before
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'true') {
          setIsEnabled(true);
        }
      }
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isClient]);

  const toggle = () => {
    if (isAutoDisabled) {
      // Prevent manual toggle if auto-disabled
      if (!IS_PRODUCTION) {
        console.warn('[VisualMode] Cannot toggle: auto-disabled due to low FPS or context loss');
      }
      return;
    }

    const newValue = !isEnabled;
    setIsEnabled(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(newValue));
    }
  };

  /**
   * Call this from VisualModeCanvas render loop to monitor FPS
   * Returns true if Visual Mode should auto-disable due to low FPS
   */
  const checkFpsHealth = (currentFps: number): boolean => {
    const FPS_THRESHOLD = 20;
    const LOW_FPS_DURATION_MS = 5000; // 5 seconds

    if (currentFps < FPS_THRESHOLD) {
      // FPS is low
      if (!lowFpsStartTimeRef.current) {
        lowFpsStartTimeRef.current = Date.now();
      }

      const duration = Date.now() - lowFpsStartTimeRef.current;
      if (duration > LOW_FPS_DURATION_MS) {
        // Low FPS for > 5 seconds - auto-disable
        setIsAutoDisabled(true);
        setIsEnabled(false);
        if (!IS_PRODUCTION) {
          console.warn(`[VisualMode] Auto-disabled: FPS ${currentFps.toFixed(1)} < ${FPS_THRESHOLD} for ${(duration / 1000).toFixed(1)}s`);
        }
        return true;
      }
    } else {
      // FPS is healthy - reset counter
      lowFpsStartTimeRef.current = null;
    }

    return false;
  };

  /**
   * Call this from VisualModeCanvas if WebGL context is lost
   * Returns true if Visual Mode was auto-disabled
   */
  const handleContextLoss = (): boolean => {
    setIsAutoDisabled(true);
    setIsEnabled(false);
    if (!IS_PRODUCTION) {
      console.warn('[VisualMode] Auto-disabled: WebGL context loss detected');
    }
    return true;
  };

  return {
    isEnabled: isClient && isEnabled && !isAutoDisabled,
    toggle,
    isClient,
    isAutoDisabled,
    checkFpsHealth,
    handleContextLoss
  };
}
