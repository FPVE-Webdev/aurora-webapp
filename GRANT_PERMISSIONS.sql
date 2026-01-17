-- Grant permissions for push_subscriptions table
-- This ensures both service_role and anon can access the table

-- Grant all privileges to service_role (backend)
GRANT ALL ON TABLE push_subscriptions TO service_role;
GRANT ALL ON TABLE push_subscriptions TO postgres;

-- Grant specific privileges to anon (frontend)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE push_subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE push_subscriptions TO authenticated;

-- Grant usage on sequence (for id generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify grants
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'push_subscriptions'
ORDER BY grantee, privilege_type;
