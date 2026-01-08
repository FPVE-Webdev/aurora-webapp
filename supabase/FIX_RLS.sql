-- Temporary: Disable RLS for testing with service_role key
-- This allows the backend to access tables directly

ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE widget_instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Verify data exists
SELECT 'Setup verified!' AS status,
       (SELECT COUNT(*) FROM organizations) AS organizations,
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM api_keys) AS api_keys,
       (SELECT COUNT(*) FROM subscriptions) AS subscriptions;
