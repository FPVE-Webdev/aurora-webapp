-- NOAA Historical Data Storage
-- Phase 2: Advanced Analytics
-- Created: 2025-12-25

-- Drop tables if exist (for development)
DROP TABLE IF EXISTS noaa_historical_data CASCADE;
DROP TABLE IF EXISTS noaa_data_quality CASCADE;

-- Main historical data table
CREATE TABLE noaa_historical_data (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,

  -- Kp Index data
  kp_index DECIMAL(3,2),
  kp_observed BOOLEAN DEFAULT false,

  -- Solar Wind data
  solar_wind_speed INTEGER,
  solar_wind_density DECIMAL(6,2),
  solar_wind_temperature INTEGER,

  -- Magnetic Field data (IMF)
  bz_component DECIMAL(6,2),
  bt_total DECIMAL(6,2),
  by_component DECIMAL(6,2),

  -- Aurora probability (calculated)
  aurora_probability INTEGER,

  -- Data quality metrics
  observation_quality VARCHAR(20) DEFAULT 'good',
  data_source VARCHAR(50) DEFAULT 'NOAA SWPC',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(timestamp),
  CHECK (kp_index >= 0 AND kp_index <= 9),
  CHECK (aurora_probability >= 0 AND aurora_probability <= 100)
);

-- Data quality tracking table
CREATE TABLE noaa_data_quality (
  id BIGSERIAL PRIMARY KEY,
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Quality metrics
  kp_data_available BOOLEAN,
  solar_wind_data_available BOOLEAN,
  mag_field_data_available BOOLEAN,

  -- Error tracking
  last_kp_fetch_error TEXT,
  last_solar_wind_fetch_error TEXT,
  last_mag_field_fetch_error TEXT,

  -- Performance metrics
  kp_fetch_duration_ms INTEGER,
  solar_wind_fetch_duration_ms INTEGER,
  total_records_stored INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_noaa_timestamp ON noaa_historical_data(timestamp DESC);
CREATE INDEX idx_noaa_kp ON noaa_historical_data(kp_index);
CREATE INDEX idx_noaa_aurora_prob ON noaa_historical_data(aurora_probability);
CREATE INDEX idx_noaa_created_at ON noaa_historical_data(created_at DESC);

-- Composite index for date range queries
CREATE INDEX idx_noaa_timestamp_kp ON noaa_historical_data(timestamp DESC, kp_index);

-- Index for data quality monitoring
CREATE INDEX idx_quality_timestamp ON noaa_data_quality(check_timestamp DESC);

-- Function to calculate aurora probability
CREATE OR REPLACE FUNCTION calculate_aurora_probability(
  p_kp DECIMAL,
  p_solar_wind_speed INTEGER,
  p_bz DECIMAL
) RETURNS INTEGER AS $$
DECLARE
  probability INTEGER;
BEGIN
  -- Base probability from Kp index (0-9 scale)
  probability := ROUND((p_kp / 9.0) * 100)::INTEGER;

  -- Boost if solar wind speed is high (> 500 km/s)
  IF p_solar_wind_speed > 500 THEN
    probability := probability + 10;
  END IF;

  IF p_solar_wind_speed > 700 THEN
    probability := probability + 20;
  END IF;

  -- Boost if Bz is negative (southward IMF)
  IF p_bz < -3 THEN
    probability := probability + 15;
  END IF;

  IF p_bz < -7 THEN
    probability := probability + 25;
  END IF;

  -- Cap at 100%
  IF probability > 100 THEN
    probability := 100;
  END IF;

  RETURN probability;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_noaa_historical_updated_at
  BEFORE UPDATE ON noaa_historical_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get trend analysis
CREATE OR REPLACE FUNCTION get_kp_trend(hours INTEGER DEFAULT 3)
RETURNS TABLE(
  current_kp DECIMAL,
  avg_kp DECIMAL,
  trend VARCHAR,
  change_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_data AS (
    SELECT
      kp_index,
      timestamp,
      ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
    FROM noaa_historical_data
    WHERE
      timestamp > NOW() - (hours || ' hours')::INTERVAL
      AND kp_index IS NOT NULL
    ORDER BY timestamp DESC
  ),
  stats AS (
    SELECT
      (SELECT kp_index FROM recent_data WHERE rn = 1) as curr_kp,
      AVG(kp_index) as average_kp,
      (SELECT kp_index FROM recent_data WHERE rn = 1) -
      (SELECT kp_index FROM recent_data ORDER BY rn DESC LIMIT 1) as kp_change
    FROM recent_data
  )
  SELECT
    curr_kp,
    ROUND(average_kp, 2),
    CASE
      WHEN kp_change > 0.5 THEN 'rising'::VARCHAR
      WHEN kp_change < -0.5 THEN 'falling'::VARCHAR
      ELSE 'stable'::VARCHAR
    END,
    ROUND(kp_change / hours, 2)
  FROM stats;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old data (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_noaa_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM noaa_historical_data
  WHERE timestamp < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE noaa_historical_data IS 'Historical space weather data from NOAA SWPC for trend analysis and ML training';
COMMENT ON TABLE noaa_data_quality IS 'Data quality monitoring and error tracking for NOAA data collection';
COMMENT ON FUNCTION calculate_aurora_probability IS 'Calculates aurora viewing probability based on Kp, solar wind speed, and Bz';
COMMENT ON FUNCTION get_kp_trend IS 'Analyzes Kp index trend over specified time period';
COMMENT ON FUNCTION cleanup_old_noaa_data IS 'Removes data older than 90 days to manage storage';

-- Grant permissions (adjust based on your setup)
-- ALTER TABLE noaa_historical_data ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE noaa_data_quality ENABLE ROW LEVEL SECURITY;
