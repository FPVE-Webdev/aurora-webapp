-- Migration: Seed data for testing
-- Description: Demo organization, API keys, and subscription
-- Author: Claude
-- Date: 2025-12-21

-- Demo Organization
INSERT INTO organizations (id, name, slug, email, status, trial_ends_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Organization',
  'demo',
  'demo@example.com',
  'trial',
  NOW() + INTERVAL '30 days'
)
ON CONFLICT (id) DO NOTHING;

-- Demo User (Owner)
INSERT INTO users (id, organization_id, email, name, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'demo@example.com',
  'Demo User',
  'owner',
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- Demo API Key (test environment)
INSERT INTO api_keys (
  id,
  organization_id,
  created_by,
  key,
  key_prefix,
  key_hash,
  name,
  environment,
  rate_limit_tier,
  rate_limit_per_hour,
  status
)
VALUES (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000011',
  'tro_demo_test_key',
  'tro_demo_test_k',
  encode(digest('tro_demo_test_key', 'sha256'), 'hex'),
  'Demo Test Key',
  'test',
  'demo',
  100,
  'active'
)
ON CONFLICT (key) DO NOTHING;

-- iOS App API Key (production)
INSERT INTO api_keys (
  id,
  organization_id,
  created_by,
  key,
  key_prefix,
  key_hash,
  name,
  description,
  environment,
  rate_limit_tier,
  rate_limit_per_hour,
  status
)
VALUES (
  '00000000-0000-0000-0000-000000000022',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000011',
  'tro_app_aurora_watcher_v1',
  'tro_app_aurora_w',
  encode(digest('tro_app_aurora_watcher_v1', 'sha256'), 'hex'),
  'iOS App Production',
  'Production API key for Aurora Watcher iOS app',
  'production',
  'premium',
  10000,
  'active'
)
ON CONFLICT (key) DO NOTHING;

-- Demo Subscription
INSERT INTO subscriptions (
  id,
  organization_id,
  plan_id,
  plan_name,
  price_monthly,
  currency,
  billing_period,
  current_period_start,
  current_period_end,
  status,
  included_impressions,
  overage_rate,
  features
)
VALUES (
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000001',
  'demo',
  'Demo Plan',
  0.00,
  'NOK',
  'monthly',
  NOW(),
  NOW() + INTERVAL '30 days',
  'trialing',
  1000,
  0.05,
  '{"remove_branding": false, "custom_domain": false, "priority_support": false}'::jsonb
)
ON CONFLICT (organization_id) DO NOTHING;

-- Sample Widget Instance
INSERT INTO widget_instances (
  id,
  organization_id,
  api_key_id,
  widget_type,
  instance_id,
  origin,
  page_url,
  page_title,
  config,
  status,
  total_impressions
)
VALUES (
  '00000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000021',
  'forecast',
  'demo-widget-001',
  'https://demo.example.com',
  'https://demo.example.com/aurora',
  'Northern Lights Forecast',
  '{"theme": "dark", "location": "tromso", "language": "no"}'::jsonb,
  'active',
  1523
)
ON CONFLICT (organization_id, instance_id) DO NOTHING;

-- Sample Notifications
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
VALUES
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'api_key_created',
    'New API Key Created',
    'A new API key "Demo Test Key" was created for your organization.',
    'info',
    '/dashboard/api-keys',
    'View API Keys'
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'widget_deployed',
    'Widget Deployed Successfully',
    'Your forecast widget is now live on demo.example.com',
    'info',
    '/dashboard/widgets',
    'View Widgets'
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'subscription_expiring',
    'Trial Ending Soon',
    'Your 30-day trial will end in 7 days. Upgrade to continue using premium features.',
    'warning',
    '/dashboard/billing',
    'Upgrade Now'
  );

-- Sample Usage Analytics (last 7 days)
DO $$
DECLARE
  v_day INTEGER;
  v_hour INTEGER;
  v_impressions INTEGER;
BEGIN
  FOR v_day IN 0..6 LOOP
    FOR v_hour IN 0..23 LOOP
      v_impressions := FLOOR(RANDOM() * 10 + 1)::INTEGER;

      FOR i IN 1..v_impressions LOOP
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
          ip_address,
          country_code,
          timestamp,
          date
        )
        VALUES (
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000021',
          '/api/aurora/now',
          'GET',
          200,
          FLOOR(RANDOM() * 200 + 50)::INTEGER,
          RANDOM() > 0.7,
          'forecast',
          TRUE,
          'https://demo.example.com',
          ('192.168.' || FLOOR(RANDOM() * 255) || '.' || FLOOR(RANDOM() * 255))::INET,
          'NO',
          NOW() - (v_day || ' days')::INTERVAL - (v_hour || ' hours')::INTERVAL,
          (NOW() - (v_day || ' days')::INTERVAL)::DATE
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW daily_usage_summary;

-- Comments
COMMENT ON COLUMN organizations.id IS 'Demo org ID: 00000000-0000-0000-0000-000000000001';
COMMENT ON COLUMN api_keys.key IS 'Demo keys: tro_demo_test_key, tro_app_aurora_watcher_v1';
