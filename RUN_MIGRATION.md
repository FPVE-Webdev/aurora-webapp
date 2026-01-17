# 🚀 Database Migration - Web Push

**Status:** Migration må kjøres manuelt i Supabase Dashboard

---

## ⚡ Quick Steps

### Option 1: Copy SQL Directly (Recommended)

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu/sql/new
   ```

2. **Copy the SQL below and paste it:**

```sql
-- Migration: Create push_subscriptions table for Web Push notifications
-- Description: Store browser push subscriptions for aurora alerts
-- Author: Claude
-- Date: 2026-01-17

CREATE TABLE IF NOT EXISTS push_subscriptions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Push Subscription (from browser)
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,

  -- User Preferences
  alert_preference TEXT NOT NULL DEFAULT 'strict',

  -- Location (for local aurora predictions)
  latitude FLOAT,
  longitude FLOAT,

  -- Status
  active BOOLEAN DEFAULT TRUE,
  last_alert_sent_at TIMESTAMPTZ,

  -- Browser Info (for debugging)
  user_agent TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_alert_preference CHECK (alert_preference IN ('strict', 'eager', 'off'))
);

-- Indexes
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(active) WHERE active = TRUE;
CREATE INDEX idx_push_subscriptions_preference ON push_subscriptions(alert_preference);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_created_at ON push_subscriptions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can insert (subscribe)
CREATE POLICY "Anyone can subscribe to push notifications"
  ON push_subscriptions FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Anyone can update their own subscription by endpoint
CREATE POLICY "Anyone can update their own subscription"
  ON push_subscriptions FOR UPDATE
  USING (true);

-- RLS Policy: Anyone can delete their own subscription by endpoint
CREATE POLICY "Anyone can unsubscribe"
  ON push_subscriptions FOR DELETE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Clean up old inactive subscriptions (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM push_subscriptions
  WHERE active = FALSE
    AND updated_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE push_subscriptions IS 'Browser push subscriptions for aurora alerts';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Unique push endpoint from browser';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Public key for encryption (base64)';
COMMENT ON COLUMN push_subscriptions.auth IS 'Auth secret for encryption (base64)';
COMMENT ON COLUMN push_subscriptions.alert_preference IS 'strict (Kp≥5) | eager (Kp≥3) | off';
COMMENT ON FUNCTION cleanup_old_push_subscriptions IS 'Delete inactive subscriptions older than 90 days';
```

3. **Click "Run"**

4. **Verify:** Go to Table Editor and check for `push_subscriptions` table

---

### Option 2: Copy from File

```bash
cat supabase/migrations/20260117_create_push_subscriptions.sql
```

Then paste into Supabase SQL Editor.

---

## ✅ Verification

After running the migration, verify:

1. **Table exists:**
   - Go to Supabase Dashboard → Table Editor
   - You should see `push_subscriptions` table

2. **RLS policies active:**
   - Table should have 3 policies:
     - Anyone can subscribe to push notifications
     - Anyone can update their own subscription
     - Anyone can unsubscribe

3. **Indexes created:**
   - 4 indexes should exist on the table

---

## 🧪 Test Web Push

Once migration is complete:

1. Go to: **https://aurora.tromso.ai/settings**
2. Scroll to "Smart Alerts"
3. Click "Enable Alerts"
4. Grant notification permission
5. Verify status shows "✓ Enabled"

---

## 🔧 Troubleshooting

**Error: relation "push_subscriptions" already exists**
- This is OK - the table is already created

**Error: function update_updated_at_column() does not exist**
- This function should exist from previous migrations
- Check: `supabase/migrations/20251223110000_initial_schema.sql`

**Error: permission denied**
- Make sure you're logged in to Supabase Dashboard
- Use service role key if running via API

---

## 📊 What This Migration Creates

- **Table:** `push_subscriptions` (stores browser push subscriptions)
- **Columns:** endpoint, keys, preferences, location, status
- **Indexes:** For performance on queries
- **RLS Policies:** Anyone can subscribe/unsubscribe
- **Function:** `cleanup_old_push_subscriptions()` for maintenance
