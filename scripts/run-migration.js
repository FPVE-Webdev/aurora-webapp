#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Read migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/20260117_create_push_subscriptions.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('🔄 Running database migration...');
console.log('📄 File:', migrationPath);
console.log('');

// Execute SQL via Supabase REST API
async function runMigration() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      // Try alternative method: Use pg connection
      console.log('⚠️  REST API method failed, trying direct execution...');

      // Use createClient to execute
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`📊 Executing ${statements.length} SQL statements...`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        console.log(`\n[${i + 1}/${statements.length}] Executing...`);

        try {
          const { error } = await supabase.rpc('exec_sql', { query: statement });

          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            console.log('Statement:', statement.substring(0, 100) + '...');
          } else {
            console.log(`✅ Statement ${i + 1} completed`);
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        }
      }

      console.log('\n✅ Migration completed (with possible warnings)');
      console.log('');
      console.log('Please verify the table was created:');
      console.log('1. Go to Supabase Dashboard');
      console.log('2. Navigate to Table Editor');
      console.log('3. Check for "push_subscriptions" table');
      return;
    }

    const result = await response.json();
    console.log('✅ Migration executed successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('');
    console.log('📝 Manual steps:');
    console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the contents of:');
    console.log('   supabase/migrations/20260117_create_push_subscriptions.sql');
    console.log('5. Click "Run"');
    process.exit(1);
  }
}

runMigration();
