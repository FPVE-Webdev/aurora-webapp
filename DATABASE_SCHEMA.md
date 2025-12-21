# 🗄️ Multi-Tenant Database Schema

**Aurora.tromso.ai B2B SaaS Platform**

Complete database schema for multi-tenant widget platform with usage tracking, billing, and customer management.

---

## 📊 Schema Overview

```
┌─────────────────┐
│  Organizations  │──┐
└─────────────────┘  │
                     │
         ┌───────────┴──────────┐
         │                      │
    ┌────▼────┐          ┌──────▼──────┐
    │ API Keys│          │    Users    │
    └────┬────┘          └──────┬──────┘
         │                      │
    ┌────▼────────────────┐    │
    │  Usage Analytics    │◄───┘
    └─────────────────────┘

┌──────────────────┐
│ Subscriptions    │
└────┬─────────────┘
     │
┌────▼──────────┐
│  Invoices     │
└───────────────┘
```

---

## 🏢 Table: `organizations`

**Purpose:** B2B customers (hotels, tour operators, etc.)

```sql
CREATE TABLE organizations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Company Info
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly: "radisson-blu-tromso"
  domain TEXT, -- Optional: "radissonblu.com"

  -- Contact
  email TEXT NOT NULL,
  phone TEXT,

  -- Address
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'NO',

  -- Business Info
  org_number TEXT, -- Norwegian org.nr: "123456789"
  vat_number TEXT, -- EU VAT: "NO123456789MVA"

  -- Billing
  billing_email TEXT,
  invoice_reference TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'trial',
    -- 'trial' | 'active' | 'suspended' | 'cancelled'
  trial_ends_at TIMESTAMPTZ,

  -- Settings
  settings JSONB DEFAULT '{}',
    -- { theme: 'dark', language: 'no', branding: { logo: '...' } }

  -- Metadata
  metadata JSONB DEFAULT '{}',
    -- { source: 'website', referrer: '...', notes: '...' }

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);
```

---

## 👥 Table: `users`

**Purpose:** Individual users within organizations

```sql
CREATE TABLE users (
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
  auth_id UUID, -- Links to Supabase auth.users.id

  -- Role
  role TEXT NOT NULL DEFAULT 'member',
    -- 'owner' | 'admin' | 'member' | 'viewer'

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
    -- 'active' | 'inactive' | 'invited'
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
```

---

## 🔑 Table: `api_keys`

**Purpose:** API keys for authentication and usage tracking

```sql
CREATE TABLE api_keys (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Key
  key TEXT UNIQUE NOT NULL, -- "tro_live_abc123..." or "tro_test_xyz789..."
  key_prefix TEXT NOT NULL, -- First 15 chars for display: "tro_live_abc123"
  key_hash TEXT NOT NULL, -- SHA-256 hash for verification

  -- Metadata
  name TEXT NOT NULL, -- Human-readable: "Production Website"
  description TEXT,

  -- Type
  environment TEXT NOT NULL DEFAULT 'production',
    -- 'test' | 'production'

  -- Permissions
  scopes JSONB DEFAULT '["aurora:read"]',
    -- ['aurora:read', 'analytics:read', 'widgets:embed']

  -- Rate Limits
  rate_limit_tier TEXT NOT NULL DEFAULT 'basic',
    -- 'demo' | 'basic' | 'premium' | 'premium_plus'
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 10000,

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
    -- 'active' | 'revoked' | 'expired'
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Security
  allowed_origins JSONB DEFAULT '["*"]',
    -- ['https://example.com', 'https://www.example.com']
  ip_whitelist JSONB,
    -- ['192.168.1.1', '10.0.0.0/24']

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_environment CHECK (environment IN ('test', 'production')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'revoked', 'expired')),
  CONSTRAINT valid_key_format CHECK (key ~ '^tro_(live|test)_[a-zA-Z0-9]{32}$')
);

-- Indexes
CREATE UNIQUE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_status ON api_keys(status) WHERE status = 'active';
CREATE INDEX idx_api_keys_last_used_at ON api_keys(last_used_at DESC);
```

---

## 📊 Table: `usage_analytics`

**Purpose:** Track API usage per organization/key for billing and analytics

```sql
CREATE TABLE usage_analytics (
  -- Identity
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization & Key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Request Info
  endpoint TEXT NOT NULL, -- '/api/aurora/now'
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INTEGER NOT NULL, -- 200, 401, 429, etc.

  -- Response
  response_time_ms INTEGER, -- Latency in milliseconds
  cached BOOLEAN DEFAULT FALSE,

  -- Widget Specific (if applicable)
  widget_type TEXT, -- 'forecast' | 'map' | 'chat' | null
  widget_impression BOOLEAN DEFAULT FALSE, -- Count as billable impression

  -- Origin
  origin TEXT, -- 'https://example.com'
  user_agent TEXT,
  ip_address INET,
  country_code TEXT, -- 'NO', 'SE', etc. (from IP geolocation)

  -- Metadata
  metadata JSONB DEFAULT '{}',
    -- { referer: '...', user_id: '...', custom_data: {} }

  -- Partitioning key (for time-series optimization)
  date DATE NOT NULL DEFAULT CURRENT_DATE
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

-- Partitioning (for performance at scale)
-- Future: Partition by month for better query performance
-- ALTER TABLE usage_analytics PARTITION BY RANGE (date);
```

---

## 💳 Table: `subscriptions`

**Purpose:** Subscription plans and billing cycles

```sql
CREATE TABLE subscriptions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Plan
  plan_id TEXT NOT NULL,
    -- 'demo' | 'basic' | 'premium' | 'premium_plus' | 'enterprise'
  plan_name TEXT NOT NULL, -- "Premium Plan"

  -- Pricing
  price_monthly DECIMAL(10,2) NOT NULL, -- 3500.00 NOK
  currency TEXT NOT NULL DEFAULT 'NOK',

  -- Billing Cycle
  billing_period TEXT NOT NULL DEFAULT 'monthly',
    -- 'monthly' | 'yearly'
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
    -- 'trialing' | 'active' | 'past_due' | 'cancelled' | 'unpaid'
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,

  -- Usage Limits
  included_impressions INTEGER, -- Monthly included impressions
  overage_rate DECIMAL(10,4), -- Price per additional 1000 impressions

  -- Features
  features JSONB DEFAULT '{}',
    -- {
    --   remove_branding: true,
    --   custom_domain: true,
    --   priority_support: true
    -- }

  -- Payment
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('trialing', 'active', 'past_due', 'cancelled', 'unpaid')
  ),
  CONSTRAINT valid_billing_period CHECK (billing_period IN ('monthly', 'yearly'))
);

-- Indexes
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
```

---

## 🧾 Table: `invoices`

**Purpose:** Invoice records for billing

```sql
CREATE TABLE invoices (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization & Subscription
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Invoice Info
  invoice_number TEXT UNIQUE NOT NULL, -- "INV-2025-001234"
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL, -- Before tax
  tax_rate DECIMAL(5,2) DEFAULT 25.00, -- Norwegian MVA: 25%
  tax_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL, -- After tax
  currency TEXT NOT NULL DEFAULT 'NOK',

  -- Line Items
  line_items JSONB NOT NULL,
    -- [
    --   {
    --     description: "Premium Plan",
    --     quantity: 1,
    --     unit_price: 7000,
    --     amount: 7000
    --   },
    --   {
    --     description: "Overage (10K impressions)",
    --     quantity: 10,
    --     unit_price: 50,
    --     amount: 500
    --   }
    -- ]

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
    -- 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
  paid_at TIMESTAMPTZ,

  -- Payment
  stripe_invoice_id TEXT UNIQUE,
  payment_method TEXT, -- 'card' | 'invoice' | 'bank_transfer'

  -- Files
  pdf_url TEXT, -- S3/Supabase Storage URL

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('draft', 'sent', 'paid', 'overdue', 'void')
  )
);

-- Indexes
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
```

---

## 🎫 Table: `widget_instances`

**Purpose:** Track deployed widget instances for analytics

```sql
CREATE TABLE widget_instances (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization & Key
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Instance Info
  widget_type TEXT NOT NULL, -- 'forecast' | 'map' | 'chat'
  instance_id TEXT NOT NULL, -- UUID generated client-side

  -- Deployment
  origin TEXT NOT NULL, -- 'https://example.com'
  page_url TEXT, -- Full URL where widget is embedded
  page_title TEXT,

  -- Configuration
  config JSONB DEFAULT '{}',
    -- { theme: 'dark', location: 'tromso', language: 'no' }

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
    -- 'active' | 'inactive'
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
```

---

## 🔔 Table: `notifications`

**Purpose:** System notifications for users (billing, usage alerts, etc.)

```sql
CREATE TABLE notifications (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Recipient
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Notification
  type TEXT NOT NULL,
    -- 'billing_warning' | 'usage_limit' | 'api_key_created' | 'subscription_expiring'
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Priority
  priority TEXT NOT NULL DEFAULT 'info',
    -- 'info' | 'warning' | 'critical'

  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Action
  action_url TEXT, -- Link to relevant page
  action_label TEXT, -- "View Invoice"

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_priority CHECK (priority IN ('info', 'warning', 'critical'))
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

---

## 📈 Materialized Views (for Performance)

### Daily Usage Summary

```sql
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

-- Refresh daily
CREATE INDEX idx_daily_usage_summary_org_date
  ON daily_usage_summary(organization_id, date DESC);
```

---

## 🔐 Row Level Security (RLS) Policies

**Enable RLS on all tables:**

```sql
-- Organizations: Users can only see their own organization
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- API Keys: Users can only manage their organization's keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's API keys"
  ON api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- Usage Analytics: Users can only view their organization's usage
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's usage"
  ON usage_analytics FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- Similar policies for other tables...
```

---

## 🎯 Seed Data (for Testing)

```sql
-- Demo Organization
INSERT INTO organizations (id, name, slug, email, status, trial_ends_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Organization',
  'demo',
  'demo@example.com',
  'trial',
  NOW() + INTERVAL '30 days'
);

-- Demo API Key
INSERT INTO api_keys (
  organization_id,
  key,
  key_prefix,
  key_hash,
  name,
  environment,
  rate_limit_tier,
  rate_limit_per_hour
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'tro_demo_test_key',
  'tro_demo_test_k',
  -- SHA-256 hash of 'tro_demo_test_key'
  encode(digest('tro_demo_test_key', 'sha256'), 'hex'),
  'Demo Test Key',
  'test',
  'demo',
  100
);

-- Demo Subscription
INSERT INTO subscriptions (
  organization_id,
  plan_id,
  plan_name,
  price_monthly,
  current_period_start,
  current_period_end,
  status,
  included_impressions
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo',
  'Demo Plan',
  0.00,
  NOW(),
  NOW() + INTERVAL '30 days',
  'trialing',
  1000
);
```

---

## 📊 Usage Tracking Example Queries

### Monthly Impressions by Organization

```sql
SELECT
  o.name AS organization_name,
  DATE_TRUNC('month', ua.timestamp) AS month,
  COUNT(*) FILTER (WHERE ua.widget_impression = TRUE) AS impressions,
  s.included_impressions,
  GREATEST(0, COUNT(*) FILTER (WHERE ua.widget_impression = TRUE) - s.included_impressions) AS overage
FROM usage_analytics ua
JOIN organizations o ON ua.organization_id = o.id
JOIN subscriptions s ON o.id = s.organization_id
WHERE ua.timestamp >= NOW() - INTERVAL '3 months'
GROUP BY o.id, o.name, month, s.included_impressions
ORDER BY month DESC, impressions DESC;
```

### API Performance by Endpoint

```sql
SELECT
  endpoint,
  COUNT(*) AS total_requests,
  AVG(response_time_ms) AS avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_response_time,
  COUNT(*) FILTER (WHERE status_code >= 400) AS error_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status_code >= 400) / COUNT(*), 2) AS error_rate_pct
FROM usage_analytics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY total_requests DESC;
```

---

## 🚀 Next Steps

1. **Create Supabase Migration Files**
   - Split into multiple migration files
   - Test locally with Supabase CLI

2. **Add Database Functions**
   - `generate_api_key()` - Create secure API keys
   - `track_usage()` - Record API usage
   - `calculate_monthly_bill()` - Calculate invoice

3. **Add Triggers**
   - `updated_at` auto-update trigger
   - Usage quota warning notifications
   - Automatic invoice generation

4. **Optimize Queries**
   - Add more indexes based on query patterns
   - Implement partitioning for usage_analytics
   - Set up automated VACUUM and ANALYZE

---

**Schema Version:** 1.0.0
**Last Updated:** 21. desember 2025
**Status:** Ready for Implementation
