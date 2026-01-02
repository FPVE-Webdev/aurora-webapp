-- Migration: Fix search_path security vulnerability
-- Description: Add search_path protection to all database functions
-- Author: Claude
-- Date: 2026-01-02

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Function: generate_api_key
CREATE OR REPLACE FUNCTION generate_api_key(
  p_organization_id UUID,
  p_name TEXT,
  p_environment TEXT DEFAULT 'production'
)
RETURNS TABLE (
  id UUID,
  key TEXT,
  key_prefix TEXT
) AS $$
DECLARE
  v_key TEXT;
  v_prefix TEXT;
  v_hash TEXT;
  v_id UUID;
BEGIN
  -- Generate random key
  IF p_environment = 'test' THEN
    v_prefix := 'tro_test_';
  ELSE
    v_prefix := 'tro_live_';
  END IF;

  v_key := v_prefix || encode(gen_random_bytes(24), 'base64');
  v_key := REPLACE(v_key, '/', '_');
  v_key := REPLACE(v_key, '+', '-');
  v_key := REPLACE(v_key, '=', '');

  -- Hash for verification
  v_hash := encode(digest(v_key, 'sha256'), 'hex');

  -- Insert
  INSERT INTO api_keys (
    organization_id,
    name,
    key,
    key_prefix,
    key_hash,
    environment,
    created_by
  )
  VALUES (
    p_organization_id,
    p_name,
    v_key,
    LEFT(v_key, 15),
    v_hash,
    p_environment,
    (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
  )
  RETURNING api_keys.id, api_keys.key, api_keys.key_prefix
  INTO v_id, v_key, v_prefix;

  RETURN QUERY SELECT v_id, v_key, v_prefix;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: verify_api_key
CREATE OR REPLACE FUNCTION verify_api_key(p_key TEXT)
RETURNS TABLE (
  organization_id UUID,
  rate_limit_tier TEXT,
  rate_limit_per_hour INTEGER,
  allowed_origins JSONB
) AS $$
DECLARE
  v_hash TEXT;
BEGIN
  v_hash := encode(digest(p_key, 'sha256'), 'hex');

  RETURN QUERY
  SELECT
    ak.organization_id,
    ak.rate_limit_tier,
    ak.rate_limit_per_hour,
    ak.allowed_origins
  FROM api_keys ak
  WHERE ak.key_hash = v_hash
    AND ak.status = 'active'
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW());

  -- Update last_used_at
  UPDATE api_keys
  SET last_used_at = NOW()
  WHERE key_hash = v_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: track_usage
CREATE OR REPLACE FUNCTION track_usage(
  p_api_key TEXT,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_cached BOOLEAN DEFAULT FALSE,
  p_widget_type TEXT DEFAULT NULL,
  p_widget_impression BOOLEAN DEFAULT FALSE,
  p_origin TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
  v_org_id UUID;
  v_key_id UUID;
BEGIN
  -- Get organization and key ID from API key
  SELECT
    ak.organization_id,
    ak.id
  INTO v_org_id, v_key_id
  FROM api_keys ak
  WHERE ak.key = p_api_key
    AND ak.status = 'active';

  -- If key not found, skip tracking
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Insert usage record
  INSERT INTO usage_analytics (
    organization_id,
    api_key_id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    cached,
    widget_type,
    widget_impression,
    origin,
    user_agent,
    ip_address,
    metadata
  )
  VALUES (
    v_org_id,
    v_key_id,
    p_endpoint,
    p_method,
    p_status_code,
    p_response_time_ms,
    p_cached,
    p_widget_type,
    p_widget_impression,
    p_origin,
    p_user_agent,
    p_ip_address,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: refresh_daily_usage_summary
CREATE OR REPLACE FUNCTION refresh_daily_usage_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_usage_summary;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Function: create_trial_subscription
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: upgrade_subscription
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: check_usage_quota
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: generate_invoice_number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || v_year || '-%';

  v_number := 'INV-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Function: create_monthly_invoice
CREATE OR REPLACE FUNCTION create_monthly_invoice(p_organization_id UUID)
RETURNS UUID AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
  v_usage_quota RECORD;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_subtotal DECIMAL(10,2);
  v_tax_amount DECIMAL(10,2);
  v_total DECIMAL(10,2);
  v_line_items JSONB;
  v_overage_amount DECIMAL(10,2);
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for organization %', p_organization_id;
  END IF;

  -- Get usage quota
  SELECT * INTO v_usage_quota
  FROM check_usage_quota(p_organization_id);

  -- Generate invoice number
  v_invoice_number := generate_invoice_number();

  -- Calculate line items
  v_line_items := jsonb_build_array(
    jsonb_build_object(
      'description', v_subscription.plan_name,
      'quantity', 1,
      'unit_price', v_subscription.price_monthly,
      'amount', v_subscription.price_monthly
    )
  );

  v_subtotal := v_subscription.price_monthly;

  -- Add overage if applicable
  IF v_usage_quota.overage > 0 AND v_subscription.overage_rate IS NOT NULL THEN
    v_overage_amount := (v_usage_quota.overage / 1000.0) * v_subscription.overage_rate;

    v_line_items := v_line_items || jsonb_build_array(
      jsonb_build_object(
        'description', 'Overage (' || v_usage_quota.overage || ' impressions)',
        'quantity', CEIL(v_usage_quota.overage / 1000.0),
        'unit_price', v_subscription.overage_rate,
        'amount', v_overage_amount
      )
    );

    v_subtotal := v_subtotal + v_overage_amount;
  END IF;

  -- Calculate tax (Norwegian MVA: 25%)
  v_tax_amount := ROUND(v_subtotal * 0.25, 2);
  v_total := v_subtotal + v_tax_amount;

  -- Create invoice
  INSERT INTO invoices (
    organization_id,
    subscription_id,
    invoice_number,
    invoice_date,
    due_date,
    period_start,
    period_end,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    currency,
    line_items,
    status
  )
  VALUES (
    p_organization_id,
    v_subscription.id,
    v_invoice_number,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    v_subscription.current_period_start::DATE,
    v_subscription.current_period_end::DATE,
    v_subtotal,
    25.00,
    v_tax_amount,
    v_total,
    v_subscription.currency,
    v_line_items,
    'draft'
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: mark_invoice_paid
CREATE OR REPLACE FUNCTION mark_invoice_paid(
  p_invoice_id UUID,
  p_payment_method TEXT DEFAULT 'card',
  p_stripe_invoice_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE invoices
  SET
    status = 'paid',
    paid_at = NOW(),
    payment_method = p_payment_method,
    stripe_invoice_id = COALESCE(p_stripe_invoice_id, stripe_invoice_id),
    updated_at = NOW()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: register_widget_instance
CREATE OR REPLACE FUNCTION register_widget_instance(
  p_api_key TEXT,
  p_widget_type TEXT,
  p_instance_id TEXT,
  p_origin TEXT,
  p_page_url TEXT DEFAULT NULL,
  p_page_title TEXT DEFAULT NULL,
  p_config JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_key_id UUID;
  v_widget_id UUID;
BEGIN
  -- Get organization and key ID
  SELECT ak.organization_id, ak.id
  INTO v_org_id, v_key_id
  FROM api_keys ak
  WHERE ak.key = p_api_key
    AND ak.status = 'active';

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid API key';
  END IF;

  -- Insert or update widget instance
  INSERT INTO widget_instances (
    organization_id,
    api_key_id,
    widget_type,
    instance_id,
    origin,
    page_url,
    page_title,
    config,
    last_seen_at
  )
  VALUES (
    v_org_id,
    v_key_id,
    p_widget_type,
    p_instance_id,
    p_origin,
    p_page_url,
    p_page_title,
    p_config,
    NOW()
  )
  ON CONFLICT (organization_id, instance_id)
  DO UPDATE SET
    last_seen_at = NOW(),
    page_url = COALESCE(EXCLUDED.page_url, widget_instances.page_url),
    page_title = COALESCE(EXCLUDED.page_title, widget_instances.page_title),
    config = EXCLUDED.config,
    status = 'active'
  RETURNING id INTO v_widget_id;

  RETURN v_widget_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: update_widget_stats
CREATE OR REPLACE FUNCTION update_widget_stats()
RETURNS VOID AS $$
BEGIN
  -- Update impression and interaction counts
  UPDATE widget_instances wi
  SET
    total_impressions = (
      SELECT COUNT(*) FILTER (WHERE widget_impression = TRUE)
      FROM usage_analytics ua
      WHERE ua.api_key_id = wi.api_key_id
        AND ua.widget_type = wi.widget_type
        AND ua.metadata->>'instance_id' = wi.instance_id
    ),
    total_interactions = (
      SELECT COUNT(*)
      FROM usage_analytics ua
      WHERE ua.api_key_id = wi.api_key_id
        AND ua.widget_type = wi.widget_type
        AND ua.metadata->>'instance_id' = wi.instance_id
        AND ua.metadata->>'interaction' = 'true'
    ),
    updated_at = NOW()
  WHERE wi.last_seen_at >= NOW() - INTERVAL '7 days';

  -- Mark inactive widgets (not seen in 7 days)
  UPDATE widget_instances
  SET status = 'inactive'
  WHERE last_seen_at < NOW() - INTERVAL '7 days'
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: create_notification_for_org
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: mark_notification_read
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: mark_all_notifications_read
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Function: notify_usage_quota_warning (Trigger function)
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
$$ LANGUAGE plpgsql
SET search_path = '';
