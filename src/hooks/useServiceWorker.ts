import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    // Register Service Worker in both development and production for push testing
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', {
          // Check for updates more frequently
          updateViaCache: 'none',
        })
        .then((registration) => {
          console.log('[useServiceWorker] Service Worker registered:', registration);
          console.log('[useServiceWorker] Scope:', registration.scope);
          console.log('[useServiceWorker] Active:', registration.active?.state);

          // Check for updates every 60 seconds
          setInterval(() => {
            registration.update().then(() => {
              console.log('[useServiceWorker] Checked for updates');
            });
          }, 60000);

          // Listen for new Service Worker waiting
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('[useServiceWorker] New Service Worker found, installing...');

            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[useServiceWorker] New Service Worker installed, reloading page...');
                // Auto-reload to activate new SW
                window.location.reload();
              }
            });
          });
        })
        .catch((error) => {
          console.error('[useServiceWorker] Service Worker registration failed:', error);
        });
    } else {
      console.warn('[useServiceWorker] Service Workers not supported in this browser');
    }
  }, []);
}
