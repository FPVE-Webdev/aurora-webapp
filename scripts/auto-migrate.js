#!/usr/bin/env node

/**
 * Automatic migration runner for Supabase
 * Executes SQL via Supabase REST API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
};

const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Read migration SQL
const migrationPath = path.join(__dirname, '../supabase/migrations/20260117_create_push_subscriptions.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Aurora WebApp - Database Migration');
console.log('═'.repeat(60));
console.log('📄 Migration: 20260117_create_push_subscriptions.sql');
console.log('🎯 Target: Supabase Project (yoooexmshwfpsrhzisgu)');
console.log('═'.repeat(60));
console.log('');

// Execute SQL statements one by one
async function executeSQLstatement(statement) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

    const postData = JSON.stringify({ query: statement });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runMigration() {
  console.log('⚠️  Note: This requires the exec_sql RPC function in Supabase.');
  console.log('   If this fails, please run the migration manually.');
  console.log('');

  // Split SQL into statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && s !== '');

  console.log(`📊 Found ${statements.length} SQL statements`);
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    const preview = statement.substring(0, 60).replace(/\s+/g, ' ');

    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);

    try {
      await executeSQLstatement(statement);
      console.log('✅');
      successCount++;
    } catch (error) {
      console.log('❌');
      console.log(`    Error: ${error.message}`);
      failCount++;

      // Continue with next statement
    }
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log(`✅ Success: ${successCount} statements`);
  console.log(`❌ Failed: ${failCount} statements`);
  console.log('═'.repeat(60));

  if (failCount > 0) {
    console.log('');
    console.log('⚠️  Some statements failed. This might be normal if:');
    console.log('   - The table already exists');
    console.log('   - exec_sql RPC is not available');
    console.log('');
    console.log('📝 To run manually:');
    console.log('   1. Open: https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu/sql/new');
    console.log('   2. Copy: supabase/migrations/20260117_create_push_subscriptions.sql');
    console.log('   3. Paste and click "Run"');
    console.log('');
    console.log('Or read: RUN_MIGRATION.md');
  } else {
    console.log('');
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify table in Supabase Dashboard → Table Editor');
    console.log('2. Test at: https://aurora.tromso.ai/settings');
  }
}

runMigration().catch((error) => {
  console.error('');
  console.error('❌ Migration failed:', error.message);
  console.error('');
  console.error('Please run manually - see RUN_MIGRATION.md');
  process.exit(1);
});
