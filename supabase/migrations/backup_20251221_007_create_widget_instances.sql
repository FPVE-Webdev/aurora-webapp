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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE widget_instances IS 'Track deployed widget instances';
COMMENT ON COLUMN widget_instances.instance_id IS 'UUID generated client-side';
COMMENT ON COLUMN widget_instances.config IS 'Widget configuration (theme, location, etc.)';
COMMENT ON FUNCTION register_widget_instance IS 'Register or update widget instance';
COMMENT ON FUNCTION update_widget_stats IS 'Update widget statistics (run via cron)';
