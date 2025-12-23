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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE usage_analytics IS 'Track API usage for billing and analytics';
COMMENT ON COLUMN usage_analytics.widget_impression IS 'Count as billable impression';
COMMENT ON FUNCTION track_usage IS 'Record API usage event';
COMMENT ON FUNCTION refresh_daily_usage_summary IS 'Refresh daily summary (run via cron)';
