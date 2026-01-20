-- Create chat_queries table for suggested questions feature
-- Tracks anonymized user queries to generate popular question suggestions

CREATE TABLE IF NOT EXISTS chat_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en', -- 'en', 'no', 'de', etc.
  master_status TEXT, -- 'GO', 'WAIT', 'NO' - context when asked
  is_premium BOOLEAN DEFAULT false, -- User tier when asked
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast retrieval of recent popular queries
CREATE INDEX IF NOT EXISTS idx_chat_queries_created_at ON chat_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_queries_language ON chat_queries(language);
CREATE INDEX IF NOT EXISTS idx_chat_queries_master_status ON chat_queries(master_status);

-- No RLS needed - this is anonymized aggregate data for suggestions
-- No user_id column - completely anonymous
ALTER TABLE chat_queries ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert and read
CREATE POLICY "Allow service role full access to chat_queries"
ON chat_queries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow anonymous read access for suggested questions API
CREATE POLICY "Allow anonymous read access for suggestions"
ON chat_queries
FOR SELECT
TO anon
USING (true);

COMMENT ON TABLE chat_queries IS 'Anonymized chat queries for generating suggested questions based on popular user questions';
COMMENT ON COLUMN chat_queries.query_text IS 'The actual question text (anonymized, no personal info)';
COMMENT ON COLUMN chat_queries.language IS 'Language of the query for language-specific suggestions';
COMMENT ON COLUMN chat_queries.master_status IS 'Aurora conditions context (GO/WAIT/NO) when query was made';
