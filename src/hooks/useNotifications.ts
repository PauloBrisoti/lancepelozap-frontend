import { useCallback, useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import type { Notification } from '../types/api';

/**
 * Hook de notificações do sino (fetch + leitura otimista).
 * Mantém o estado de dados fora do componente de apresentação.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchApi<Notification[]>('/notifications');
      if (Array.isArray(data)) setNotifications(data);
    } catch {
      // silencioso: o sino não deve quebrar a página
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    await fetchApi('/notifications/read-all', { method: 'PUT' });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  return { notifications, unread, load, markRead, markAllRead };
}
