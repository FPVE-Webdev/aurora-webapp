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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔍 Checking Database Setup');
console.log('═'.repeat(60));
console.log('');

async function checkTable() {
  try {
    // Try to query the table directly with service role
    const { data, error, count } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: false });

    if (error) {
      console.error('❌ Error accessing table:', error.message);
      console.log('');
      console.log('This could mean:');
      console.log('1. Table does not exist yet');
      console.log('2. RLS policies are blocking access');
      console.log('');
      console.log('Please run the migration again or check Supabase Dashboard.');
      return false;
    }

    console.log('✅ Table "push_subscriptions" exists!');
    console.log('');
    console.log(`📊 Total subscriptions: ${count || 0}`);

    if (data && data.length > 0) {
      console.log('');
      data.forEach((sub, index) => {
        console.log(`Subscription #${index + 1}:`);
        console.log(`  Preference: ${sub.alert_preference}`);
        console.log(`  Active: ${sub.active ? '✅' : '❌'}`);
        console.log(`  Created: ${new Date(sub.created_at).toLocaleString('no-NO')}`);
        console.log('');
      });
    } else {
      console.log('');
      console.log('⚠️  No subscriptions found yet.');
      console.log('');
      console.log('Next step:');
      console.log('1. Go to: https://aurora.tromso.ai/settings');
      console.log('2. Click "Enable Alerts" button');
      console.log('3. Grant notification permission');
      console.log('4. Run this script again to verify');
    }

    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

checkTable();
