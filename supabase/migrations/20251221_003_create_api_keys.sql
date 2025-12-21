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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE api_keys IS 'API keys for authentication and usage tracking';
COMMENT ON COLUMN api_keys.key IS 'Full API key (shown once at creation)';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash for verification';
COMMENT ON COLUMN api_keys.environment IS 'test | production';
COMMENT ON FUNCTION generate_api_key IS 'Generate new API key for organization';
COMMENT ON FUNCTION verify_api_key IS 'Verify API key and return organization info';
