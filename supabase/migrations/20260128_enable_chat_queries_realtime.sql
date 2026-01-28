-- Enable Realtime for chat_queries table
-- This migration enables Supabase Realtime subscriptions on the chat_queries table
-- Required for live query feeds and real-time analytics

-- Alter chat_queries to enable REPLICA IDENTITY FULL for replication
ALTER TABLE public.chat_queries REPLICA IDENTITY FULL;

-- Enable replication on the chat_queries table
-- This allows real-time subscriptions via the Realtime API
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_queries;

-- Add comment for documentation
COMMENT ON TABLE public.chat_queries IS 'Chat queries table with Realtime enabled for live analytics feeds';
