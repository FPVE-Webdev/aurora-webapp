-- Grant full permissions to service_role and postgres for all tables

-- Drop existing policies that may conflict
DROP POLICY IF EXISTS "Service role has full access to organizations" ON organizations;
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
DROP POLICY IF EXISTS "Service role has full access to api_keys" ON api_keys;
DROP POLICY IF EXISTS "Service role has full access to subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role has full access to usage_analytics" ON usage_analytics;
DROP POLICY IF EXISTS "Service role has full access to invoices" ON invoices;
DROP POLICY IF EXISTS "Service role has full access to widget_instances" ON widget_instances;
DROP POLICY IF EXISTS "Service role has full access to notifications" ON notifications;

-- Disable RLS on all tables (for backend access)
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE widget_instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Grant all privileges to authenticated and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Verify by counting rows
SELECT 
  'Database ready!' as status,
  (SELECT COUNT(*) FROM organizations) as organizations,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM api_keys) as api_keys,
  (SELECT COUNT(*) FROM subscriptions) as subscriptions,
  (SELECT COUNT(*) FROM widget_instances) as widgets,
  (SELECT COUNT(*) FROM notifications) as notifications,
  (SELECT COUNT(*) FROM usage_analytics) as analytics;
