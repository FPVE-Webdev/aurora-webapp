import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    // Register Service Worker in both development and production for push testing
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[useServiceWorker] Service Worker registered:', registration);
          console.log('[useServiceWorker] Scope:', registration.scope);
          console.log('[useServiceWorker] Active:', registration.active?.state);
        })
        .catch((error) => {
          console.error('[useServiceWorker] Service Worker registration failed:', error);
        });
    } else {
      console.warn('[useServiceWorker] Service Workers not supported in this browser');
    }
  }, []);
}
