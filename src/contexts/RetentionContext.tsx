'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserMode = 'tourist' | 'geek';

interface Sighting {
  timestamp: number;
  reported: boolean;
}

interface RetentionContextType {
  // Tourist vs Geek mode
  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;

  // Live viewer count (simulated)
  liveViewers: number;

  // Sightings
  sightings: Sighting[];
  reportSighting: () => void;
  getRecentSightings: () => number;

  // Alert preferences
  alertPreference: 'strict' | 'eager' | 'off';
  setAlertPreference: (pref: 'strict' | 'eager' | 'off') => void;
}

const RetentionContext = createContext<RetentionContextType | undefined>(undefined);

export function RetentionProvider({ children }: { children: ReactNode }) {
  const [userMode, setUserModeState] = useState<UserMode>('tourist');
  const [liveViewers, setLiveViewers] = useState<number>(0);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [alertPreference, setAlertPreferenceState] = useState<'strict' | 'eager' | 'off'>('strict');

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('aurora-user-mode') as UserMode;
      if (savedMode && (savedMode === 'tourist' || savedMode === 'geek')) {
        setUserModeState(savedMode);
      }

      const savedAlertPref = localStorage.getItem('aurora-alert-preference');
      if (savedAlertPref && ['strict', 'eager', 'off'].includes(savedAlertPref)) {
        setAlertPreferenceState(savedAlertPref as 'strict' | 'eager' | 'off');
      }

      // Load sightings from localStorage
      const savedSightings = localStorage.getItem('aurora-sightings');
      if (savedSightings) {
        try {
          setSightings(JSON.parse(savedSightings));
        } catch (e) {
          console.error('Failed to load sightings', e);
        }
      }
    }
  }, []);

  // Simulate live viewer count based on time of day
  useEffect(() => {
    const updateLiveViewers = () => {
      const now = new Date();
      const hour = now.getHours();

      // Base count varies by time
      let baseCount = 150;

      // Peak hours (18:00 - 02:00) - aurora hunting time in Tromsø
      if (hour >= 18 || hour <= 2) {
        baseCount = 800;
      }
      // Evening (15:00 - 18:00)
      else if (hour >= 15 && hour < 18) {
        baseCount = 400;
      }
      // Day time (08:00 - 15:00)
      else if (hour >= 8 && hour < 15) {
        baseCount = 200;
      }
      // Night/early morning (03:00 - 07:00)
      else {
        baseCount = 80;
      }

      // Add random variation (+/- 30%)
      const variation = baseCount * 0.3;
      const randomized = baseCount + (Math.random() * variation * 2 - variation);

      setLiveViewers(Math.floor(randomized));
    };

    updateLiveViewers();

    // Update every 30 seconds with slight variation
    const interval = setInterval(updateLiveViewers, 30000);

    return () => clearInterval(interval);
  }, []);

  // Save mode to localStorage
  const setUserMode = (mode: UserMode) => {
    setUserModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aurora-user-mode', mode);
    }
  };

  // Save alert preference to localStorage
  const setAlertPreference = (pref: 'strict' | 'eager' | 'off') => {
    setAlertPreferenceState(pref);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aurora-alert-preference', pref);
    }
  };

  // Report a sighting
  const reportSighting = () => {
    const newSighting: Sighting = {
      timestamp: Date.now(),
      reported: true,
    };

    const updatedSightings = [...sightings, newSighting];
    setSightings(updatedSightings);

    if (typeof window !== 'undefined') {
      localStorage.setItem('aurora-sightings', JSON.stringify(updatedSightings));
    }
  };

  // Get count of sightings in last 30 minutes
  const getRecentSightings = (): number => {
    const thirtyMinsAgo = Date.now() - (30 * 60 * 1000);
    return sightings.filter(s => s.timestamp > thirtyMinsAgo).length;
  };

  return (
    <RetentionContext.Provider
      value={{
        userMode,
        setUserMode,
        liveViewers,
        sightings,
        reportSighting,
        getRecentSightings,
        alertPreference,
        setAlertPreference,
      }}
    >
      {children}
    </RetentionContext.Provider>
  );
}

export function useRetention() {
  const context = useContext(RetentionContext);
  if (context === undefined) {
    throw new Error('useRetention must be used within a RetentionProvider');
  }
  return context;
}
