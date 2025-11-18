/**
 * Media Ownership Audit Script
 * 
 * Purpose: Audit all media documents in Firestore to verify they have proper owner fields
 * before deploying security rule changes.
 * 
 * Prerequisites:
 * - Firebase Admin SDK credentials configured
 * - Option 1: Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 * - Option 2: Use 'gcloud auth application-default login' for local development
 * - Option 3: Provide service account key file path
 * 
 * Run: 
 *   # With application default credentials
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/audit-media-ownership.ts
 * 
 *   # Or with service account key
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json npx ts-node --compiler-options '{"module":"commonjs"}' scripts/audit-media-ownership.ts
 * 
 * Checks for: userId, ownerId, or uploadedBy fields on each media document
 * 
 * Note: This script uses Firebase Admin SDK to bypass security rules for auditing purposes.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Uses application default credentials or service account
if (!admin.apps.length) {
  try {
    // Try to initialize with application default credentials
    // This works if:
    // 1. GOOGLE_APPLICATION_CREDENTIALS env var is set to service account key path
    // 2. 'gcloud auth application-default login' has been run
    admin.initializeApp({
      projectId: 'hungr-firebase'
    });
    console.log('✅ Firebase Admin SDK initialized successfully\n');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    console.log('\n📋 To fix this, use one of the following methods:');
    console.log('1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable:');
    console.log('   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"');
    console.log('\n2. Use gcloud CLI (for local development):');
    console.log('   gcloud auth application-default login');
    console.log('\n3. Use Firebase CLI:');
    console.log('   firebase login:ci');
    throw new Error('Firebase Admin initialization failed. Please configure credentials.');
  }
}

const db = admin.firestore();

interface MediaDocument {
  id: string;
  userId?: string;
  ownerId?: string;
  uploadedBy?: string;
  fileName?: string;
  uploadedAt?: any;
}

interface AuditResult {
  totalDocuments: number;
  documentsWithUserId: number;
  documentsWithOwnerId: number;
  documentsWithUploadedBy: number;
  documentsWithNoOwner: number;
  missingOwnerDocs: string[];
  ownerFieldDistribution: {
    userId: number;
    ownerId: number;
    uploadedBy: number;
    none: number;
  };
}

async function auditMediaOwnership(): Promise<AuditResult> {
  console.log('🔍 Starting Media Ownership Audit...\n');

  const result: AuditResult = {
    totalDocuments: 0,
    documentsWithUserId: 0,
    documentsWithOwnerId: 0,
    documentsWithUploadedBy: 0,
    documentsWithNoOwner: 0,
    missingOwnerDocs: [],
    ownerFieldDistribution: {
      userId: 0,
      ownerId: 0,
      uploadedBy: 0,
      none: 0,
    },
  };

  try {
    // Query all media documents using Admin SDK (bypasses security rules)
    const mediaCollection = db.collection('media');
    const snapshot = await mediaCollection.get();

    console.log(`Found ${snapshot.size} total media documents\n`);
    result.totalDocuments = snapshot.size;

    // Analyze each document
    snapshot.forEach((doc) => {
      const data = doc.data() as MediaDocument;
      const docId = doc.id;

      let hasOwnerField = false;

      // Check for userId field
      if (data.userId) {
        result.documentsWithUserId++;
        result.ownerFieldDistribution.userId++;
        hasOwnerField = true;
      }

      // Check for ownerId field
      if (data.ownerId) {
        result.documentsWithOwnerId++;
        result.ownerFieldDistribution.ownerId++;
        hasOwnerField = true;
      }

      // Check for uploadedBy field (legacy)
      if (data.uploadedBy) {
        result.documentsWithUploadedBy++;
        result.ownerFieldDistribution.uploadedBy++;
        hasOwnerField = true;
      }

      // Document has NO owner field
      if (!hasOwnerField) {
        result.documentsWithNoOwner++;
        result.ownerFieldDistribution.none++;
        result.missingOwnerDocs.push(docId);
        console.warn(`⚠️  Missing owner field: ${docId} (fileName: ${data.fileName || 'unknown'})`);
      }
    });

    return result;
  } catch (error) {
    console.error('❌ Error during audit:', error);
    throw error;
  }
}

function printAuditReport(result: AuditResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('MEDIA OWNERSHIP AUDIT REPORT');
  console.log('='.repeat(60) + '\n');

  console.log(`Total Documents: ${result.totalDocuments}`);
  console.log(`Documents with userId: ${result.documentsWithUserId}`);
  console.log(`Documents with ownerId: ${result.documentsWithOwnerId}`);
  console.log(`Documents with uploadedBy: ${result.documentsWithUploadedBy}`);
  console.log(`Documents with NO owner field: ${result.documentsWithNoOwner}\n`);

  console.log('Owner Field Distribution:');
  console.log(`  - userId only: ${result.ownerFieldDistribution.userId}`);
  console.log(`  - ownerId only: ${result.ownerFieldDistribution.ownerId}`);
  console.log(`  - uploadedBy only: ${result.ownerFieldDistribution.uploadedBy}`);
  console.log(`  - No owner field: ${result.ownerFieldDistribution.none}\n`);

  if (result.documentsWithNoOwner > 0) {
    console.warn('⚠️  WARNING: Some documents are missing owner fields!');
    console.warn('These documents will NOT be accessible after security rules are updated.\n');
    console.warn('Missing Owner Document IDs:');
    result.missingOwnerDocs.forEach((id) => console.warn(`  - ${id}`));
    console.warn('\n⚠️  RECOMMENDATION: Run migration to add userId field before deploying security rules.\n');
  } else {
    console.log('✅ SUCCESS: All documents have at least one owner field.');
    console.log('✅ Safe to proceed with security rule deployment.\n');
  }

  // Security readiness assessment
  console.log('Security Readiness:');
  if (result.documentsWithNoOwner === 0) {
    console.log('✅ READY: All documents can be secured with new rules');
  } else {
    console.log('❌ NOT READY: Migration needed before deploying security rules');
    console.log(`   ${result.documentsWithNoOwner} documents need userId field added`);
  }

  console.log('\n' + '='.repeat(60));
}

// Run the audit
auditMediaOwnership()
  .then((result) => {
    printAuditReport(result);
    process.exit(result.documentsWithNoOwner > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  });








