/**
 * Setup Script: Brevo Configuration
 * 
 * This script helps set up the Brevo configuration in Firestore.
 * Run this once to create the initial config document.
 * 
 * Usage:
 *   npx ts-node src/scripts/setupBrevoConfig.ts
 * 
 * Or compile and run:
 *   npm run build
 *   node lib/scripts/setupBrevoConfig.js
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
// Try to use application default credentials or service account
try {
  // Check if we're running in Firebase environment or locally
  if (process.env.FIREBASE_CONFIG) {
    // Running in Firebase Functions - use default credentials
    admin.initializeApp();
  } else {
    // Running locally - try to find service account key
    const serviceAccountPath = path.join(__dirname, '../../../serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Try application default credentials (if gcloud is configured)
      admin.initializeApp();
    }
  }
} catch (error: any) {
  // Already initialized or using default credentials
  if (error.code !== 'app/already-initialized') {
    console.warn('Firebase Admin initialization warning:', error.message);
  }
}

interface BrevoConfig {
  templates: {
    verification: number;
    passwordReset: number;
    welcome: number;
    subscriptionChange: number;
    generic: number;
  };
  contactLists: {
    marketing: number;
    tips: number;
    insights: number;
  };
  sender: {
    email: string;
    name: string;
  };
  updatedAt: admin.firestore.Timestamp;
}

async function setupBrevoConfig() {
  const db = admin.firestore();
  
  // Get template IDs from user (or use defaults for testing)
  // In production, you'll get these from your Brevo dashboard
  const config: BrevoConfig = {
    templates: {
      verification: parseInt(process.env.BREVO_TEMPLATE_VERIFICATION || '0'),
      passwordReset: parseInt(process.env.BREVO_TEMPLATE_PASSWORD_RESET || '0'),
      welcome: parseInt(process.env.BREVO_TEMPLATE_WELCOME || '0'),
      subscriptionChange: parseInt(process.env.BREVO_TEMPLATE_SUBSCRIPTION_CHANGE || '0'),
      generic: parseInt(process.env.BREVO_TEMPLATE_GENERIC || '0'),
    },
    contactLists: {
      marketing: parseInt(process.env.BREVO_LIST_MARKETING || '0'),
      tips: parseInt(process.env.BREVO_LIST_TIPS || '0'),
      insights: parseInt(process.env.BREVO_LIST_INSIGHTS || '0'),
    },
    sender: {
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@hungr.com',
      name: process.env.BREVO_SENDER_NAME || 'Hungr',
    },
    updatedAt: admin.firestore.Timestamp.now(),
  };

  // Validate that at least generic template is set
  if (config.templates.generic === 0) {
    console.error('ERROR: BREVO_TEMPLATE_GENERIC must be set (at minimum)');
    console.error('Set environment variables before running this script:');
    console.error('  export BREVO_TEMPLATE_GENERIC=123');
    console.error('  export BREVO_LIST_MARKETING=65');
    // ... etc
    process.exit(1);
  }

  // Save to Firestore
  try {
    await db.doc('brevo_config/templates').set(config);
    console.log('✅ Brevo configuration saved to Firestore!');
    console.log('\nConfiguration:');
    console.log(JSON.stringify(config, null, 2));
  } catch (error: any) {
    console.error('❌ Failed to save configuration:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupBrevoConfig()
  .then(() => {
    console.log('\n✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });

