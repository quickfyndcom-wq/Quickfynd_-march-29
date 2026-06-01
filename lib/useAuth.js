import { useCallback, useEffect, useState } from 'react';
import { auth } from './firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncFromCurrentUser = () => {
      setUser(auth.currentUser || null);
      setLoading(false);
    };

    // Seed state immediately so other tabs pick up an existing session quickly.
    syncFromCurrentUser();

    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    const handleFocus = () => syncFromCurrentUser();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncFromCurrentUser();
    };
    const handleStorage = (event) => {
      if (!event?.key || event.key.includes('firebase:authUser:')) {
        syncFromCurrentUser();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('storage', handleStorage);

    // Run one more pass after listeners are attached.
    syncFromCurrentUser();

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const getToken = useCallback(async (forceRefresh = false) => {
    // Get current user directly from auth instead of state
    const currentUser = auth.currentUser;
    if (!currentUser) {
      // No user is logged in; this is normal for guests.
      return null;
    }
    try {
      const token = await currentUser.getIdToken(forceRefresh);
      return token;
    } catch (error) {
      console.error('[useAuth] Error getting token:', error);
      // Try to refresh the token
      try {
        const token = await currentUser.getIdToken(true);
        return token;
      } catch (retryError) {
        console.error('[useAuth] Error refreshing token:', retryError);
        return null;
      }
    }
  }, []);

  return { user, loading, getToken };
}
