# Force Service Worker Update

## Problem
Service Worker bruker gammel cached versjon. Den nye deployede koden med Buffer encoding kjører ikke.

## Løsning: Force Update Service Worker

### Steg 1: Unregister Old Service Worker

**I Chrome DevTools (F12) → Application → Service Workers:**

1. Klikk **"Unregister"** ved siden av `https://aurora.tromso.ai/sw.js`
2. Klikk **"Update on reload"** checkbox (øverst)
3. Klikk **"Bypass for network"** checkbox

### Steg 2: Clear Cache

**I Application tab:**

1. Klikk **"Storage"** i venstre sidebar
2. Klikk **"Clear site data"** button
3. Bekreft at alt cleareres

### Steg 3: Hard Refresh

**I browser:**

- **Mac**: `Cmd + Shift + R`
- **Windows**: `Ctrl + Shift + F5`

### Steg 4: Verify New Service Worker

**DevTools → Console:**

Se etter:
```
[useServiceWorker] Service Worker registered
[useServiceWorker] Scope: https://aurora.tromso.ai/
[useServiceWorker] Active: activated
```

**DevTools → Application → Service Workers:**

- Status skal være: `#XXX activated and is running`
- Script URL: `https://aurora.tromso.ai/sw.js`

### Steg 5: Re-Enable Alerts

Gå til `/settings` og:

1. Velg "Eager Mode" eller "Strict Mode"
2. Klikk **"Enable Alerts"**
3. Allow notification permission

### Steg 6: Test Push

Kjør:
```bash
node scripts/test-push.js
```

### Steg 7: Check Service Worker Console

**DevTools → Application → Service Workers → "inspect"**

Forventet output:
```
[Service Worker] Push event received!
[Service Worker] Raw push data (text): {"title":"🌟 Test: Nordlys Alert","body":"Dette er en test-notifikasjon...",...}
[Service Worker] Successfully parsed payload: {title: "🌟 Test: Nordlys Alert", ...}
[Service Worker] Notification displayed successfully!
```

## Alternative: Manual SW Version Bump

Hvis problemet vedvarer, kan vi:

1. Endre `CACHE_NAME` i `sw.js` (force new version)
2. Legg til versjon i SW registration
3. Implementer auto-update logic i SW

## Debug: Verify Deployed SW Code

Åpne i browser:
```
https://aurora.tromso.ai/sw.js
```

Verifiser at den inneholder:
- `const rawText = event.data.text();` (linje ~39)
- `const payload = JSON.parse(rawText);` (linje ~44)
- `const decoder = new TextDecoder('utf-8');` (linje ~54)

Hvis den IKKE inneholder dette, er deployment ikke ferdig ennå.
