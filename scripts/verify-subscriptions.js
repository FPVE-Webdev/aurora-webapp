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

console.log('🔍 Verifying Push Subscriptions');
console.log('═'.repeat(60));
console.log('');

async function verifySubscriptions() {
  try {
    // Fetch all active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching subscriptions:', error.message);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️  No subscriptions found in database');
      console.log('');
      console.log('Expected: At least 1 subscription (yours)');
      console.log('');
      console.log('Troubleshooting:');
      console.log('1. Make sure you clicked "Enable Alerts" in /settings');
      console.log('2. Check browser console for errors');
      console.log('3. Verify notification permission is "granted"');
      return;
    }

    console.log(`✅ Found ${subscriptions.length} subscription(s)`);
    console.log('');

    subscriptions.forEach((sub, index) => {
      console.log(`Subscription #${index + 1}:`);
      console.log('─'.repeat(60));
      console.log(`  ID: ${sub.id}`);
      console.log(`  Created: ${new Date(sub.created_at).toLocaleString('no-NO')}`);
      console.log(`  Alert Preference: ${sub.alert_preference}`);
      console.log(`  Active: ${sub.active ? '✅ Yes' : '❌ No'}`);
      console.log(`  Last Alert: ${sub.last_alert_sent_at ? new Date(sub.last_alert_sent_at).toLocaleString('no-NO') : 'Never'}`);
      console.log(`  Location: ${sub.latitude && sub.longitude ? `${sub.latitude.toFixed(2)}, ${sub.longitude.toFixed(2)}` : 'Not provided'}`);
      console.log(`  Browser: ${sub.user_agent || 'Unknown'}`);
      console.log('');
    });

    // Count by preference
    const byPreference = subscriptions.reduce((acc, sub) => {
      acc[sub.alert_preference] = (acc[sub.alert_preference] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Statistics:');
    console.log('─'.repeat(60));
    console.log(`  Total: ${subscriptions.length}`);
    console.log(`  Active: ${subscriptions.filter(s => s.active).length}`);
    console.log(`  Strict: ${byPreference.strict || 0}`);
    console.log(`  Eager: ${byPreference.eager || 0}`);
    console.log(`  Off: ${byPreference.off || 0}`);
    console.log('');

    console.log('✅ Web Push is ready!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Wait for aurora activity (Kp ≥ 3 or Kp ≥ 5)');
    console.log('2. Cron job runs every 15 minutes');
    console.log('3. You will receive push notification automatically');
    console.log('');
    console.log('Or test manually with:');
    console.log('  node scripts/test-push.js');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

verifySubscriptions();
