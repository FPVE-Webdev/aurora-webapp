# Push Notification Testing Guide

## Problem Fixed
The Service Worker was only registering in production mode, which prevented local testing. This is now fixed.

## Changes Made
1. ✅ Service Worker now registers in both development and production
2. ✅ Enhanced logging in Service Worker push event handler
3. ✅ Fixed notification icon path
4. ✅ Added vibration support

## Testing Steps

### 1. Clear Browser Cache & Service Worker
```
1. Open DevTools (F12)
2. Go to Application tab → Service Workers
3. Click "Unregister" on any existing Service Workers
4. Click "Clear storage" → Clear site data
5. Refresh the page (Cmd+Shift+R / Ctrl+Shift+R)
```

### 2. Check Service Worker Registration
```
1. Open DevTools Console
2. Look for: "[useServiceWorker] Service Worker registered"
3. Verify it shows scope and active state
```

### 3. Enable Push Notifications
```
1. Go to /settings
2. Select "Strict Mode" or "Eager Mode"
3. Click "Enable Alerts"
4. Allow notification permission when prompted
5. Verify you see green checkmark with "Enabled" status
```

### 4. Check Subscription in Database
```bash
cd scripts
node verify-subscriptions.js
```
Expected output: Shows your subscription with active: true

### 5. Send Test Push
```bash
node scripts/test-push.js
```
Expected output: `Sent: 1, Failed: 0`

### 6. Check Service Worker Console
```
1. Open DevTools → Console
2. Look for Service Worker logs:
   - "[Service Worker] Push event received!"
   - "[Service Worker] Parsed payload: {...}"
   - "[Service Worker] Showing notification with title: ..."
   - "[Service Worker] Notification displayed successfully!"
```

### 7. Browser Diagnostics
Open in browser: `file:///Users/oysteinjorgensen/projects/aurora-webapp/scripts/diagnose-push.html`

Or serve it locally:
```bash
cd scripts
python3 -m http.server 8080
# Then open: http://localhost:8080/diagnose-push.html
```

## Troubleshooting

### "No notifications appear"
Check:
- [ ] Browser notification permission (Settings → Notifications)
- [ ] System Do Not Disturb / Focus mode (macOS System Settings)
- [ ] Browser is in focus vs background
- [ ] Notification Center (macOS: click clock in menu bar)
- [ ] Console shows "Notification displayed successfully!"

### "Service Worker not registering"
- Hard refresh: Cmd+Shift+R / Ctrl+Shift+R
- Unregister old workers: DevTools → Application → Service Workers
- Check console for registration errors

### "Permission denied errors"
- Run SQL files in Supabase Dashboard:
  1. `FIX_RLS_PERMISSIONS.sql`
  2. `GRANT_PERMISSIONS.sql`

### "VAPID key errors"
- Verify env vars don't have quotes or whitespace
- Check Vercel env vars: `vercel env ls`

## Expected Notification
- **Title**: 🌟 Test: Nordlys Alert
- **Message**: Dette er en test-notifikasjon fra Aurora Webapp! 🇳🇴
- **Icon**: Aurahalo.png (app logo)
- **Actions**: "Se nå" and "Lukk" buttons

## Browser Compatibility
✅ Chrome/Edge (desktop & Android)
✅ Firefox (desktop & Android)
✅ Safari (macOS 16+, iOS 16.4+)
❌ Safari (older versions)
❌ iOS browsers other than Safari

## Production vs Localhost
Both now work! Service Worker registers in both environments.

## Next Steps
If notifications still don't appear after following all steps:
1. Check browser console for Service Worker logs
2. Verify notification appears in system notification center
3. Try different browser (Chrome vs Firefox vs Safari)
4. Check macOS/Windows notification settings for the browser
