# API Authentication

## Overview

B2B API endpoints (`/api/organizations`, `/api/api-keys`, `/api/analytics`) require **Bearer token authentication** using Supabase Auth.

## Current Status

### ⚠️ Admin Dashboard (No Auth)

The admin dashboard pages (`/admin/*`) currently call these APIs **without authentication**. This results in:

- **401 Unauthorized** errors in browser console
- Empty data in admin dashboard
- Warning messages displayed in UI

This is **expected behavior** and does not affect core application functionality.

## Why These Errors Occur

1. **B2B APIs are protected** - They require a valid Supabase bearer token
2. **Admin pages call APIs directly** - No token is attached to requests
3. **Graceful degradation** - UI shows warning messages instead of crashing

## How to Fix (Optional)

### Option 1: Implement Authentication (Recommended for Production)

Add Supabase Auth to admin pages:

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();
const { data: { session } } = await supabase.auth.getSession();

const res = await fetch('/api/organizations', {
  headers: {
    'Authorization': `Bearer ${session?.access_token}`
  }
});
```

### Option 2: Mock Data for Development

For local development/testing without Supabase:

```typescript
// In /app/admin/page.tsx
const MOCK_MODE = process.env.NODE_ENV === 'development';

if (MOCK_MODE) {
  setStats({
    totalOrganizations: 5,
    totalApiKeys: 12,
    totalRequests: 1543,
    activeUsers: 23,
  });
  return;
}
```

### Option 3: Disable B2B Features

If you don't need B2B/API features:

1. Remove `/admin` routes from navigation
2. Hide admin links in UI
3. Focus on B2C features (premium subscriptions, live map, etc.)

## What Works Without Auth

The following features work perfectly without B2B authentication:

✅ **Premium subscriptions** (localStorage-based tier system)
✅ **Tier-based restrictions** (map zoom, spot filtering, feature gates)
✅ **Analytics tracking** (tier events, conversion tracking)
✅ **Live aurora map** (all tier levels)
✅ **Admin settings** (`/admin/settings` - app configuration)

## API Endpoints Requiring Auth

| Endpoint | Method | Requires Auth | Purpose |
|----------|--------|---------------|---------|
| `/api/organizations` | GET | ✅ | List organizations |
| `/api/organizations` | POST | ✅ | Create organization |
| `/api/api-keys` | GET | ✅ | List API keys |
| `/api/api-keys` | POST | ✅ | Generate API key |
| `/api/analytics` | GET | ✅ | Get analytics data |
| `/api/admin/settings` | GET/POST | ❌ | App settings (no auth needed) |

## Security Notes

- Bearer tokens should **never be exposed** in client-side code
- Use server-side API routes or middleware for sensitive operations
- Implement rate limiting on public endpoints
- Rotate API keys regularly

## Future Improvements

1. Add Supabase Auth Provider to app root
2. Implement login page for admin users
3. Add role-based access control (RBAC)
4. Create dedicated B2B admin portal with auth
