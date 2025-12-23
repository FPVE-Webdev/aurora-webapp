-- Migration: Create notifications table
-- Description: System notifications for users
-- Author: Claude
-- Date: 2025-12-21

CREATE TABLE IF NOT EXISTS notifications (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Recipient
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Notification
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Priority
  priority TEXT NOT NULL DEFAULT 'info',

  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Action
  action_url TEXT,
  action_label TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_priority CHECK (priority IN ('info', 'warning', 'critical')),
  CONSTRAINT valid_type CHECK (
    type IN (
      'billing_warning',
      'usage_limit',
      'api_key_created',
      'api_key_revoked',
      'subscription_expiring',
      'subscription_renewed',
      'payment_failed',
      'invoice_ready',
      'widget_deployed',
      'widget_inactive'
    )
  )
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority) WHERE priority = 'critical';

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1));

-- RLS Policy: Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1));

-- Function: Create Notification for Organization
CREATE OR REPLACE FUNCTION create_notification_for_org(
  p_organization_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_priority TEXT DEFAULT 'info',
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Create notification for all active users in organization
  INSERT INTO notifications (
    user_id,
    organization_id,
    type,
    title,
    message,
    priority,
    action_url,
    action_label
  )
  SELECT
    u.id,
    p_organization_id,
    p_type,
    p_title,
    p_message,
    p_priority,
    p_action_url,
    p_action_label
  FROM users u
  WHERE u.organization_id = p_organization_id
    AND u.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark Notification as Read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET
    read = TRUE,
    read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark All Notifications as Read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET
    read = TRUE,
    read_at = NOW()
  WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
    AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-notify on usage quota warning
CREATE OR REPLACE FUNCTION notify_usage_quota_warning()
RETURNS TRIGGER AS $$
DECLARE
  v_quota RECORD;
  v_org organizations%ROWTYPE;
BEGIN
  -- Get usage quota
  SELECT * INTO v_quota
  FROM check_usage_quota(NEW.organization_id);

  -- Get organization
  SELECT * INTO v_org
  FROM organizations
  WHERE id = NEW.organization_id;

  -- Warning at 80% usage
  IF v_quota.impressions_used >= (v_quota.impressions_limit * 0.8)
     AND v_quota.impressions_used < (v_quota.impressions_limit * 0.9) THEN

    PERFORM create_notification_for_org(
      NEW.organization_id,
      'usage_limit',
      'Usage Warning: 80% of quota used',
      format('Your organization has used %s of %s impressions this month. Consider upgrading your plan.',
        v_quota.impressions_used, v_quota.impressions_limit),
      'warning',
      '/dashboard/billing',
      'Upgrade Plan'
    );
  END IF;

  -- Critical warning at 90% usage
  IF v_quota.impressions_used >= (v_quota.impressions_limit * 0.9) THEN
    PERFORM create_notification_for_org(
      NEW.organization_id,
      'usage_limit',
      'Usage Critical: 90% of quota used',
      format('Your organization has used %s of %s impressions this month. Overage charges will apply.',
        v_quota.impressions_used, v_quota.impressions_limit),
      'critical',
      '/dashboard/billing',
      'Upgrade Now'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger (fires on widget impressions)
CREATE TRIGGER trigger_usage_quota_warning
  AFTER INSERT ON usage_analytics
  FOR EACH ROW
  WHEN (NEW.widget_impression = TRUE)
  EXECUTE FUNCTION notify_usage_quota_warning();

-- Comments
COMMENT ON TABLE notifications IS 'System notifications for users';
COMMENT ON COLUMN notifications.type IS 'Notification type (billing_warning, usage_limit, etc.)';
COMMENT ON COLUMN notifications.priority IS 'info | warning | critical';
COMMENT ON FUNCTION create_notification_for_org IS 'Create notification for all users in organization';
COMMENT ON FUNCTION mark_notification_read IS 'Mark single notification as read';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Mark all user notifications as read';
