#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim() : null;
};

const CRON_SECRET = getEnvVar('CRON_SECRET');
const PRODUCTION_URL = 'https://aurora.tromso.ai';

console.log('🧪 Testing Push Notification');
console.log('═'.repeat(60));
console.log('');

async function testPush() {
  try {
    console.log('📤 Sending test push notification...');
    console.log('   Target: All active subscriptions');
    console.log('   Endpoint: /api/push/send');
    console.log('');

    const response = await fetch(`${PRODUCTION_URL}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({
        title: '🌟 Test: Nordlys Alert',
        message: 'Dette er en test-notifikasjon fra Aurora Webapp! 🇳🇴',
        url: '/',
        alertPreference: 'strict',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Push failed:', response.status, error);
      return;
    }

    const result = await response.json();

    console.log('✅ Push notification sent!');
    console.log('');
    console.log('📊 Results:');
    console.log('   Sent: ' + result.sent);
    console.log('   Failed: ' + result.failed);
    console.log('   Total: ' + result.total);
    console.log('');

    if (result.sent > 0) {
      console.log('🎉 SUCCESS! Check your browser for the notification.');
      console.log('');
      console.log('Expected notification:');
      console.log('   Title: 🌟 Test: Nordlys Alert');
      console.log('   Message: Dette er en test-notifikasjon fra Aurora Webapp! 🇳🇴');
      console.log('');
      console.log('If you don\'t see it:');
      console.log('1. Check browser notification settings');
      console.log('2. Make sure browser is open');
      console.log('3. Check notification center (Mac/Windows)');
    } else {
      console.log('⚠️  No notifications sent. Check subscription preference.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPush();
