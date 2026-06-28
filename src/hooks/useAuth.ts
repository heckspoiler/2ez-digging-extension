import { useCallback, useEffect, useState } from 'react';

import { getSession, logout as authLogout, SESSION_STORAGE_KEY } from '../lib/auth';
import type { StoredSession } from '../lib/auth';

export function useAuth() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void getSession().then((current) => {
      if (mounted) {
        setSession(current);
        setLoading(false);
      }
    });

    // Keep the view in sync when login/logout happens (storage is the source of truth).
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area === 'local' && SESSION_STORAGE_KEY in changes) {
        setSession(
          (changes[SESSION_STORAGE_KEY].newValue as StoredSession | undefined) ?? null,
        );
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
  }, []);

  return { session, loading, logout };
}
