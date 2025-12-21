-- Migration: Create subscriptions table
-- Description: Subscription plans and billing cycles
-- Author: Claude
-- Date: 2025-12-21

CREATE TABLE IF NOT EXISTS subscriptions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization (one subscription per organization)
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Plan
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,

  -- Pricing
  price_monthly DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NOK',

  -- Billing Cycle
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,

  -- Usage Limits
  included_impressions INTEGER,
  overage_rate DECIMAL(10,4),

  -- Features
  features JSONB DEFAULT '{}',

  -- Payment (Stripe integration)
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('trialing', 'active', 'past_due', 'cancelled', 'unpaid')
  ),
  CONSTRAINT valid_billing_period CHECK (billing_period IN ('monthly', 'yearly')),
  CONSTRAINT valid_plan_id CHECK (
    plan_id IN ('demo', 'basic', 'premium', 'premium_plus', 'enterprise')
  )
);

-- Indexes
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their organization's subscription
CREATE POLICY "Users can view their organization's subscription"
  ON subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Create Trial Subscription
CREATE OR REPLACE FUNCTION create_trial_subscription(
  p_organization_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  INSERT INTO subscriptions (
    organization_id,
    plan_id,
    plan_name,
    price_monthly,
    billing_period,
    current_period_start,
    current_period_end,
    status,
    included_impressions,
    features
  )
  VALUES (
    p_organization_id,
    'demo',
    'Demo Plan',
    0.00,
    'monthly',
    NOW(),
    NOW() + INTERVAL '30 days',
    'trialing',
    1000,
    '{"remove_branding": false, "custom_domain": false, "priority_support": false}'::jsonb
  )
  RETURNING id INTO v_subscription_id;

  -- Update organization trial end date
  UPDATE organizations
  SET trial_ends_at = NOW() + INTERVAL '30 days'
  WHERE id = p_organization_id;

  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Upgrade Subscription
CREATE OR REPLACE FUNCTION upgrade_subscription(
  p_organization_id UUID,
  p_plan_id TEXT,
  p_stripe_subscription_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_plan_name TEXT;
  v_price DECIMAL(10,2);
  v_impressions INTEGER;
  v_features JSONB;
BEGIN
  -- Get plan details
  CASE p_plan_id
    WHEN 'basic' THEN
      v_plan_name := 'Basic Plan';
      v_price := 3500.00;
      v_impressions := 50000;
      v_features := '{"remove_branding": true, "custom_domain": false, "priority_support": false}'::jsonb;
    WHEN 'premium' THEN
      v_plan_name := 'Premium Plan';
      v_price := 7000.00;
      v_impressions := NULL; -- Unlimited
      v_features := '{"remove_branding": true, "custom_domain": true, "priority_support": true}'::jsonb;
    WHEN 'premium_plus' THEN
      v_plan_name := 'Premium+ Plan';
      v_price := 12000.00;
      v_impressions := NULL;
      v_features := '{"remove_branding": true, "custom_domain": true, "priority_support": true, "ai_chat": true}'::jsonb;
    ELSE
      RAISE EXCEPTION 'Invalid plan_id: %', p_plan_id;
  END CASE;

  -- Update subscription
  UPDATE subscriptions
  SET
    plan_id = p_plan_id,
    plan_name = v_plan_name,
    price_monthly = v_price,
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 month',
    included_impressions = v_impressions,
    features = v_features,
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
    updated_at = NOW()
  WHERE organization_id = p_organization_id;

  -- Update organization status
  UPDATE organizations
  SET status = 'active'
  WHERE id = p_organization_id;

  RETURN (SELECT id FROM subscriptions WHERE organization_id = p_organization_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check Usage Quota
CREATE OR REPLACE FUNCTION check_usage_quota(p_organization_id UUID)
RETURNS TABLE (
  impressions_used BIGINT,
  impressions_limit INTEGER,
  impressions_remaining BIGINT,
  overage BIGINT,
  quota_exceeded BOOLEAN
) AS $$
DECLARE
  v_used BIGINT;
  v_limit INTEGER;
BEGIN
  -- Get current period usage
  SELECT COUNT(*) FILTER (WHERE widget_impression = TRUE)
  INTO v_used
  FROM usage_analytics ua
  JOIN subscriptions s ON ua.organization_id = s.organization_id
  WHERE ua.organization_id = p_organization_id
    AND ua.timestamp >= s.current_period_start
    AND ua.timestamp < s.current_period_end;

  -- Get plan limit
  SELECT included_impressions
  INTO v_limit
  FROM subscriptions
  WHERE organization_id = p_organization_id;

  RETURN QUERY
  SELECT
    v_used,
    v_limit,
    GREATEST(0, v_limit - v_used) AS impressions_remaining,
    GREATEST(0, v_used - COALESCE(v_limit, 999999999)) AS overage,
    (v_limit IS NOT NULL AND v_used > v_limit) AS quota_exceeded;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE subscriptions IS 'Subscription plans and billing cycles';
COMMENT ON COLUMN subscriptions.plan_id IS 'demo | basic | premium | premium_plus | enterprise';
COMMENT ON COLUMN subscriptions.included_impressions IS 'Monthly widget impressions (NULL = unlimited)';
COMMENT ON FUNCTION create_trial_subscription IS 'Create 30-day trial subscription';
COMMENT ON FUNCTION upgrade_subscription IS 'Upgrade organization to paid plan';
COMMENT ON FUNCTION check_usage_quota IS 'Check if organization exceeded usage quota';
