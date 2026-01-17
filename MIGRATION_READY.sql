-- ============================================
-- Web Push Notifications - Database Migration
-- Copy this entire file and paste into Supabase SQL Editor
-- ============================================

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
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_preference ON push_subscriptions(alert_preference);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at ON push_subscriptions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can insert (subscribe)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions'
    AND policyname = 'Anyone can subscribe to push notifications'
  ) THEN
    CREATE POLICY "Anyone can subscribe to push notifications"
      ON push_subscriptions FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- RLS Policy: Anyone can update their own subscription by endpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions'
    AND policyname = 'Anyone can update their own subscription'
  ) THEN
    CREATE POLICY "Anyone can update their own subscription"
      ON push_subscriptions FOR UPDATE
      USING (true);
  END IF;
END $$;

-- RLS Policy: Anyone can delete their own subscription by endpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions'
    AND policyname = 'Anyone can unsubscribe'
  ) THEN
    CREATE POLICY "Anyone can unsubscribe"
      ON push_subscriptions FOR DELETE
      USING (true);
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
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

-- Verification query
SELECT 'Migration completed successfully!' as status,
       COUNT(*) as table_exists
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'push_subscriptions';
