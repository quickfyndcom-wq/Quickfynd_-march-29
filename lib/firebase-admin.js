// lib/firebase-admin.js
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth as adminGetAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.join(process.cwd(), 'firebase-key.json');

let serviceAccount;
try {
  if (!fs.existsSync(serviceAccountPath)) {
    console.warn('⚠️ firebase-key.json is missing - Firebase features will not be available at runtime');
  } else {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Service account is missing required fields (project_id, private_key, or client_email)');
    }
  }
} catch (e) {
  console.error('❌ firebase-key.json parsing error:', e.message);
}

// Initialize Firebase Admin only if credentials exist
if (serviceAccount && !getApps().length) {
  console.log('🔥 Initializing Firebase Admin SDK...');
  try {
    // Ensure project id is visible to underlying Google auth libs BEFORE init
    if (!process.env.GOOGLE_CLOUD_PROJECT) {
      process.env.GOOGLE_CLOUD_PROJECT = serviceAccount.project_id;
    }
    if (!process.env.GCLOUD_PROJECT) {
      process.env.GCLOUD_PROJECT = serviceAccount.project_id;
    }
    if (!process.env.FIREBASE_CONFIG) {
      process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: serviceAccount.project_id });
    }
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin initialized successfully for project:', serviceAccount.project_id);
  } catch (e) {
    console.error('❌ Firebase Admin initialization failed:', e.message);
    if (process.env.NODE_ENV === 'development') {
      throw e;
    }
  }
} else if (getApps().length) {
  console.log('ℹ️  Firebase Admin already initialized');
} else {
  console.warn('⚠️  Firebase Admin not initialized - service account credentials not available');
}

// Safe getter that throws a clear error if admin is not initialized
export const getAuth = () => {
  try {
    return adminGetAuth();
  } catch (e) {
    throw new Error('Firebase Admin not initialized. Add firebase-key.json at project root.');
  }
};