-- Migration: Fix RLS Performance Issues
-- Description: Optimize RLS policies to prevent re-evaluation and fix duplicate indexes
-- Author: Claude
-- Date: 2026-01-02
-- References:
--   - https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--   - https://supabase.com/docs/guides/database/database-linter

-- =====================================================
-- PART 1: Drop existing inefficient policies
-- =====================================================

-- Organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Service role has full access to organizations" ON organizations;

-- Users
DROP POLICY IF EXISTS "Users can view their organization's users" ON users;
DROP POLICY IF EXISTS "Users can view their own organization users" ON users;
DROP POLICY IF EXISTS "Service role has full access to users" ON users;

-- API Keys
DROP POLICY IF EXISTS "Users can view their organization's API keys" ON api_keys;
DROP POLICY IF EXISTS "Organization admins can view their API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can create API keys" ON api_keys;
DROP POLICY IF EXISTS "Service role has full access to api_keys" ON api_keys;

-- Usage Analytics
DROP POLICY IF EXISTS "Users can view their organization's usage" ON usage_analytics;
DROP POLICY IF EXISTS "Organization members can view their usage analytics" ON usage_analytics;
DROP POLICY IF EXISTS "Service role has full access to usage_analytics" ON usage_analytics;

-- Subscriptions
DROP POLICY IF EXISTS "Users can view their organization's subscription" ON subscriptions;
DROP POLICY IF EXISTS "Organization admins can view their subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role has full access to subscriptions" ON subscriptions;

-- Invoices
DROP POLICY IF EXISTS "Users can view their organization's invoices" ON invoices;
DROP POLICY IF EXISTS "Organization admins can view their invoices" ON invoices;
DROP POLICY IF EXISTS "Service role has full access to invoices" ON invoices;

-- Widget Instances
DROP POLICY IF EXISTS "Users can view their organization's widget instances" ON widget_instances;
DROP POLICY IF EXISTS "Organization members can view their widget instances" ON widget_instances;
DROP POLICY IF EXISTS "Service role has full access to widget_instances" ON widget_instances;

-- Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role has full access to notifications" ON notifications;

-- =====================================================
-- PART 2: Drop duplicate index
-- =====================================================

-- api_keys has duplicate indexes: api_keys_key_key and idx_api_keys_key
-- Keep idx_api_keys_key (more descriptive name), drop the auto-generated one
DROP INDEX IF EXISTS api_keys_key_key;

-- =====================================================
-- PART 3: Create optimized RLS policies
-- =====================================================

-- Organizations: Users can view their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = (select auth.uid())
    )
  );

-- Organizations: Service role has full access
CREATE POLICY "Service role has full access to organizations"
  ON organizations FOR ALL
  USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Users: Can view users in their organization
CREATE POLICY "Users can view their own organization users"
  ON users FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = (select auth.uid())
    )
  );

-- Users: Service role has full access
CREATE POLICY "Service role has full access to users"
  ON users FOR ALL
  USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- API Keys: Organization admins can view their API keys
CREATE POLICY "Organization admins can view their API keys"
  ON api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = (select auth.uid())
        AND role IN ('owner', 'admin')
    )
  );

-- API Keys: Admins can create API keys
CREATE POLICY "Admins can create API keys"
  ON api_keys FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = (select auth.uid())
        AND role IN ('owner', 'admin')
    )
  );

-- API Keys: Service role has full access
CREATE POLICY "Service role has full access to api_keys"
  ON api_keys FOR ALL
  USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Usage Analytics: Organization members can view their usage
CREATE POLICY "Organization members can view their usage analytics"
  ON usage_analytics FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = (select auth.uid())
    )
  );

-- Usage Analytics: Service role has full access
CREATE POLICY "Service role has full access to usage_analytics"
  ON usage_analytics FOR ALL
  USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Subscriptions: Organization admins can view subscriptions
CREATE POLICY "Organization admins can view their subscriptions"
  ON subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = (select auth.uid())
        AND role IN ('owner', 'admin')
    )
  );

-- Subscriptions: Service role has full access
CREATE POLICY "Service role has full access to subscriptions"
  ON subscriptions FOR ALL
  USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Invoices: Organization admins can view invoices
CREATE POLICY "Organization admins can view their invoices"
  ON invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = (select auth.uid())
        AND role IN ('owner', 'admin')
    )
  );

-- Invoices: Service role has full access
CREATE POLICY "Service role has full access to invoices"
  ON invoices FOR ALL
  USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Widget Instances: Organization members can view widgets
CREATE POLICY "Organization members can view their widget instances"
  ON widget_instances FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = (select auth.uid())
    )
  );

-- Widget Instances: Service role has full access
CREATE POLICY "Service role has full access to widget_instances"
  ON widget_instances FOR ALL
  USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    user_id IN (
      SELECT id
      FROM users
      WHERE auth_id = (select auth.uid())
    )
  );

-- Notifications: Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id IN (
      SELECT id
      FROM users
      WHERE auth_id = (select auth.uid())
    )
  );

-- Notifications: Service role has full access
CREATE POLICY "Service role has full access to notifications"
  ON notifications FOR ALL
  USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- PART 4: Comments
-- =====================================================

COMMENT ON POLICY "Users can view their own organization" ON organizations IS
  'Users can only see data for their own organization (optimized with subquery)';
COMMENT ON POLICY "Service role has full access to organizations" ON organizations IS
  'Backend service has unrestricted access for admin operations';
