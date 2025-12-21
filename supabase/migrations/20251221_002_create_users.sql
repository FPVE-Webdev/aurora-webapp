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
