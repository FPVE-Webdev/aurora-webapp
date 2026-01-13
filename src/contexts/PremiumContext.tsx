'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';

export type SubscriptionTier = 'free' | 'premium_24h' | 'premium_7d' | 'enterprise';

interface PremiumContextType {
  // State
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;

  // Subscription info
  subscriptionTier: SubscriptionTier;
  expiresAt: number | null; // timestamp in ms
  isExpired: boolean;
  hoursRemaining: number | null;

  // Actions
  setIsPremium: (value: boolean) => void;
  checkSubscriptionStatus: () => Promise<void>;
  unlockFeatures: (tier: SubscriptionTier, durationHours: number) => void;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New subscription tier system
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(() => {
    if (typeof window === 'undefined') return 'free';
    const stored = localStorage.getItem('subscription_tier');
    return (stored as SubscriptionTier) || 'free';
  });

  const [expiresAt, setExpiresAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('subscription_expires_at');
    return stored ? parseInt(stored, 10) : null;
  });

  // Derived state
  const isExpired = expiresAt ? Date.now() > expiresAt : false;
  // Premium is active if subscription tier is not free and not expired
  // DevMode no longer auto-enables premium - use manual toggle in admin settings
  const isPremium = subscriptionTier !== 'free' && !isExpired;

  const hoursRemaining = expiresAt && !isExpired
    ? Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60))
    : null;

  // Unlock features (called after successful payment)
  const unlockFeatures = useCallback((tier: SubscriptionTier, durationHours: number) => {
    const expiryTimestamp = Date.now() + durationHours * 60 * 60 * 1000;

    setSubscriptionTier(tier);
    setExpiresAt(expiryTimestamp);

    if (typeof window !== 'undefined') {
      localStorage.setItem('subscription_tier', tier);
      localStorage.setItem('subscription_expires_at', expiryTimestamp.toString());
    }


  }, []);

  // Check subscription status with backend verification
  const checkSubscriptionStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check local expiry first
      if (expiresAt && Date.now() > expiresAt) {
        setSubscriptionTier('free');
        setExpiresAt(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('subscription_tier');
          localStorage.removeItem('subscription_expires_at');
          localStorage.removeItem('user_email');
        }

      }

      // Verify with backend if email is stored
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('user_email');

        if (userEmail) {
          try {
            const response = await fetch('/api/payments/verify-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userEmail }),
            });

            const data = await response.json();

            if (data.isPremium && data.tier && data.expiresAt) {
              // Update from backend
              const backendExpiresAt = new Date(data.expiresAt).getTime();
              setSubscriptionTier(data.tier);
              setExpiresAt(backendExpiresAt);
              localStorage.setItem('subscription_tier', data.tier);
              localStorage.setItem('subscription_expires_at', backendExpiresAt.toString());
            } else if (!data.isPremium && isPremium) {
              // Backend says not premium, clear local
              setSubscriptionTier('free');
              setExpiresAt(null);
              localStorage.removeItem('subscription_tier');
              localStorage.removeItem('subscription_expires_at');
            }
          } catch (err) {
            // Fallback to local state if backend check fails
            console.warn('⚠️ Backend verification failed, using local state:', err);
          }
        }
      }
    } catch (err) {
      console.error('❌ Failed to check subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to check subscription');
    } finally {
      setIsLoading(false);
    }
  }, [expiresAt, isPremium, subscriptionTier, hoursRemaining]);

  // Initialize on mount and check expiry every minute
  useEffect(() => {
    checkSubscriptionStatus();

    const interval = setInterval(() => {
      if (expiresAt && Date.now() > expiresAt) {
        checkSubscriptionStatus();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkSubscriptionStatus, expiresAt]);

  // Listen for storage changes (sync across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'subscription_tier' && e.newValue) {
        setSubscriptionTier(e.newValue as SubscriptionTier);
      }
      if (e.key === 'subscription_expires_at' && e.newValue) {
        setExpiresAt(parseInt(e.newValue, 10));
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  // Legacy setIsPremium (for backward compatibility)
  const setIsPremium = useCallback((value: boolean) => {
    if (value) {
      // Default to 24h premium when using legacy method
      unlockFeatures('premium_24h', 24);
    } else {
      setSubscriptionTier('free');
      setExpiresAt(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('subscription_tier');
        localStorage.removeItem('subscription_expires_at');
      }
    }
  }, [unlockFeatures]);

  return (
    <PremiumContext.Provider
      value={{
        // New subscription system
        isPremium,
        subscriptionTier,
        expiresAt,
        isExpired,
        hoursRemaining,
        unlockFeatures,

        // Core actions
        isLoading,
        error,
        setIsPremium,
        checkSubscriptionStatus,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}

