-- Migration: Create organizations table
-- Description: B2B customers (hotels, tour operators, etc.)
-- Author: Claude
-- Date: 2025-12-21

CREATE TABLE IF NOT EXISTS organizations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Company Info
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,

  -- Contact
  email TEXT NOT NULL,
  phone TEXT,

  -- Address
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'NO',

  -- Business Info
  org_number TEXT,
  vat_number TEXT,

  -- Billing
  billing_email TEXT,
  invoice_reference TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);

-- Enable Row Level Security (policies added in later migration)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE organizations IS 'B2B customers (hotels, tour operators, etc.)';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly identifier: radisson-blu-tromso';
COMMENT ON COLUMN organizations.status IS 'trial | active | suspended | cancelled';
-- Migration: Create users table
-- Description: Individual users within organizations
-- Author: Claude
-- Date: 2025-12-21

CREATE TABLE IF NOT EXISTS users (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization (nullable for super admins)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Profile
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,

  -- Auth (Supabase handles actual auth)
  auth_id UUID,

  -- Role
  role TEXT NOT NULL DEFAULT 'member',

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'invited'))
);

-- Indexes
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_id ON users(auth_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view users in their organization
CREATE POLICY "Users can view their organization's users"
  ON users FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE users IS 'Individual users within organizations';
COMMENT ON COLUMN users.role IS 'owner | admin | member | viewer';
COMMENT ON COLUMN users.auth_id IS 'Links to Supabase auth.users.id';
-- Migration: Create api_keys table
-- Description: API keys for authentication and usage tracking
-- Author: Claude
-- Date: 2025-12-21

CREATE TABLE IF NOT EXISTS api_keys (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Key
  key TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,

  -- Metadata
  name TEXT NOT NULL,
  description TEXT,

  -- Type
  environment TEXT NOT NULL DEFAULT 'production',

  -- Permissions
  scopes JSONB DEFAULT '["aurora:read"]',

  -- Rate Limits
  rate_limit_tier TEXT NOT NULL DEFAULT 'basic',
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 10000,

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Security
  allowed_origins JSONB DEFAULT '["*"]',
  ip_whitelist JSONB,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_environment CHECK (environment IN ('test', 'production')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'revoked', 'expired')),
  CONSTRAINT valid_key_format CHECK (key ~ '^tro_(live|test|app|demo)_[a-zA-Z0-9_]{20,50}$')
);

-- Indexes
CREATE UNIQUE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_status ON api_keys(status) WHERE status = 'active';
CREATE INDEX idx_api_keys_last_used_at ON api_keys(last_used_at DESC);

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their organization's API keys
CREATE POLICY "Users can view their organization's API keys"
  ON api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- RLS Policy: Admins/owners can create API keys
CREATE POLICY "Admins can create API keys"
  ON api_keys FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Generate API Key
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

-- Function: Verify API Key
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

-- Comments
COMMENT ON TABLE api_keys IS 'API keys for authentication and usage tracking';
COMMENT ON COLUMN api_keys.key IS 'Full API key (shown once at creation)';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash for verification';
COMMENT ON COLUMN api_keys.environment IS 'test | production';
COMMENT ON FUNCTION generate_api_key IS 'Generate new API key for organization';
COMMENT ON FUNCTION verify_api_key IS 'Verify API key and return organization info';
-- Migration: Create usage_analytics table
-- Description: Track API usage per organization/key for billing and analytics
-- Author: Claude
-- Date: 2025-12-21

CREATE TABLE IF NOT EXISTS usage_analytics (
  -- Identity
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization & Key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Request Info
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INTEGER NOT NULL,

  -- Response
  response_time_ms INTEGER,
  cached BOOLEAN DEFAULT FALSE,

  -- Widget Specific
  widget_type TEXT,
  widget_impression BOOLEAN DEFAULT FALSE,

  -- Origin
  origin TEXT,
  user_agent TEXT,
  ip_address INET,
  country_code TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Partitioning key
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Constraints
  CONSTRAINT valid_widget_type CHECK (
    widget_type IS NULL OR widget_type IN ('forecast', 'map', 'chat')
  )
);

-- Indexes (optimized for time-series queries)
CREATE INDEX idx_usage_analytics_organization_date
  ON usage_analytics(organization_id, date DESC);
CREATE INDEX idx_usage_analytics_api_key_date
  ON usage_analytics(api_key_id, date DESC);
CREATE INDEX idx_usage_analytics_timestamp
  ON usage_analytics(timestamp DESC);
CREATE INDEX idx_usage_analytics_endpoint
  ON usage_analytics(endpoint);
CREATE INDEX idx_usage_analytics_widget_type
  ON usage_analytics(widget_type)
  WHERE widget_type IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their organization's usage
CREATE POLICY "Users can view their organization's usage"
  ON usage_analytics FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- Function: Track API Usage
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

-- Materialized View: Daily Usage Summary
CREATE MATERIALIZED VIEW daily_usage_summary AS
SELECT
  organization_id,
  api_key_id,
  date,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE widget_impression = TRUE) AS widget_impressions,
  COUNT(*) FILTER (WHERE status_code = 200) AS successful_requests,
  COUNT(*) FILTER (WHERE status_code >= 400) AS failed_requests,
  COUNT(*) FILTER (WHERE cached = TRUE) AS cached_requests,
  AVG(response_time_ms) AS avg_response_time,
  COUNT(DISTINCT ip_address) AS unique_visitors
FROM usage_analytics
GROUP BY organization_id, api_key_id, date;

-- Index on materialized view
CREATE INDEX idx_daily_usage_summary_org_date
  ON daily_usage_summary(organization_id, date DESC);

-- Function: Refresh Daily Summary (call via cron job)
CREATE OR REPLACE FUNCTION refresh_daily_usage_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_usage_summary;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Comments
COMMENT ON TABLE usage_analytics IS 'Track API usage for billing and analytics';
COMMENT ON COLUMN usage_analytics.widget_impression IS 'Count as billable impression';
COMMENT ON FUNCTION track_usage IS 'Record API usage event';
COMMENT ON FUNCTION refresh_daily_usage_summary IS 'Refresh daily summary (run via cron)';
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Comments
COMMENT ON TABLE subscriptions IS 'Subscription plans and billing cycles';
COMMENT ON COLUMN subscriptions.plan_id IS 'demo | basic | premium | premium_plus | enterprise';
COMMENT ON COLUMN subscriptions.included_impressions IS 'Monthly widget impressions (NULL = unlimited)';
COMMENT ON FUNCTION create_trial_subscription IS 'Create 30-day trial subscription';
COMMENT ON FUNCTION upgrade_subscription IS 'Upgrade organization to paid plan';
COMMENT ON FUNCTION check_usage_quota IS 'Check if organization exceeded usage quota';
-- Migration: Create invoices table
-- Description: Invoice records for billing
-- Author: Claude
-- Date: 2025-12-21

CREATE TABLE IF NOT EXISTS invoices (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization & Subscription
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Invoice Info
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 25.00,
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NOK',

  -- Line Items
  line_items JSONB NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMPTZ,

  -- Payment
  stripe_invoice_id TEXT UNIQUE,
  payment_method TEXT,

  -- Files
  pdf_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('draft', 'sent', 'paid', 'overdue', 'void')
  ),
  CONSTRAINT valid_payment_method CHECK (
    payment_method IS NULL OR payment_method IN ('card', 'invoice', 'bank_transfer')
  )
);

-- Indexes
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their organization's invoices
CREATE POLICY "Users can view their organization's invoices"
  ON invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Generate Invoice Number
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

-- Function: Create Monthly Invoice
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

-- Function: Mark Invoice as Paid
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

-- Comments
COMMENT ON TABLE invoices IS 'Invoice records for billing';
COMMENT ON COLUMN invoices.line_items IS 'Array of invoice line items (subscription + overage)';
COMMENT ON FUNCTION generate_invoice_number IS 'Generate unique invoice number (INV-YYYY-XXXXXX)';
COMMENT ON FUNCTION create_monthly_invoice IS 'Generate monthly invoice with usage-based billing';
COMMENT ON FUNCTION mark_invoice_paid IS 'Mark invoice as paid';
-- Migration: Create widget_instances table
-- Description: Track deployed widget instances
-- Author: Claude
-- Date: 2025-12-21

CREATE TABLE IF NOT EXISTS widget_instances (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization & Key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Instance Info
  widget_type TEXT NOT NULL,
  instance_id TEXT NOT NULL,

  -- Deployment
  origin TEXT NOT NULL,
  page_url TEXT,
  page_title TEXT,

  -- Configuration
  config JSONB DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Stats (aggregated from usage_analytics)
  total_impressions BIGINT DEFAULT 0,
  total_interactions BIGINT DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_widget_type CHECK (widget_type IN ('forecast', 'map', 'chat')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive')),
  CONSTRAINT unique_instance UNIQUE (organization_id, instance_id)
);

-- Indexes
CREATE INDEX idx_widget_instances_organization_id ON widget_instances(organization_id);
CREATE INDEX idx_widget_instances_api_key_id ON widget_instances(api_key_id);
CREATE INDEX idx_widget_instances_widget_type ON widget_instances(widget_type);
CREATE INDEX idx_widget_instances_last_seen_at ON widget_instances(last_seen_at DESC);
CREATE INDEX idx_widget_instances_origin ON widget_instances(origin);

-- Enable Row Level Security
ALTER TABLE widget_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their organization's widget instances
CREATE POLICY "Users can view their organization's widget instances"
  ON widget_instances FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_widget_instances_updated_at
  BEFORE UPDATE ON widget_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Register Widget Instance
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

-- Function: Update Widget Stats
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

-- Comments
COMMENT ON TABLE widget_instances IS 'Track deployed widget instances';
COMMENT ON COLUMN widget_instances.instance_id IS 'UUID generated client-side';
COMMENT ON COLUMN widget_instances.config IS 'Widget configuration (theme, location, etc.)';
COMMENT ON FUNCTION register_widget_instance IS 'Register or update widget instance';
COMMENT ON FUNCTION update_widget_stats IS 'Update widget statistics (run via cron)';
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

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
$$ LANGUAGE plpgsql
SET search_path = '';

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
-- Migration: Create RLS Policies
-- Description: Row Level Security policies for all tables
-- Author: Claude
-- Date: 2025-12-23
-- Note: Must run after all tables are created

-- Organizations: Users can view their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- Service role has full access to all tables
CREATE POLICY "Service role has full access to organizations"
  ON organizations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Users: Can view users in their organization
CREATE POLICY "Users can view their own organization users"
  ON users FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to users"
  ON users FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- API Keys: Organization admins can manage their keys
CREATE POLICY "Organization admins can view their API keys"
  ON api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role has full access to api_keys"
  ON api_keys FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Usage Analytics: Organization members can view their usage
CREATE POLICY "Organization members can view their usage analytics"
  ON usage_analytics FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to usage_analytics"
  ON usage_analytics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Subscriptions: Organization admins can view subscriptions
CREATE POLICY "Organization admins can view their subscriptions"
  ON subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role has full access to subscriptions"
  ON subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Invoices: Organization admins can view invoices
CREATE POLICY "Organization admins can view their invoices"
  ON invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role has full access to invoices"
  ON invoices FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Widget Instances: Organization members can view widgets
CREATE POLICY "Organization members can view their widget instances"
  ON widget_instances FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to widget_instances"
  ON widget_instances FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    user_id IN (
      SELECT id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to notifications"
  ON notifications FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Comments
COMMENT ON POLICY "Users can view their own organization" ON organizations IS
  'Users can only see data for their own organization';
COMMENT ON POLICY "Service role has full access to organizations" ON organizations IS
  'Backend service has unrestricted access for admin operations';
