#!/usr/bin/env node

const webpush = require('web-push');

console.log('\n🔑 Generating VAPID Keys for Web Push...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public Key (NEXT_PUBLIC_VAPID_PUBLIC_KEY):');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key (VAPID_PRIVATE_KEY):');
console.log(vapidKeys.privateKey);
console.log('\n📝 Add these to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
console.log('\n✅ Done!\n');
