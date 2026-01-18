#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🧹 Cleaning Up Old Push Subscriptions');
console.log('═'.repeat(60));
console.log('');

async function cleanup() {
  // Get all subscriptions
  const { data: all, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching subscriptions:', error.message);
    return;
  }

  console.log(`📊 Found ${all.length} subscription(s)`);
  console.log('');

  // Delete inactive subscriptions
  const inactive = all.filter(sub => !sub.active);

  if (inactive.length === 0) {
    console.log('✅ No inactive subscriptions to delete');
    return;
  }

  console.log(`🗑️  Deleting ${inactive.length} inactive subscription(s)...`);
  console.log('');

  for (const sub of inactive) {
    console.log(`   Deleting: ${sub.id}`);
    console.log(`   Created: ${new Date(sub.created_at).toLocaleString()}`);
    console.log(`   Last Alert: ${sub.last_alert_sent_at ? new Date(sub.last_alert_sent_at).toLocaleString() : 'Never'}`);

    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('id', sub.id);

    if (deleteError) {
      console.log(`   ❌ Failed to delete: ${deleteError.message}`);
    } else {
      console.log(`   ✅ Deleted`);
    }
    console.log('');
  }

  console.log('═'.repeat(60));
  console.log('✅ Cleanup complete!');
  console.log('');

  // Show remaining active subscriptions
  const active = all.filter(sub => sub.active);
  console.log(`📊 Remaining active subscriptions: ${active.length}`);

  for (const sub of active) {
    console.log('');
    console.log(`   ID: ${sub.id}`);
    console.log(`   Preference: ${sub.alert_preference}`);
    console.log(`   Created: ${new Date(sub.created_at).toLocaleString()}`);
  }
}

cleanup();
