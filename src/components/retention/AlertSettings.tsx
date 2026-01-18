'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Zap, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useRetention } from '@/contexts/RetentionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export function AlertSettings() {
  const { alertPreference, setAlertPreference } = useRetention();
  const { t } = useLanguage();
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if push is supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);

      // Check current permission state
      if ('Notification' in window) {
        setPermissionState(Notification.permission);
      }

      // Check if already subscribed
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!isPushSupported) {
      toast.error(t('pushNotSupported') || 'Push notifications not supported');
      return;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== 'granted') {
        toast.error(t('permissionDenied') || 'Notification permission denied');
        setIsLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Get user location (if available)
      let latitude = null;
      let longitude = null;

      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch {
          // Ignore geolocation errors
        }
      }

      // Send subscription to backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          alertPreference,
          latitude,
          longitude,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsSubscribed(true);
      toast.success(t('alertsEnabled') || 'Push notifications enabled!');
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error(t('subscriptionFailed') || 'Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe();

        // Notify backend
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });

        setIsSubscribed(false);
        toast.success(t('alertsDisabled') || 'Push notifications disabled');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error(t('unsubscribeFailed') || 'Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = async (pref: 'strict' | 'eager' | 'off') => {
    setAlertPreference(pref);

    // If already subscribed, update preference on backend
    if (isSubscribed && pref !== 'off') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription: subscription.toJSON(),
              alertPreference: pref,
            }),
          });
        }
      } catch (error) {
        console.error('Error updating preference:', error);
      }
    }

    // If turning off and subscribed, unsubscribe
    if (pref === 'off' && isSubscribed) {
      await unsubscribeFromPush();
    }
  };

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{t('smartAlerts')}</h3>
            <p className="text-white/60 text-sm">{t('chooseWhenToAlert')}</p>
          </div>
        </div>

        {/* Subscription status */}
        {isPushSupported && (
          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <div className="flex items-center gap-2 text-primary text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>{t('enabled') || 'Enabled'}</span>
              </div>
            ) : (
              <button
                onClick={subscribeToPush}
                disabled={isLoading || alertPreference === 'off'}
                className="px-4 py-2 rounded-lg bg-primary text-arctic-900 font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('enabling') || 'Enabling...'}
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    {t('enableAlerts') || 'Enable Alerts'}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = alertPreference === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handlePreferenceChange(option.id)}
              disabled={isLoading}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all disabled:opacity-50 ${
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

      {/* Browser support warning */}
      {!isPushSupported && (
        <div className="mt-6 flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-300">
            <p className="font-medium mb-1">{t('notSupported') || 'Not Supported'}</p>
            <p className="text-yellow-300/80">
              {t('pushNotSupportedMessage') || 'Your browser does not support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.'}
            </p>
          </div>
        </div>
      )}

      {/* Permission denied warning */}
      {isPushSupported && permissionState === 'denied' && (
        <div className="mt-6 flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-300">
            <p className="font-medium mb-1">{t('permissionBlocked') || 'Permission Blocked'}</p>
            <p className="text-red-300/80">
              {t('permissionBlockedMessage') || 'You have blocked notifications. Please enable them in your browser settings.'}
            </p>
          </div>
        </div>
      )}

      {/* Unsubscribe button */}
      {isSubscribed && (
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={unsubscribeFromPush}
            disabled={isLoading}
            className="text-sm text-white/60 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <BellOff className="w-4 h-4" />
            {t('disableAlerts') || 'Disable Alerts'}
          </button>

          <button
            onClick={async () => {
              try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification('🧪 Test: Nordlys Alert', {
                  body: 'Dette er en test-notifikasjon!',
                  icon: '/Aurahalo.png',
                  badge: '/favicon.ico',
                  tag: 'test-notification',
                  requireInteraction: false,
                  data: {
                    url: '/',
                    test: true,
                  },
                });
                toast.success('Test notification sent!');
              } catch (error) {
                console.error('Test notification failed:', error);
                toast.error('Test failed: ' + (error as Error).message);
              }
            }}
            disabled={isLoading}
            className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            <Zap className="w-4 h-4" />
            Test Push
          </button>
        </div>
      )}
    </div>
  );
}
