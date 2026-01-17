// Service Worker for Web Push Notifications
// Aurora Webapp - Tromsø

const CACHE_NAME = 'aurora-webapp-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim());
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
      const payload = event.data.json();
      console.log('[Service Worker] Parsed payload:', payload);
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[Service Worker] Failed to parse push data:', e);
      // Use text fallback
      try {
        const text = event.data.text();
        console.log('[Service Worker] Push data as text:', text);
      } catch (e2) {
        console.error('[Service Worker] Could not read push data as text either:', e2);
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
