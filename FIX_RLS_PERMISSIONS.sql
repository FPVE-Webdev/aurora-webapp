-- Fix RLS Permissions for push_subscriptions
-- This allows service role (backend) to read/write subscriptions

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can subscribe to push notifications" ON push_subscriptions;
DROP POLICY IF EXISTS "Anyone can update their own subscription" ON push_subscriptions;
DROP POLICY IF EXISTS "Anyone can unsubscribe" ON push_subscriptions;

-- Create permissive policies that allow both anonymous users and service role

-- Policy 1: Allow INSERT for everyone (anonymous users can subscribe)
CREATE POLICY "Enable insert for all users"
  ON push_subscriptions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy 2: Allow SELECT for service role (backend needs to read)
CREATE POLICY "Enable select for service role"
  ON push_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

-- Policy 3: Allow SELECT for authenticated users (future feature)
CREATE POLICY "Enable select for authenticated users"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 4: Allow UPDATE for everyone (users can update their preferences)
CREATE POLICY "Enable update for all users"
  ON push_subscriptions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Policy 5: Allow DELETE for everyone (users can unsubscribe)
CREATE POLICY "Enable delete for all users"
  ON push_subscriptions
  FOR DELETE
  TO public
  USING (true);

-- Verify policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'push_subscriptions'
ORDER BY policyname;
