#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔄 Running migration: create_push_subscriptions');
console.log('');

async function runMigration() {
  try {
    // Check if table already exists
    console.log('📊 Checking if push_subscriptions table exists...');
    const { data: tables, error: checkError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table push_subscriptions already exists!');
      console.log('');
      return;
    }

    console.log('⚠️  Table does not exist, creating...');
    console.log('');

    // Read and execute migration
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260117_create_push_subscriptions.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Please run this SQL manually in Supabase Dashboard:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu/sql/new');
    console.log('2. Copy the SQL below');
    console.log('3. Paste and click "Run"');
    console.log('');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log('');
    console.log('Or run: cat supabase/migrations/20260117_create_push_subscriptions.sql');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
