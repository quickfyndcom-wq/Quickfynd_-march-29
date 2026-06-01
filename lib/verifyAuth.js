import { getAuth as getAdminAuth } from '@/lib/firebase-admin';

/**
 * Verify Firebase ID token and extract user information
 * @param {string} token - Firebase ID token from client
 * @returns {Promise<{userId: string, email: string} | null>} User info or null if invalid
 */
export async function verifyAuth(token) {
  try {
    if (!token) return null;

    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    return {
      userId: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}
