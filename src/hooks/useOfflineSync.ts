import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { getQueue, dequeue, queueCount } from '../lib/offlineQueue';

export function useOfflineSync(onSynced: (count: number) => void) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(queueCount());
  const [syncing, setSyncing] = useState(false);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  const flush = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;
    setSyncing(true);
    let synced = 0;
    for (const item of queue) {
      try {
        await api.createTransaction(item.data);
        dequeue(item.localId);
        synced++;
      } catch {
        // Si falla, detenemos — probablemente aún sin conexión
        break;
      }
    }
    setSyncing(false);
    setPendingCount(queueCount());
    if (synced > 0) onSyncedRef.current(synced);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flush();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flush]);

  // Intentar flush al montar (por si quedaron pendientes de sesión anterior)
  useEffect(() => {
    if (navigator.onLine && queueCount() > 0) flush();
  }, [flush]);

  const refreshCount = useCallback(() => setPendingCount(queueCount()), []);

  return { isOnline, pendingCount, refreshCount, syncing, flush };
}
