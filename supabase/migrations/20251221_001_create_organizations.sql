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

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE organizations IS 'B2B customers (hotels, tour operators, etc.)';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly identifier: radisson-blu-tromso';
COMMENT ON COLUMN organizations.status IS 'trial | active | suspended | cancelled';
