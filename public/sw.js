// Service Worker for Web Push Notifications
// Aurora Webapp - Tromsø

const CACHE_NAME = 'aurora-webapp-v2';
const SW_VERSION = '2.0.0';

console.log(`[Service Worker] Version ${SW_VERSION} loading...`);

// Install event
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Version ${SW_VERSION} installing...`);
  // Force immediate activation
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Version ${SW_VERSION} activating...`);

  // Clear old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`[Service Worker] Version ${SW_VERSION} activated and claiming clients`);
      return clients.claim();
    })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received!');
  console.log('[Service Worker] Event data available:', !!event.data);

  let data = {
    title: 'Nordlys Alert',
    body: 'Aurora activity detected!',
    icon: '/Aurahalo.png',
    badge: '/favicon.ico',
    tag: 'aurora-alert',
    requireInteraction: true,
    data: {
      url: '/'
    }
  };

  // Parse incoming data if present
  if (event.data) {
    try {
      // Try to read as text first to see what we're getting
      const rawText = event.data.text();
      console.log('[Service Worker] Raw push data (text):', rawText);
      console.log('[Service Worker] Raw data length:', rawText.length);

      // Now parse as JSON
      const payload = JSON.parse(rawText);
      console.log('[Service Worker] Successfully parsed payload:', payload);
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[Service Worker] Failed to parse push data:', e);
      console.error('[Service Worker] Error details:', e.message);

      // Try arrayBuffer method as fallback
      try {
        const arrayBuffer = event.data.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(arrayBuffer);
        console.log('[Service Worker] Decoded from arrayBuffer:', text);

        const payload = JSON.parse(text);
        data = { ...data, ...payload };
      } catch (e2) {
        console.error('[Service Worker] ArrayBuffer decode also failed:', e2);
      }
    }
  } else {
    console.log('[Service Worker] No data in push event, using defaults');
  }

  const options = {
    body: data.body || data.message || 'Aurora activity detected!',
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    data: data.data || { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'view',
        title: 'Se nå'
      },
      {
        action: 'close',
        title: 'Lukk'
      }
    ]
  };

  console.log('[Service Worker] Showing notification with title:', data.title);
  console.log('[Service Worker] Notification options:', options);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        console.log('[Service Worker] Notification displayed successfully!');
      })
      .catch((error) => {
        console.error('[Service Worker] Failed to show notification:', error);
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app or focus existing tab
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not already open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync (optional - for future use)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event);
});
