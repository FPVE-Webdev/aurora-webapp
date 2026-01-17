#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Push Notification Setup Checker');
console.log('═'.repeat(60));
console.log('');

// Load env
const envPath = path.join(__dirname, '../.env.local');
let envContent;

try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.error('❌ .env.local not found!');
  process.exit(1);
}

const getEnvVar = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : null;
};

// Check environment variables
console.log('📋 Environment Variables:');
console.log('');

const requiredVars = [
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'CRON_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

let allPresent = true;

for (const varName of requiredVars) {
  const value = getEnvVar(varName);
  if (value) {
    const display = value.length > 20 ? value.substring(0, 20) + '...' : value;

    // Check for quotes or whitespace
    if (value.startsWith('"') || value.endsWith('"')) {
      console.log(`⚠️  ${varName}: ${display} (WARNING: Has quotes!)`);
      allPresent = false;
    } else if (value !== value.trim()) {
      console.log(`⚠️  ${varName}: Has leading/trailing whitespace!`);
      allPresent = false;
    } else {
      console.log(`✅ ${varName}: ${display}`);
    }
  } else {
    console.log(`❌ ${varName}: MISSING`);
    allPresent = false;
  }
}

console.log('');

// Check files
console.log('📁 Required Files:');
console.log('');

const requiredFiles = [
  'public/sw.js',
  'public/manifest.json',
  'src/hooks/useServiceWorker.ts',
  'src/app/api/push/send/route.ts',
  'src/app/api/push/subscribe/route.ts',
  'src/app/api/push/unsubscribe/route.ts',
];

let allFilesPresent = true;

for (const filePath of requiredFiles) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${filePath}`);
  } else {
    console.log(`❌ ${filePath}`);
    allFilesPresent = false;
  }
}

console.log('');

// Database connection test
console.log('🔌 Testing Database Connection...');
console.log('');

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (supabaseUrl && supabaseServiceKey) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  (async () => {
    try {
      const { data, error, count } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact' });

      if (error) {
        console.log('❌ Database error:', error.message);
        if (error.code === '42P01') {
          console.log('   → Table does not exist. Run migration!');
        } else if (error.code === '42501') {
          console.log('   → Permission denied. Run GRANT_PERMISSIONS.sql!');
        }
      } else {
        console.log('✅ Database connection successful');
        console.log(`   Active subscriptions: ${count || 0}`);

        if (data && data.length > 0) {
          console.log('');
          console.log('📊 Subscription Details:');
          data.forEach((sub, i) => {
            console.log(`   ${i + 1}. Preference: ${sub.alert_preference}, Active: ${sub.active}`);
          });
        }
      }

      console.log('');
      console.log('═'.repeat(60));
      console.log('');

      if (allPresent && allFilesPresent && !error) {
        console.log('✅ ALL CHECKS PASSED! Push notifications are ready.');
        console.log('');
        console.log('Next steps:');
        console.log('1. Go to /settings in your browser');
        console.log('2. Enable alerts with "Strict" or "Eager" mode');
        console.log('3. Run: node scripts/test-push.js');
        console.log('4. Check browser console for Service Worker logs');
      } else {
        console.log('⚠️  SETUP INCOMPLETE');
        console.log('');
        console.log('Fix the issues above and run this script again.');
      }

    } catch (err) {
      console.log('❌ Unexpected error:', err.message);
    }
  })();
} else {
  console.log('❌ Cannot test database (missing credentials)');
}
