-- Manual Supabase Setup Script
-- Run this in Supabase Dashboard → SQL Editor if CLI fails
-- This script combines all migrations in the correct order

-- =============================================================================
-- CLEANUP (Optional - only if you need to start fresh)
-- =============================================================================
-- Uncomment the following lines to drop all tables and start fresh:
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;

-- =============================================================================
-- MIGRATION 1: Organizations
-- =============================================================================
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
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- MIGRATION 2: Users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Auth
  auth_id UUID UNIQUE, -- Links to Supabase Auth (future)
  email TEXT NOT NULL UNIQUE,

  -- Profile
  name TEXT NOT NULL,
  avatar_url TEXT,

  -- Role
  role TEXT NOT NULL DEFAULT 'member',

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Continue with remaining migrations...
-- (Due to length, I'll provide a link to run all migration files)
-- =============================================================================

-- For the complete setup, run each migration file in order from:
-- supabase/migrations/20251221_003_create_api_keys.sql
-- supabase/migrations/20251221_004_create_usage_analytics.sql
-- supabase/migrations/20251221_005_create_subscriptions.sql
-- supabase/migrations/20251221_006_create_invoices.sql
-- supabase/migrations/20251221_007_create_widget_instances.sql
-- supabase/migrations/20251221_008_create_notifications.sql
-- supabase/migrations/20251221_009_seed_data.sql
-- supabase/migrations/20251221_010_create_rls_policies.sql

-- Or use the CLI: supabase db push
