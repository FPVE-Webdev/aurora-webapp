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
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

console.log('🔍 Testing Supabase Connection');
console.log('═'.repeat(60));
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'MISSING');
console.log('Anon Key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');
console.log('');

async function testConnection() {
  // Test with service role (should bypass RLS)
  console.log('📡 Testing with SERVICE ROLE key...');
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error, count } = await supabaseService
      .from('push_subscriptions')
      .select('*', { count: 'exact' });

    if (error) {
      console.log('❌ Service role error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);
    } else {
      console.log('✅ Service role access: SUCCESS');
      console.log(`   Subscriptions found: ${count || 0}`);
      if (data && data.length > 0) {
        console.log('   Data:', JSON.stringify(data[0], null, 2).substring(0, 200));
      }
    }
  } catch (err) {
    console.log('❌ Service role exception:', err.message);
  }

  console.log('');

  // Test with anon key (should respect RLS)
  console.log('📡 Testing with ANON key...');
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error, count } = await supabaseAnon
      .from('push_subscriptions')
      .select('*', { count: 'exact' });

    if (error) {
      console.log('❌ Anon key error:', error.message);
    } else {
      console.log('✅ Anon key access: SUCCESS');
      console.log(`   Subscriptions found: ${count || 0}`);
    }
  } catch (err) {
    console.log('❌ Anon key exception:', err.message);
  }

  console.log('');
  console.log('═'.repeat(60));
}

testConnection();
