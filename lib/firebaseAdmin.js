import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.join(process.cwd(), 'firebase-key.json');

if (!admin.apps.length && fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    if (serviceAccount?.project_id && serviceAccount?.private_key && serviceAccount?.client_email) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.warn('⚠️ Firebase Admin credentials are incomplete in firebase-key.json');
    }
  } catch (error) {
    console.warn('⚠️ Failed to parse firebase-key.json for firebaseAdmin helper:', error.message);
  }
}

export default admin;
