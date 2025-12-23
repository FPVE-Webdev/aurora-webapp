-- Migration: Create RLS Policies
-- Description: Row Level Security policies for all tables
-- Author: Claude
-- Date: 2025-12-23
-- Note: Must run after all tables are created

-- Organizations: Users can view their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- Service role has full access to all tables
CREATE POLICY "Service role has full access to organizations"
  ON organizations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Users: Can view users in their organization
CREATE POLICY "Users can view their own organization users"
  ON users FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to users"
  ON users FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- API Keys: Organization admins can manage their keys
CREATE POLICY "Organization admins can view their API keys"
  ON api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role has full access to api_keys"
  ON api_keys FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Usage Analytics: Organization members can view their usage
CREATE POLICY "Organization members can view their usage analytics"
  ON usage_analytics FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to usage_analytics"
  ON usage_analytics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Subscriptions: Organization admins can view subscriptions
CREATE POLICY "Organization admins can view their subscriptions"
  ON subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role has full access to subscriptions"
  ON subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Invoices: Organization admins can view invoices
CREATE POLICY "Organization admins can view their invoices"
  ON invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role has full access to invoices"
  ON invoices FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Widget Instances: Organization members can view widgets
CREATE POLICY "Organization members can view their widget instances"
  ON widget_instances FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to widget_instances"
  ON widget_instances FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    user_id IN (
      SELECT id
      FROM users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to notifications"
  ON notifications FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Comments
COMMENT ON POLICY "Users can view their own organization" ON organizations IS
  'Users can only see data for their own organization';
COMMENT ON POLICY "Service role has full access to organizations" ON organizations IS
  'Backend service has unrestricted access for admin operations';
