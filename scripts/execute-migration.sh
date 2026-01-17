#!/bin/bash

# Get Supabase credentials from .env.local
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2)
SUPABASE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2)

echo "🔄 Executing migration via Supabase SQL API..."
echo ""

# Read SQL file
SQL_CONTENT=$(cat supabase/migrations/20260117_create_push_subscriptions.sql)

# Execute via curl (Supabase REST API)
# Note: This requires the pg_net extension or similar

echo "📝 Opening Supabase Dashboard..."
echo ""
echo "Please run the migration manually:"
echo "1. Click this link: https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu/sql/new"
echo "2. Copy the SQL from: supabase/migrations/20260117_create_push_subscriptions.sql"
echo "3. Paste and click 'Run'"
echo ""
echo "Or copy from output above"
echo ""

# Open browser
open "https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu/sql/new"
