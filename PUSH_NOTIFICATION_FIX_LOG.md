# Push Notification Fix Log

## Problem Identifisert (via Chrome Extension test)

**Error i Service Worker:**
```
sw.js:42 [Service Worker] Failed to parse push data: SyntaxError: Failed to execute 'json' on 'PushMessageData': Unexpected token 'T', "Test push "... is not valid JSON
```

**Root Cause:**
Service Worker mottok push events, men kunne ikke parse payload som JSON. Dette skyldtes sannsynligvis:
1. Payload ble sendt som plain string uten proper UTF-8 encoding
2. Emoji og spesialtegn i payload forårsaket encoding issues
3. Ingen eksplisitt content encoding satt i web-push

## Løsning Implementert

### 1. Backend Changes (`src/app/api/push/send/route.ts`)

**Before:**
```typescript
const payload = JSON.stringify({...});
await webpush.sendNotification(pushSubscription, payload);
```

**After:**
```typescript
const payloadObject = {...};
const payload = Buffer.from(JSON.stringify(payloadObject), 'utf-8');

await webpush.sendNotification(pushSubscription, payload, {
  contentEncoding: 'aes128gcm',
  TTL: 60,
});
```

**Changes:**
- ✅ Send payload as UTF-8 encoded Buffer
- ✅ Explicit `contentEncoding: 'aes128gcm'` for modern browsers
- ✅ Added TTL (Time To Live) of 60 seconds
- ✅ Added comprehensive logging (payload object, size in bytes)

### 2. Service Worker Changes (`public/sw.js`)

**Before:**
```javascript
const payload = event.data.json();
data = { ...data, ...payload };
```

**After:**
```javascript
// Read as text first to inspect raw data
const rawText = event.data.text();
console.log('[Service Worker] Raw push data (text):', rawText);

// Parse JSON
const payload = JSON.parse(rawText);
data = { ...data, ...payload };

// Fallback: try arrayBuffer decode
if (parsing fails) {
  const arrayBuffer = event.data.arrayBuffer();
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(arrayBuffer);
  const payload = JSON.parse(text);
}
```

**Changes:**
- ✅ Read raw text first for debugging
- ✅ Log raw data length
- ✅ Use `JSON.parse()` instead of `event.data.json()` for better error messages
- ✅ Added arrayBuffer decode fallback with TextDecoder
- ✅ Comprehensive error logging

## Testing Steps (After Deploy)

1. **Åpne Chrome DevTools:**
   - F12 → Application tab → Service Workers
   - Click "inspect" på active worker
   - Service Worker console åpnes i nytt vindu

2. **Send test push:**
   ```bash
   node scripts/test-push.js
   ```

3. **Forventet output i SW console:**
   ```
   [Service Worker] Push event received!
   [Service Worker] Event data available: true
   [Service Worker] Raw push data (text): {"title":"🌟 Test: Nordlys Alert","body":"Dette er en test-notifikasjon fra Aurora Webapp! 🇳🇴",...}
   [Service Worker] Raw data length: 234
   [Service Worker] Successfully parsed payload: {title: "🌟 Test: Nordlys Alert", body: "Dette er en test-notifikasjon...", ...}
   [Service Worker] Showing notification with title: 🌟 Test: Nordlys Alert
   [Service Worker] Notification displayed successfully!
   ```

4. **Notification skal vises:**
   - System notification center
   - Chrome notification
   - Med Aurahalo.png icon
   - "Se nå" og "Lukk" action buttons

## Expected Results

✅ Service Worker receives push event
✅ Payload parses successfully as JSON
✅ Notification displays with correct title, body, and icon
✅ No encoding errors
✅ Emoji renders correctly (🌟 🇳🇴)

## Deployment

- Commit: `7acd826`
- Pushed to: `main`
- Vercel: Deploying now (~1-2 min)

## Fallback Behavior

If JSON parsing still fails:
- SW logs raw text data
- SW attempts arrayBuffer decode
- Fallback to default notification with placeholder text
- Error logged but notification still shows (user experience preserved)

## Next Steps

1. Wait for Vercel deployment (~2 min)
2. Open Chrome DevTools → Application → Service Workers → Inspect
3. Run: `node scripts/test-push.js`
4. Verify SW console logs show successful parsing
5. Confirm notification appears in system
