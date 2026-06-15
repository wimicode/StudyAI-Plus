'use client';
import { useEffect, useState } from 'react';
import { syncPendingScores } from '@/lib/db/sync';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      syncPendingScores().catch(console.error);
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}
