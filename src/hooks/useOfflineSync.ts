import { useEffect, useCallback, useState } from 'react';
import { fetchApi } from '../lib/api';
import { getPendingSales, markSyncing, removeSale, markFailed, getQueueCount } from '../services/offlineSales';

export function useOfflineSync(online: boolean) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!online || syncing) return;
    const pending = await getPendingSales();
    if (pending.length === 0) return;

    setSyncing(true);
    for (const sale of pending) {
      if (!sale.id) continue;
      try {
        await markSyncing(sale.id);
        await fetchApi('/sales', {
          method: 'POST',
          body: JSON.stringify(sale.body),
        });
        await removeSale(sale.id);
      } catch (err: unknown) {
        await markFailed(sale.id, err instanceof Error ? err.message : 'Erro ao sincronizar');
      }
    }
    setSyncing(false);
    setPendingCount(await getQueueCount());
  }, [online, syncing]);

  useEffect(() => {
    setPendingCount(0);
    getPendingSales().then(list => setPendingCount(list.length));
  }, []);

  useEffect(() => {
    if (online) {
      sync();
    }
  }, [online, sync]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (online) sync();
    }, 30000);
    return () => clearInterval(interval);
  }, [online, sync]);

  return { pendingCount, syncing, sync };
}
